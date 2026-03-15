import * as vscode from 'vscode';
import { XQueryFunction } from './data/xqueryBuiltins';
import { xqueryBuiltins } from './data/xqueryBuiltins';
import { marklogicBuiltins } from './data/marklogicBuiltins';

// All known functions indexed by namespace prefix
const ALL_FUNCTIONS: XQueryFunction[] = [...xqueryBuiltins, ...marklogicBuiltins];

const FUNCTIONS_BY_NS = new Map<string, XQueryFunction[]>();
for (const fn of ALL_FUNCTIONS) {
  const list = FUNCTIONS_BY_NS.get(fn.namespace) ?? [];
  list.push(fn);
  FUNCTIONS_BY_NS.set(fn.namespace, list);
}

// ── Namespace prefixes offered at expression start ────────────────────────

const NAMESPACE_PREFIXES: { prefix: string; detail: string }[] = [
  { prefix: 'xdmp', detail: 'MarkLogic xdmp namespace' },
  { prefix: 'cts',  detail: 'MarkLogic cts namespace'  },
  { prefix: 'fn',   detail: 'W3C fn namespace'          },
  { prefix: 'xs',   detail: 'W3C xs namespace'          },
  { prefix: 'map',  detail: 'MarkLogic map namespace'   },
  { prefix: 'json', detail: 'MarkLogic json namespace'  },
  { prefix: 'sem',  detail: 'MarkLogic sem namespace'   },
  { prefix: 'math', detail: 'W3C math namespace'        },
  { prefix: 'array',detail: 'W3C array namespace'       },
];

// ── XQuery keywords ───────────────────────────────────────────────────────

const CONTROL_KEYWORDS = [
  'for', 'let', 'where', 'order by', 'return',
  'if', 'then', 'else',
  'typeswitch', 'case', 'default',
  'try', 'catch',
  'switch',
  'satisfies', 'every', 'some',
  'count', 'group by',
];

const OTHER_KEYWORDS = [
  'declare', 'module', 'namespace', 'import', 'schema', 'at',
  'function', 'variable', 'option', 'external',
  'as', 'in', 'is', 'instance of', 'treat as', 'cast as', 'castable as',
  'ascending', 'descending', 'collation', 'stable',
  'validate', 'preserve', 'strip', 'encoding',
  'union', 'intersect', 'except',
  'div', 'idiv', 'mod',
  'eq', 'ne', 'lt', 'le', 'gt', 'ge',
  'and', 'or',
];

const MARKLOGIC_KEYWORDS = [
  'private', 'array-node', 'boolean-node', 'number-node', 'null-node', 'object-node',
];

// ── Built-in types ────────────────────────────────────────────────────────

const BUILTIN_TYPES = [
  'xs:string', 'xs:integer', 'xs:decimal', 'xs:double', 'xs:float',
  'xs:boolean', 'xs:date', 'xs:dateTime', 'xs:time', 'xs:duration',
  'xs:anyURI', 'xs:QName', 'xs:long', 'xs:int', 'xs:short', 'xs:byte',
  'xs:unsignedLong', 'xs:unsignedInt', 'xs:normalizedString', 'xs:token',
  'item()', 'node()', 'element()', 'attribute()', 'text()',
  'document-node()', 'comment()', 'processing-instruction()',
  'empty-sequence()', 'function(*)', 'map(*)', 'array(*)',
];

// ── Common MarkLogic module URIs ──────────────────────────────────────────

const ML_MODULE_URIS = [
  'http://marklogic.com/appservices/search',
  'http://marklogic.com/xdmp/json',
  'http://marklogic.com/semantics',
  'http://marklogic.com/xdmp/alert',
  'http://marklogic.com/cpf/pipelines',
  'http://marklogic.com/xdmp/security',
  'http://marklogic.com/xdmp/admin',
  'http://marklogic.com/temporal',
];

// ── Helpers ───────────────────────────────────────────────────────────────

