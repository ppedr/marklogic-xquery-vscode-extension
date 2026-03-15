import * as vscode from 'vscode';
import { XQueryFunction, XQueryFunctionSignature } from './data/xqueryBuiltins';
import { xqueryBuiltins } from './data/xqueryBuiltins';
import { marklogicBuiltins } from './data/marklogicBuiltins';

// ── Lookup index: "ns:localName" → XQueryFunction ─────────────────────────

const BUILTIN_INDEX = new Map<string, XQueryFunction>();
for (const fn of [...xqueryBuiltins, ...marklogicBuiltins]) {
  BUILTIN_INDEX.set(`${fn.namespace}:${fn.localName}`, fn);
}

// ── Walk backwards to find enclosing call ─────────────────────────────────

interface CallSite {
  /** Qualified function name, e.g. "xdmp:log" */
  name: string;
  /** 0-based index of the active parameter */
  activeParameter: number;
}

/**
 * Scans backwards from `offset` through `text` looking for the innermost
 * open parenthesis that belongs to a function call.  Counts commas at that
 * nesting level to determine the active parameter index.
 *
 * Respects:
 *  - nested parentheses ( )
 *  - string literals  " … "  and  ' … '  (with doubled-delimiter escapes)
 *  - XQuery block comments  (: … :)
 */
function findCallSite(text: string, offset: number): CallSite | null {
  let depth        = 0;   // net extra closing parens seen while walking left
  let activeParam  = 0;
  let inString     = false;
  let stringDelim  = '';

  let i = offset - 1;

  while (i >= 0) {
    const ch = text[i];

    // ── String literal handling (walk past strings going right-to-left) ──
    if (inString) {
      if (ch === stringDelim) {
        // Doubled-delimiter escape: "" or '' → still inside string
        if (i > 0 && text[i - 1] === stringDelim) {
          i -= 2;
          continue;
        }
        inString = false;
      }
      i--;
      continue;
    }

    // Entering a string (going backwards means we hit the closing delimiter)
    if (ch === '"' || ch === "'") {
      inString    = true;
      stringDelim = ch;
      i--;
      continue;
    }

    // ── XQuery block comment  :)  …  (: ──────────────────────────────────
    // When walking backwards we see :) first, then (: to close.
    if (ch === ')' && i > 0 && text[i - 1] === ':') {
      // skip to matching (:
      i -= 2;
      let commentDepth = 1;
      while (i >= 0 && commentDepth > 0) {
        if (text[i] === ')' && i > 0 && text[i - 1] === ':') {
          commentDepth++;
          i -= 2;
        } else if (text[i] === ':' && i > 0 && text[i - 1] === '(') {
          commentDepth--;
          i -= 2;
        } else {
          i--;
        }
      }
      continue;
    }

    // ── Parentheses ───────────────────────────────────────────────────────
    if (ch === ')') {
      depth++;
      i--;
      continue;
    }

    if (ch === '(') {
      if (depth > 0) {
        // This closes a nested call we already counted
        depth--;
        i--;
        continue;
      }

      // This is the opening paren of the call we care about.
      // Walk backwards past whitespace to find the function name.
      let nameEnd = i - 1;
      while (nameEnd >= 0 && /\s/.test(text[nameEnd])) { nameEnd--; }
      if (nameEnd < 0) { return null; }

      // Collect local name  (word chars and hyphens)
      let nameStart = nameEnd;
      while (nameStart > 0 && /[\w\-]/.test(text[nameStart - 1])) { nameStart--; }
      const localName = text.slice(nameStart, nameEnd + 1);
      if (!localName) { return null; }

      // Check for a namespace prefix  prefix:localName
      let qualifiedName = localName;
      if (nameStart > 1 && text[nameStart - 1] === ':' && text[nameStart - 2] !== ':') {
        let nsEnd   = nameStart - 2;
        let nsStart = nsEnd;
        while (nsStart > 0 && /[\w\-]/.test(text[nsStart - 1])) { nsStart--; }
        const ns = text.slice(nsStart, nsEnd + 1);
        if (ns) {
          qualifiedName = `${ns}:${localName}`;
        }
      }

      return { name: qualifiedName, activeParameter: activeParam };
    }

    // ── Comma at current depth (depth === 0 means we are at target level) ─
    if (ch === ',' && depth === 0) {
      activeParam++;
    }

    i--;
  }

  return null;
}

// ── Signature label builder ───────────────────────────────────────────────

interface LabelledSignature {
  label: string;
  /** [start, end] byte offsets of each parameter within `label` */
  paramRanges: [number, number][];
}

function buildLabel(fn: XQueryFunction, sig: XQueryFunctionSignature): LabelledSignature {
  const paramStrings = sig.params.map(p => {
    const occ = p.occurrence ?? (p.optional ? '?' : '');
    return `$${p.name} as ${p.type}${occ}`;
  });

  const head  = `${fn.namespace}:${fn.localName}(`;
  const tail  = `) as ${sig.returnType}`;
  const paramRanges: [number, number][] = [];

  let label = head;
  paramStrings.forEach((ps, idx) => {
    const start = label.length;
    label += ps;
    paramRanges.push([start, label.length]);
    if (idx < paramStrings.length - 1) { label += ', '; }
  });
  label += tail;

  return { label, paramRanges };
}

// ── Provider ──────────────────────────────────────────────────────────────

export class XQuerySignatureHelpProvider implements vscode.SignatureHelpProvider {
  provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.SignatureHelpContext
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    const text   = document.getText();
    const offset = document.offsetAt(position);

    const callSite = findCallSite(text, offset);
    if (!callSite) { return null; }

    const fn = BUILTIN_INDEX.get(callSite.name);
    if (!fn) { return null; }

    const help = new vscode.SignatureHelp();

    help.signatures = fn.signatures.map(sig => {
      const { label, paramRanges } = buildLabel(fn, sig);

      const si = new vscode.SignatureInformation(label);

      // Summary as the top-level documentation
      si.documentation = new vscode.MarkdownString(fn.summary);

      si.parameters = sig.params.map((p, idx) => {
        const occ      = p.occurrence ?? (p.optional ? '?' : '');
        const optNote  = p.optional ? ' *(optional)*' : '';
        const doc      = new vscode.MarkdownString(
          `\`$${p.name}\` — \`${p.type}${occ}\`${optNote}`
        );
        // Use the pre-computed substring range so VSCode highlights it
        return new vscode.ParameterInformation(paramRanges[idx], doc);
      });

      return si;
    });

    help.activeSignature  = 0;
    help.activeParameter  = Math.min(
      callSite.activeParameter,
      fn.signatures[0].params.length - 1
    );
    // Clamp to 0 for zero-param functions
    if (fn.signatures[0].params.length === 0) {
      help.activeParameter = 0;
    }

    return help;
  }
}
