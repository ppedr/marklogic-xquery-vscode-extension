import * as vscode from 'vscode';
import { XQueryFunction } from './data/xqueryBuiltins';
import { xqueryBuiltins } from './data/xqueryBuiltins';
import { marklogicBuiltins } from './data/marklogicBuiltins';

// ── Lookup index: "ns:localName" → XQueryFunction ─────────────────────────

const BUILTIN_INDEX = new Map<string, XQueryFunction>();
for (const fn of [...xqueryBuiltins, ...marklogicBuiltins]) {
  BUILTIN_INDEX.set(`${fn.namespace}:${fn.localName}`, fn);
}

// ── Regex for local declare function in the same file ─────────────────────
// Captures: (1) full qualified name  (2) raw param list  (3) return type (optional)
const LOCAL_FN_DECL =
  /declare\s+(?:%[\w:]+\s+)*(?:private\s+)?function\s+([\w\-]+(?::[\w\-]+)?)\s*\(([^)]*)\)\s*(?:as\s+([\w\-:()* ?+]+))?/g;

// ── Markdown builder ──────────────────────────────────────────────────────

function buildHoverMarkdown(fn: XQueryFunction): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  md.isTrusted = true;

  // Heading
  md.appendMarkdown(`### ${fn.namespace}:${fn.localName}\n\n`);

  // xquery code block — full signature
  for (const sig of fn.signatures) {
    const paramLines = sig.params.map(p => {
      const occ = p.occurrence ?? (p.optional ? '?' : '');
      return `  $${p.name.padEnd(10)} as ${p.type}${occ}`;
    });
    const sigText = paramLines.length > 0
      ? `${fn.namespace}:${fn.localName}(\n${paramLines.join(',\n')}\n) as ${sig.returnType}`
      : `${fn.namespace}:${fn.localName}() as ${sig.returnType}`;
    md.appendCodeblock(sigText, 'xquery');

    // Description paragraph
    if (sig.description) {
      md.appendMarkdown(`\n${sig.description}\n`);
    }

    // Parameters section
    if (sig.params.length > 0) {
      md.appendMarkdown('\n**Parameters**\n\n');
      for (const p of sig.params) {
        const occ     = p.occurrence ?? '';
        const optNote = p.optional ? ' *(optional)*' : '';
        md.appendMarkdown(`- \`$${p.name}\` — \`${p.type}${occ}\`${optNote}\n`);
      }
    }

    // Returns line
    md.appendMarkdown(`\n**Returns** \`${sig.returnType}\`\n`);
  }

  // Available since
  if (fn.since) {
    md.appendMarkdown(`\n*Available since MarkLogic ${fn.since}*\n`);
  }

  return md;
}

function buildLocalFnMarkdown(qualifiedName: string, rawParams: string, returnType: string | undefined): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  md.isTrusted = true;

  md.appendMarkdown(`### ${qualifiedName}\n\n`);

  const params = rawParams.trim()
    ? rawParams.split(',').map(p => `  ${p.trim()}`).join(',\n')
    : '';
  const ret = returnType ? ` as ${returnType.trim()}` : '';
  const sigText = params
    ? `${qualifiedName}(\n${params}\n)${ret}`
    : `${qualifiedName}()${ret}`;
  md.appendCodeblock(sigText, 'xquery');

  md.appendMarkdown('\n*Local function declaration*\n');
  return md;
}

// ── Word-range extraction ─────────────────────────────────────────────────

/**
 * Expands the cursor position to cover a "prefix:localName" token,
 * reading left past the colon and prefix, and right through the local name.
 * Returns null if the cursor is not on a qualified name.
 */
function getQualifiedNameRange(
  document: vscode.TextDocument,
  position: vscode.Position
): { range: vscode.Range; ns: string; localName: string } | null {
  const line  = document.lineAt(position.line).text;
  const col   = position.character;

  // Determine the extent of the identifier portion under cursor
  const nameChar = /[\w\-]/;

  let start = col;
  while (start > 0 && nameChar.test(line[start - 1])) { start--; }

  let end = col;
  while (end < line.length && nameChar.test(line[end])) { end++; }

  // Must have a colon either immediately before `start` or within [start,end)
  // Case A: cursor is on the local part — check for colon before start
  if (start > 0 && line[start - 1] === ':' && start >= 2 && line[start - 2] !== ':') {
    // Find the beginning of the namespace prefix
    let nsStart = start - 2; // skip the colon
    while (nsStart > 0 && nameChar.test(line[nsStart - 1])) { nsStart--; }
    const ns        = line.slice(nsStart, start - 1);
    const localName = line.slice(start, end);
    if (!ns || !localName) { return null; }
    const range = new vscode.Range(position.line, nsStart, position.line, end);
    return { range, ns, localName };
  }

  // Case B: cursor is on the prefix part — check for colon after `end`
  if (end < line.length && line[end] === ':' && end + 1 < line.length && line[end + 1] !== ':') {
    const ns    = line.slice(start, end);
    let lnEnd   = end + 1;
    while (lnEnd < line.length && nameChar.test(line[lnEnd])) { lnEnd++; }
    const localName = line.slice(end + 1, lnEnd);
    if (!ns || !localName) { return null; }
    const range = new vscode.Range(position.line, start, position.line, lnEnd);
    return { range, ns, localName };
  }

  return null;
}

// ── Provider ──────────────────────────────────────────────────────────────

export class XQueryHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {

    // 1. Try to resolve a namespace:localName under the cursor
    const qualified = getQualifiedNameRange(document, position);
    if (qualified) {
      const key = `${qualified.ns}:${qualified.localName}`;
      const fn  = BUILTIN_INDEX.get(key);
      if (fn) {
        return new vscode.Hover(buildHoverMarkdown(fn), qualified.range);
      }
    }

    // 2. Fall back: check if cursor word matches a local declare function name
    const wordRange = document.getWordRangeAtPosition(position, /[\w\-]+(?::[\w\-]+)?/);
    if (!wordRange) { return null; }
    const word = document.getText(wordRange);

    const text = document.getText();
    LOCAL_FN_DECL.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = LOCAL_FN_DECL.exec(text)) !== null) {
      if (m[1] === word) {
        return new vscode.Hover(
          buildLocalFnMarkdown(m[1], m[2], m[3]),
          wordRange
        );
      }
    }

    return null;
  }
}