function buildSnippet(fn: XQueryFunction): string {
  const sig = fn.signatures[0];
  if (!sig || sig.params.length === 0) {
    return `${fn.localName}()`;
  }
  const required = sig.params.filter(p => !p.optional && p.name !== '...');
  if (required.length === 0) {
    return `${fn.localName}($0)`;
  }
  const args = required
    .map((p, i) => `\${${i + 1}:$${p.name}}`)
    .join(', ');
  return `${fn.localName}(${args})$0`;
}

function buildDetail(fn: XQueryFunction): string {
  const sig = fn.signatures[0];
  if (!sig) { return fn.summary; }
  const params = sig.params
    .map(p => {
      const occ = p.occurrence ?? '';
      const opt = p.optional ? '?' : '';
      return `$${p.name} as ${p.type}${occ || opt}`;
    })
    .join(', ');
  return `${fn.namespace}:${fn.localName}(${params}) as ${sig.returnType}`;
}

function buildDocs(fn: XQueryFunction): vscode.MarkdownString {
  const sig = fn.signatures[0];
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`### ${fn.namespace}:${fn.localName}\n\n`);
  if (sig) {
    const params = sig.params
      .map(p => {
        const occ = p.occurrence ?? '';
        return `  $${p.name} as ${p.type}${occ}`;
      })
      .join(',\n');
    md.appendCodeblock(
      `${fn.namespace}:${fn.localName}(\n${params}\n) as ${sig.returnType}`,
      'xquery'
    );
    if (sig.description) {
      md.appendMarkdown(`\n${sig.description}\n`);
    }
    if (sig.params.some(p => p.optional)) {
      md.appendMarkdown('\n**Parameters**\n');
      for (const p of sig.params) {
        const optLabel = p.optional ? ' *(optional)*' : '';
        md.appendMarkdown(`- \`$${p.name}\` — \`${p.type}${p.occurrence ?? ''}\`${optLabel}\n`);
      }
    }
  }
  if (fn.since) {
    md.appendMarkdown(`\n*Available since MarkLogic ${fn.since}*`);
  }
  return md;
}

function makeFunctionItem(fn: XQueryFunction): vscode.CompletionItem {
  const item = new vscode.CompletionItem(fn.localName, vscode.CompletionItemKind.Function);
  item.detail = buildDetail(fn);
  item.documentation = buildDocs(fn);
  item.insertText = new vscode.SnippetString(buildSnippet(fn));
  item.sortText = fn.localName;
  return item;
}

// ── Variable scanner ──────────────────────────────────────────────────────

const VAR_PATTERN = /(?:declare\s+(?:%[\w:]+\s+)*variable\s+|(?:let|for)\s+)\$([a-zA-Z_][\w\-]*(?::[a-zA-Z_][\w\-]*)?)/g;

function scanVariables(document: vscode.TextDocument, upToOffset: number): vscode.CompletionItem[] {
  const text = document.getText().slice(0, upToOffset);
  const seen = new Set<string>();
  const items: vscode.CompletionItem[] = [];
  VAR_PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = VAR_PATTERN.exec(text)) !== null) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      const item = new vscode.CompletionItem('$' + name, vscode.CompletionItemKind.Variable);
      item.insertText = name;   // trigger char '$' already typed
      item.detail = 'variable';
      item.sortText = name;
      items.push(item);
    }
  }
  return items;
}

// ── Prefix completions (namespace prefix list, no trigger) ────────────────

function makePrefixItems(): vscode.CompletionItem[] {
  return NAMESPACE_PREFIXES.map(({ prefix, detail }) => {
    const item = new vscode.CompletionItem(prefix + ':', vscode.CompletionItemKind.Module);
    item.detail = detail;
    item.sortText = prefix;
    item.commitCharacters = [];
    return item;
  });
}

// ── Keyword completions ───────────────────────────────────────────────────

function makeKeywordItems(): vscode.CompletionItem[] {
  const items: vscode.CompletionItem[] = [];
  for (const kw of CONTROL_KEYWORDS) {
    const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
    item.detail = 'keyword (control)';
    item.sortText = '~' + kw; // push below functions/types
    items.push(item);
  }
  for (const kw of OTHER_KEYWORDS) {
    const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
    item.detail = 'keyword';
    item.sortText = '~' + kw;
    items.push(item);
  }
  for (const kw of MARKLOGIC_KEYWORDS) {
    const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
    item.detail = 'keyword (MarkLogic)';
    item.sortText = '~' + kw;
    items.push(item);
  }
  return items;
}

// ── Type completions (after "as" keyword) ────────────────────────────────

function makeTypeItems(): vscode.CompletionItem[] {
  return BUILTIN_TYPES.map(t => {
    const item = new vscode.CompletionItem(t, vscode.CompletionItemKind.TypeParameter);
    item.detail = 'type';
    item.sortText = t;
    return item;
  });
}

// ── Module URI completions (after "import module namespace pfx =") ────────

function makeModuleUriItems(): vscode.CompletionItem[] {
  return ML_MODULE_URIS.map(uri => {
    const item = new vscode.CompletionItem(`"${uri}"`, vscode.CompletionItemKind.Reference);
    item.insertText = `"${uri}"`;
    item.detail = 'MarkLogic module URI';
    item.sortText = uri;
    return item;
  });
}

// ── Context detection helpers ─────────────────────────────────────────────

function getTextBeforeCursor(document: vscode.TextDocument, position: vscode.Position): string {
  const lineText = document.lineAt(position.line).text.slice(0, position.character);
  return lineText;
}

function getFullTextBeforeCursor(document: vscode.TextDocument, position: vscode.Position): string {
  return document.getText(new vscode.Range(new vscode.Position(0, 0), position));
}

/**
 * If the cursor is immediately after "someprefix:", return "someprefix".
 * Excludes "::" (axis) and ":=" (assignment).
 */
function getNamespacePrefix(linePrefix: string): string | null {
  const m = /\b([a-zA-Z_][\w\-]*):\s*$/.exec(linePrefix);
  if (!m) { return null; }
  // Exclude axis (child:: etc.) and assignment (:=)
  if (linePrefix.endsWith('::') || linePrefix.endsWith(':=')) { return null; }
  return m[1];
}

/** True when cursor follows the "as" keyword (type annotation context). */
function isAfterAsKeyword(linePrefix: string): boolean {
  return /\bas\s+[\w(]*$/.test(linePrefix);
}

/** True when line matches an import module statement awaiting a URI. */
function isImportModuleUri(fullTextBefore: string): boolean {
  return /import\s+module\s+namespace\s+[\w\-]+\s*=\s*$/.test(fullTextBefore.trimEnd());
}

// ── Provider ─────────────────────────────────────────────────────────────

export class XQueryCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.CompletionItem[] {
    const linePrefix    = getTextBeforeCursor(document, position);
    const fullBefore    = getFullTextBeforeCursor(document, position);
    const offset        = document.offsetAt(position);
    const triggerChar   = context.triggerCharacter;

    // 1. Namespace-triggered: "xdmp:" → show all xdmp functions
    if (triggerChar === ':' || (triggerChar === undefined && linePrefix.endsWith(':'))) {
      const ns = getNamespacePrefix(linePrefix);
      if (ns) {
        const fns = FUNCTIONS_BY_NS.get(ns);
        if (fns) {
          return fns.map(makeFunctionItem);
        }
        // Unknown namespace — return nothing for this path
        return [];
      }
    }

    // 2. Variable trigger: "$" → scan document for declared variables
    if (triggerChar === '$') {
      return scanVariables(document, offset);
    }

    // 3. Annotation trigger: "%" → offer common annotation names
    if (triggerChar === '%') {
      return ['private', 'public', 'updating', 'sequential'].map(name => {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Keyword);
        item.detail = 'annotation';
        return item;
      });
    }

    // 4. Import module URI context
    if (isImportModuleUri(fullBefore)) {
      return makeModuleUriItems();
    }

    // 5. After "as" keyword — offer types
    if (isAfterAsKeyword(linePrefix)) {
      return makeTypeItems();
    }

    // 6. Default: namespace prefixes + keywords (expression/prolog context)
    return [
      ...makePrefixItems(),
      ...makeKeywordItems(),
    ];
  }
}
