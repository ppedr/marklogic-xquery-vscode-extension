import * as vscode from 'vscode';

// Known deprecated MarkLogic functions: key = function name, value = [since version, replacement or null]
const DEPRECATED_ML_FUNCTIONS: Record<string, [string, string | null]> = {
  'xdmp:document-filter': ['9.0', 'cts:tokenize'],
  'xdmp:get-request-field': ['9.0', null],
};

const VALID_XQUERY_VERSIONS = new Set(['1.0', '1.0-ml', '3.0', '3.1']);

// W3C fn: standard function names — used by checkFnNamespaceAssumed (A4)
const FN_BUILTIN_NAMES = new Set([
  'abs', 'avg', 'base-uri', 'boolean', 'ceiling', 'codepoint-equal',
  'codepoints-to-string', 'collection', 'compare', 'concat', 'contains',
  'count', 'current-date', 'current-dateTime', 'current-time', 'data',
  'day-from-date', 'day-from-dateTime', 'days-from-duration', 'deep-equal',
  'default-collation', 'distinct-values', 'doc', 'doc-available', 'document-uri',
  'empty', 'encode-for-uri', 'ends-with', 'error', 'escape-html-uri',
  'exactly-one', 'exists', 'false', 'floor', 'format-date', 'format-dateTime',
  'format-number', 'format-time', 'hours-from-dateTime', 'hours-from-duration',
  'hours-from-time', 'id', 'idref', 'implicit-timezone', 'in-scope-prefixes',
  'index-of', 'insert-before', 'iri-to-uri', 'lang', 'last', 'local-name',
  'local-name-from-QName', 'lower-case', 'matches', 'max', 'min',
  'minutes-from-dateTime', 'minutes-from-duration', 'minutes-from-time',
  'month-from-date', 'month-from-dateTime', 'months-from-duration',
  'name', 'namespace-uri', 'namespace-uri-for-prefix', 'namespace-uri-from-QName',
  'nilled', 'node-name', 'normalize-space', 'normalize-unicode', 'not', 'number',
  'one-or-more', 'position', 'prefix-from-QName', 'QName', 'remove', 'replace',
  'resolve-QName', 'resolve-uri', 'reverse', 'root', 'round', 'round-half-to-even',
  'seconds-from-dateTime', 'seconds-from-duration', 'seconds-from-time',
  'starts-with', 'static-base-uri', 'string', 'string-join', 'string-length',
  'string-to-codepoints', 'subsequence', 'substring', 'substring-after',
  'substring-before', 'sum', 'tail', 'timezone-from-date', 'timezone-from-dateTime',
  'timezone-from-time', 'tokenize', 'trace', 'translate', 'true', 'unordered',
  'upper-case', 'uri-collection', 'year-from-date', 'year-from-dateTime',
  'years-from-duration', 'zero-or-one',
]);

// MarkLogic-specific syntactic construct patterns to flag in non-1.0-ml files (A5).
// Each entry is [regexSource, displayName].
const ML_CONSTRUCT_PATTERNS: Array<[string, string]> = [
  ['\\bbinary\\s*\\(\\s*\\)', 'binary()'],
  ['\\bbinary\\s*\\{', 'binary{...}'],
  ['\\bobject-node\\s*\\(\\s*\\)', 'object-node()'],
  ['\\bobject-node\\s*\\{', 'object-node{...}'],
  ['\\bnumber-node\\s*\\(\\s*\\)', 'number-node()'],
  ['\\bnumber-node\\s*\\{', 'number-node{...}'],
  ['\\bboolean-node\\s*\\(\\s*\\)', 'boolean-node()'],
  ['\\bboolean-node\\s*\\{', 'boolean-node{...}'],
  ['\\bnull-node\\s*\\(\\s*\\)', 'null-node()'],
  ['\\bnull-node\\s*\\{', 'null-node{...}'],
  ['\\barray-node\\s*\\(\\s*\\)', 'array-node()'],
  ['\\barray-node\\s*\\{', 'array-node{...}'],
  ['\\bvalidate\\s+as\\b', 'validate as'],
  ['\\bnamespace\\s*::', 'namespace::'],
  ['\\bdeclare\\s+private\\b', 'declare private'],
];

// ML-specific namespace prefixes
const ML_NAMESPACES = /^(xdmp|cts|sem|json|spell|thsr|alert|cpf|dls|admin|security|pki|temporal)$/;

export class XQueryDiagnosticProvider {
  private collection: vscode.DiagnosticCollection;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(collection: vscode.DiagnosticCollection) {
    this.collection = collection;
  }

  triggerUpdate(document: vscode.TextDocument, delay = 500): void {
    if (document.languageId !== 'xquery') return;
    const key = document.uri.toString();
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      void this.update(document, false);
    }, delay);
    this.debounceTimers.set(key, timer);
  }

  updateImmediate(document: vscode.TextDocument): void {
    if (document.languageId !== 'xquery') return;
    const key = document.uri.toString();
    const existing = this.debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
      this.debounceTimers.delete(key);
    }
    void this.update(document, false);
  }

  /** Called only on explicit save — runs the full check suite including cross-file (Phase 3). */
  updateOnSave(document: vscode.TextDocument): void {
    if (document.languageId !== 'xquery') return;
    const key = document.uri.toString();
    const existing = this.debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
      this.debounceTimers.delete(key);
    }
    void this.update(document, true);
  }

  clear(document: vscode.TextDocument): void {
    this.collection.delete(document.uri);
    const key = document.uri.toString();
    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }
  }

  private async update(document: vscode.TextDocument, onSave: boolean): Promise<void> {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    // Strip string literals and comments from a copy of the text for structural checks,
    // but keep positional offsets intact by replacing content with spaces.
    const stripped = stripStringsAndComments(text);

    const textWithoutComments = stripCommentsOnly(text);

    checkUnclosedComment(text, diagnostics, document);
    checkUnclosedStrings(textWithoutComments, diagnostics, document);
    checkUnclosedCurly(stripped, diagnostics, document);
    checkUnclosedParen(stripped, diagnostics, document);
    checkUnclosedXmlElement(stripped, diagnostics, document);
    checkMissingSemicolon(stripped, diagnostics, document);
    checkVersionDeclaration(text, diagnostics, document);
    checkVariableBeforeDeclaration(stripped, diagnostics, document);
    checkDuplicateFunctions(stripped, diagnostics, document);
    checkUnusedDeclaredVariables(stripped, diagnostics, document);
    checkUnusedFunctions(stripped, diagnostics, document);
    checkUnusedFunctionParameters(stripped, diagnostics, document);
    checkEmptyCatch(stripped, diagnostics, document);
    checkDeprecatedFunctions(text, diagnostics, document);
    checkUnusedNamespaceDeclarations(stripped, diagnostics, document);
    checkDefaultFunctionNamespaceConflict(text, diagnostics, document);
    checkMissingReturnType(stripped, diagnostics, document);
    checkMlFunctionsInStandardVersion(stripped, diagnostics, document);
    checkFnNamespaceAssumed(stripped, diagnostics, document);
    checkUnresolvedVariables(stripped, diagnostics, document);
    checkUnresolvedFunctions(stripped, diagnostics, document);
    checkUnresolvedXmlNamespaces(stripped, diagnostics, document);

    // Phase 3 — cross-file checks (save-only: file I/O is expensive)
    if (onSave) {
      await checkCrossFileDuplicateFunctions(stripped, diagnostics, document);
      await checkCrossFileUnresolvedFunctions(stripped, diagnostics, document);
    }

    this.collection.set(document.uri, diagnostics);
  }
}

// ---------------------------------------------------------------------------
// Text pre-processing helpers
// ---------------------------------------------------------------------------

/**
 * Returns a copy of `text` where string literals and comment contents are
 * replaced with spaces (preserving line/column positions).
 * Block-comment delimiters `(:` and `:)` are kept as-is so structural checks
 * still see them, but comment *body* text is blanked out.
 */
function stripStringsAndComments(text: string): string {
  const chars = text.split('');
  let i = 0;
  while (i < chars.length) {
    // Block comment
    if (chars[i] === '(' && chars[i + 1] === ':') {
      i += 2; // skip `(:`
      let depth = 1;
      while (i < chars.length && depth > 0) {
        if (chars[i] === '(' && chars[i + 1] === ':') {
          depth++;
          i += 2;
        } else if (chars[i] === ':' && chars[i + 1] === ')') {
          depth--;
          i += 2;
        } else {
          if (chars[i] !== '\n') chars[i] = ' ';
          i++;
        }
      }
      continue;
    }
    // Double-quoted string
    if (chars[i] === '"') {
      i++;
      while (i < chars.length) {
        if (chars[i] === '"') {
          if (chars[i + 1] === '"') {
            // escaped double-quote
            chars[i] = ' ';
            chars[i + 1] = ' ';
            i += 2;
          } else {
            i++; // closing quote
            break;
          }
        } else {
          if (chars[i] !== '\n') chars[i] = ' ';
          i++;
        }
      }
      continue;
    }
    // Single-quoted string
    if (chars[i] === "'") {
      i++;
      while (i < chars.length) {
        if (chars[i] === "'") {
          if (chars[i + 1] === "'") {
            chars[i] = ' ';
            chars[i + 1] = ' ';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          if (chars[i] !== '\n') chars[i] = ' ';
          i++;
        }
      }
      continue;
    }
    i++;
  }
  return chars.join('');
}

/**
 * Returns a copy of `text` where only comment bodies are replaced with spaces
 * (newlines preserved). String literal content is left untouched, so
 * checkUnclosedStrings can still detect unmatched quotes — but quotes inside
 * block comments are silenced.
 */
function stripCommentsOnly(text: string): string {
  const chars = text.split('');
  let i = 0;
  while (i < chars.length) {
    if (chars[i] === '(' && chars[i + 1] === ':') {
      i += 2;
      let depth = 1;
      while (i < chars.length && depth > 0) {
        if (chars[i] === '(' && chars[i + 1] === ':') {
          depth++;
          i += 2;
        } else if (chars[i] === ':' && chars[i + 1] === ')') {
          depth--;
          i += 2;
        } else {
          if (chars[i] !== '\n') chars[i] = ' ';
          i++;
        }
      }
      continue;
    }
    i++;
  }
  return chars.join('');
}

function positionAt(text: string, offset: number): vscode.Position {
  let line = 0, col = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') { line++; col = 0; } else { col++; }
  }
  return new vscode.Position(line, col);
}

function makeDiag(
  document: vscode.TextDocument,
  startOffset: number,
  endOffset: number,
  message: string,
  severity: vscode.DiagnosticSeverity,
  code: string,
  sourceText?: string,
): vscode.Diagnostic {
  const text = sourceText ?? document.getText();
  const start = positionAt(text, startOffset);
  const end   = positionAt(text, endOffset);
  const range = new vscode.Range(start, end);
  const d = new vscode.Diagnostic(range, message, severity);
  d.source = 'XQuery';
  d.code   = code;
  return d;
}

// ---------------------------------------------------------------------------
// Error checks
// ---------------------------------------------------------------------------

function checkUnclosedComment(
  text: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  let i = 0, depth = 0, openStart = -1;
  while (i < text.length) {
    // Skip strings so `(:` inside a string literal isn't counted.
    // Only do this outside comments (depth === 0); inside a comment body
    // quotes are plain text and must not cause the scanner to jump over `:)`.
    if (depth === 0 && (text[i] === '"' || text[i] === "'")) {
      const q = text[i]; i++;
      while (i < text.length && text[i] !== q) {
        if (text[i] === q && text[i+1] === q) { i += 2; } else { i++; }
      }
      i++; // closing quote
      continue;
    }
    if (text[i] === '(' && text[i+1] === ':') {
      if (depth === 0) openStart = i;
      depth++;
      i += 2;
      continue;
    }
    if (text[i] === ':' && text[i+1] === ')') {
      if (depth > 0) depth--;
      i += 2;
      continue;
    }
    i++;
  }
  if (depth > 0 && openStart >= 0) {
    diags.push(makeDiag(doc, openStart, openStart + 2,
      "Unclosed XQuery comment — missing closing ':)'",
      vscode.DiagnosticSeverity.Error, 'unclosed-comment', text));
  }
}

function checkUnclosedStrings(
  text: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  const lines = text.split('\n');
  let lineOffset = 0;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    // Skip inside block comments (crude: check if we're inside a comment by tracking globally)
    // For per-line string check we use a simple scan per line
    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci];
      if (ch === '"' || ch === "'") {
        const q = ch;
        ci++;
        let closed = false;
        while (ci < line.length) {
          if (line[ci] === q) {
            if (line[ci + 1] === q) { ci += 2; continue; }
            closed = true; ci++; break;
          }
          ci++;
        }
        if (!closed) {
          const offset = lineOffset + (ci - 1);
          const start  = positionAt(text, lineOffset + (ci - 1 < line.length ? ci - 1 : line.length - 1));
          // mark the opening quote position
          const qPos = line.lastIndexOf(q, ci - 1);
          const diagStart = new vscode.Position(li, qPos >= 0 ? qPos : 0);
          const diagEnd   = new vscode.Position(li, line.length);
          const d = new vscode.Diagnostic(
            new vscode.Range(diagStart, diagEnd),
            'Unclosed string literal',
            vscode.DiagnosticSeverity.Error
          );
          d.source = 'XQuery'; d.code = 'unclosed-string';
          diags.push(d);
        }
      }
    }
    lineOffset += line.length + 1; // +1 for the \n
  }
}

function checkUnclosedCurly(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  let depth = 0, lastOpen = -1;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === '{') { if (depth === 0) lastOpen = i; depth++; }
    else if (stripped[i] === '}') { if (depth > 0) depth--; }
  }
  if (depth > 0 && lastOpen >= 0) {
    diags.push(makeDiag(doc, lastOpen, lastOpen + 1,
      "Unclosed expression block — missing closing '}'",
      vscode.DiagnosticSeverity.Error, 'unclosed-curly', stripped));
  }
}

function checkUnclosedParen(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  let depth = 0, lastOpen = -1;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === '(') { if (depth === 0) lastOpen = i; depth++; }
    else if (stripped[i] === ')') { if (depth > 0) depth--; }
  }
  if (depth > 0 && lastOpen >= 0) {
    diags.push(makeDiag(doc, lastOpen, lastOpen + 1,
      "Unclosed parenthesis",
      vscode.DiagnosticSeverity.Error, 'unclosed-paren', stripped));
  }
}

function checkUnclosedXmlElement(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  // Find opening tags that have no matching close/self-close
  // Simple approach: collect <tag> and </tag> and check balance
  const openTagRe  = /<([a-zA-Z_][\w:\-]*)(?:\s[^>]*)?>(?!\s*\/)/g;
  const closeTagRe = /<\/([a-zA-Z_][\w:\-]*)\s*>/g;
  const selfCloseRe = /<([a-zA-Z_][\w:\-]*)(?:\s[^>]*)?\s*\/>/g;

  const stack: Array<{ name: string; offset: number }> = [];
  const selfClosed = new Set<string>();

  let m: RegExpExecArray | null;
  selfCloseRe.lastIndex = 0;
  while ((m = selfCloseRe.exec(stripped)) !== null) {
    selfClosed.add(`${m[1]}@${m.index}`);
  }

  // Merge open/close events in offset order
  const events: Array<{ type: 'open' | 'close'; name: string; offset: number }> = [];
  openTagRe.lastIndex = 0;
  while ((m = openTagRe.exec(stripped)) !== null) {
    const key = `${m[1]}@${m.index}`;
    if (!selfClosed.has(key)) {
      events.push({ type: 'open', name: m[1], offset: m.index });
    }
  }
  closeTagRe.lastIndex = 0;
  while ((m = closeTagRe.exec(stripped)) !== null) {
    events.push({ type: 'close', name: m[1], offset: m.index });
  }
  events.sort((a, b) => a.offset - b.offset);

  for (const ev of events) {
    if (ev.type === 'open') {
      stack.push({ name: ev.name, offset: ev.offset });
    } else {
      const top = stack[stack.length - 1];
      if (top && top.name === ev.name) {
        stack.pop();
      }
    }
  }

  for (const unclosed of stack) {
    diags.push(makeDiag(doc, unclosed.offset, unclosed.offset + unclosed.name.length + 1,
      `Unclosed XML element '<${unclosed.name}>'`,
      vscode.DiagnosticSeverity.Error, 'unclosed-xml-element', stripped));
  }
}

function checkMissingSemicolon(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  // Match prolog declarations and check that they end with `;`
  // We look for the pattern at the top of the file (before the first `return` or bare expression)
  const declRe = /\b(declare\s+(?:(?:%[\w:]+\s+)*(?:function|variable|namespace|option|default\s+\w+\s+namespace))|import\s+module(?:\s+namespace)?)\b/g;

  let m: RegExpExecArray | null;
  declRe.lastIndex = 0;
  while ((m = declRe.exec(stripped)) !== null) {
    const start = m.index;
    // Find end of this declaration: scan forward for `;` or `{` (function body starts)
    let j = start + m[0].length;
    let foundSemi = false;
    let braceDepth = 0;
    let bodyStart = -1;
    while (j < stripped.length) {
      const c = stripped[j];
      if (c === ';') { foundSemi = true; break; }
      if (c === '{') {
        if (braceDepth === 0) bodyStart = j;
        braceDepth++;
      } else if (c === '}') {
        if (braceDepth > 0) braceDepth--;
        if (braceDepth === 0 && bodyStart >= 0) {
          // Look for `;` after closing `}`
          let k = j + 1;
          while (k < stripped.length && /\s/.test(stripped[k])) k++;
          if (stripped[k] === ';') { foundSemi = true; }
          break;
        }
      }
      j++;
    }
    if (!foundSemi) {
      // Point to end of the matched keyword
      const end = start + m[0].length;
      diags.push(makeDiag(doc, start, end,
        "Prolog declaration must end with ';'",
        vscode.DiagnosticSeverity.Error, 'missing-semicolon', stripped));
    }
  }
}

function checkVersionDeclaration(
  text: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  const versionRe = /\bxquery\s+version\s+"([^"]+)"/g;
  let m: RegExpExecArray | null;
  versionRe.lastIndex = 0;
  while ((m = versionRe.exec(text)) !== null) {
    const version = m[1];
    if (!VALID_XQUERY_VERSIONS.has(version)) {
      const versionStart = m.index + m[0].indexOf('"');
      const versionEnd   = versionStart + version.length + 2;
      diags.push(makeDiag(doc, versionStart, versionEnd,
        `Unknown XQuery version '${version}'. Expected one of: 1.0, 1.0-ml, 3.0, 3.1`,
        vscode.DiagnosticSeverity.Error, 'invalid-version', text));
    }
  }
}

function checkVariableBeforeDeclaration(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  // Collect all binding positions. Always keep the earliest (minimum) offset for
  // each name so that a function parameter at line N beats a `let $x` at line M > N.
  const bindings = new Map<string, number>(); // name -> earliest binding offset

  const setBinding = (name: string, offset: number) => {
    const existing = bindings.get(name);
    if (existing === undefined || offset < existing) {
      bindings.set(name, offset);
    }
  };

  // Register function parameters first — they bind at the function declaration offset.
  // Must run before the let/for pass so that a param at line 24 wins over a
  // `let $param` at line 72 in a completely different function body.
  //
  // We use a balanced-paren scanner rather than ([^)]*) because parameter type
  // annotations often contain parentheses — e.g. node(), document-node(),
  // element(foo), map:map() — and a naive regex stops at the first `)` it sees,
  // leaving all parameters after that type annotation uncaptured.
  const funcHeadRe = /\bdeclare\s+(?:(?:%[\w:]+|private|public)\s+)*function\s+[\w:-]+\s*\(/g;
  let m: RegExpExecArray | null;
  funcHeadRe.lastIndex = 0;
  while ((m = funcHeadRe.exec(stripped)) !== null) {
    const declOffset = m.index;
    // m[0] ends with `(`, so the param list starts at m.index + m[0].length
    let i = m.index + m[0].length;
    let depth = 1; // we are one level inside the opening `(`
    while (i < stripped.length && depth > 0) {
      const ch = stripped[i];
      if (ch === '(') {
        depth++;
        i++;
      } else if (ch === ')') {
        depth--;
        i++;
      } else if (ch === '$') {
        // Collect the variable name that follows `$`
        i++;
        const nameStart = i;
        while (i < stripped.length && /[\w-]/.test(stripped[i])) {
          i++;
        }
        const name = stripped.slice(nameStart, i);
        if (name) setBinding(name, declOffset);
      } else {
        i++;
      }
    }
  }

  // Collect let / for / declare variable bindings.
  const bindingRe = /\b(?:let|for|some|every)\s+\$([a-zA-Z_][\w\-]*)|declare\s+(?:(?:%[\w:]+|private|public)\s+)*variable\s+\$([a-zA-Z_][\w\-]*)/g;
  bindingRe.lastIndex = 0;
  while ((m = bindingRe.exec(stripped)) !== null) {
    setBinding(m[1] ?? m[2], m.index);
  }

  // Find all variable references
  const refRe = /\$([a-zA-Z_][\w\-]*)/g;
  refRe.lastIndex = 0;
  while ((m = refRe.exec(stripped)) !== null) {
    const name = m[1];
    const refOffset = m.index;
    // Skip namespace-qualified variables: $prefix:localname — "prefix" here is a
    // namespace prefix, not a variable name (e.g. $project:check-config).
    if (stripped[refOffset + name.length + 1] === ':') continue;
    const bindOffset = bindings.get(name);
    // If there's no binding at all, or the first binding comes AFTER this reference
    if (bindOffset === undefined) {
      // Unknown variable — skip (might be external or parameter)
      continue;
    }
    if (bindOffset > refOffset) {
      diags.push(makeDiag(doc, refOffset, refOffset + name.length + 1,
        `Variable '$${name}' used before it is declared`,
        vscode.DiagnosticSeverity.Error, 'var-before-decl', stripped));
    }
  }
}

function checkDuplicateFunctions(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  const funcRe = /\bdeclare\s+(?:%[\w:]+\s+)*function\s+([\w\-]+(?::[\w\-]+)?)\s*\(([^)]*)\)/g;
  const seen = new Map<string, { offset: number; arity: number }>();

  let m: RegExpExecArray | null;
  funcRe.lastIndex = 0;
  while ((m = funcRe.exec(stripped)) !== null) {
    const name = m[1];
    const params = m[2].trim();
    const arity = params === '' ? 0 : (params.match(/\$/g) ?? []).length;
    const key = `${name}/${arity}`;
    if (seen.has(key)) {
      diags.push(makeDiag(doc, m.index, m.index + m[0].length,
        `Duplicate function declaration '${name}' with ${arity} parameter${arity !== 1 ? 's' : ''}`,
        vscode.DiagnosticSeverity.Error, 'duplicate-function', stripped));
    } else {
      seen.set(key, { offset: m.index, arity });
    }
  }
}

// ---------------------------------------------------------------------------
// Warning checks
// ---------------------------------------------------------------------------

function checkUnusedDeclaredVariables(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  const declRe = /\bdeclare\s+(?:(?:%[\w:]+|private|public)\s+)*variable\s+\$([a-zA-Z_][\w\-]*)/g;
  let m: RegExpExecArray | null;
  declRe.lastIndex = 0;
  while ((m = declRe.exec(stripped)) !== null) {
    const name = m[1];
    const declOffset = m.index;
    // Count all references to this variable name
    const refRe = new RegExp(`\\$${escapeRegex(name)}\\b`, 'g');
    refRe.lastIndex = 0;
    let refCount = 0;
    let rm: RegExpExecArray | null;
    while ((rm = refRe.exec(stripped)) !== null) {
      if (rm.index !== declOffset + m[0].indexOf('$' + name)) refCount++;
    }
    if (refCount === 0) {
      const varStart = declOffset + m[0].indexOf('$' + name);
      diags.push(makeDiag(doc, varStart, varStart + name.length + 1,
        `Variable '$${name}' is declared but never used`,
        vscode.DiagnosticSeverity.Warning, 'unused-variable', stripped));
    }
  }
}

function checkUnusedFunctions(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  const declRe = /\bdeclare\s+(?:%[\w:]+\s+)*function\s+([\w\-]+(?::[\w\-]+)?)\s*\(/g;
  let m: RegExpExecArray | null;
  declRe.lastIndex = 0;
  while ((m = declRe.exec(stripped)) !== null) {
    const name = m[1];
    const declOffset = m.index;
    // Look for call-site: name followed by `(` but NOT the declaration itself
    const callRe = new RegExp(`\\b${escapeRegex(name)}\\s*\\(`, 'g');
    callRe.lastIndex = 0;
    let callCount = 0;
    let cm: RegExpExecArray | null;
    while ((cm = callRe.exec(stripped)) !== null) {
      // Skip the declaration itself
      if (Math.abs(cm.index - declOffset) > 5) callCount++;
    }
    if (callCount === 0) {
      const nameStart = declOffset + m[0].indexOf(name);
      diags.push(makeDiag(doc, nameStart, nameStart + name.length,
        `Function '${name}' is declared but never called`,
        vscode.DiagnosticSeverity.Warning, 'unused-function', stripped));
    }
  }
}

function checkEmptyCatch(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  // Match: catch ($var) { <only whitespace> }
  const catchRe = /\bcatch\s*\(\s*\$[\w\-:]+\s*\)\s*\{(\s*)\}/g;
  let m: RegExpExecArray | null;
  catchRe.lastIndex = 0;
  while ((m = catchRe.exec(stripped)) !== null) {
    diags.push(makeDiag(doc, m.index, m.index + m[0].length,
      'Empty catch block — errors are silently ignored',
      vscode.DiagnosticSeverity.Warning, 'empty-catch', stripped));
  }
}

function checkDeprecatedFunctions(
  text: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  for (const [fnName, [since, replacement]] of Object.entries(DEPRECATED_ML_FUNCTIONS)) {
    const escapedName = escapeRegex(fnName);
    const re = new RegExp(`\\b${escapedName}\\s*\\(`, 'g');
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const msg = replacement
        ? `Function '${fnName}' is deprecated since MarkLogic ${since}. Use '${replacement}' instead.`
        : `Function '${fnName}' is a legacy API (since MarkLogic ${since}).`;
      diags.push(makeDiag(doc, m.index, m.index + fnName.length,
        msg, vscode.DiagnosticSeverity.Warning, 'deprecated-function', text));
    }
  }
}

// ---------------------------------------------------------------------------
// Hint checks
// ---------------------------------------------------------------------------

function checkMissingReturnType(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  // declare function name(...) { — no `as <type>` before `{`
  const funcRe = /\bdeclare\s+(?:%[\w:]+\s+)*function\s+([\w\-]+(?::[\w\-]+)?)\s*\([^)]*\)\s*/g;
  let m: RegExpExecArray | null;
  funcRe.lastIndex = 0;
  while ((m = funcRe.exec(stripped)) !== null) {
    const afterParen = m.index + m[0].length;
    // Check if followed by `as` (return type) or directly by `{` or `external`
    const rest = stripped.slice(afterParen, afterParen + 30).trimStart();
    if (!rest.startsWith('as ') && !rest.startsWith('as\t') && !rest.startsWith('external')) {
      const nameStart = m.index + m[0].indexOf(m[1]);
      diags.push(makeDiag(doc, nameStart, nameStart + m[1].length,
        'Consider adding a return type annotation for better clarity',
        vscode.DiagnosticSeverity.Hint, 'missing-return-type', stripped));
    }
  }
}

function checkMlFunctionsInStandardVersion(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  // Read the version from the raw document text, not `stripped`, because `stripped`
  // blanks out string contents — so "1.0-ml" would appear as spaces and the
  // version check would never match, firing false positives on every 1.0-ml file.
  const rawText = doc.getText();
  const verMatch = /\bxquery\s+version\s+"([^"]+)"/.exec(rawText);
  if (!verMatch) return;
  const version = verMatch[1];
  if (version === '1.0-ml' || version === '0.9-ml') return;

  // ML namespace function calls (e.g. xdmp:log, cts:search)
  const mlCallRe = /\b(xdmp|cts|sem|json|spell|thsr|alert|cpf|dls|admin|security|pki|temporal):([\w\-]+)\s*\(/g;
  let m: RegExpExecArray | null;
  mlCallRe.lastIndex = 0;
  while ((m = mlCallRe.exec(stripped)) !== null) {
    const fullName = `${m[1]}:${m[2]}`;
    diags.push(makeDiag(doc, m.index, m.index + fullName.length,
      `Function '${fullName}' is a MarkLogic extension. Consider declaring xquery version "1.0-ml" at the top of the file.`,
      vscode.DiagnosticSeverity.Hint, 'ml-function-in-standard-version', stripped));
  }

  // MarkLogic-specific syntactic constructs (18 patterns from the IntelliJ plugin)
  for (const [pattern, displayName] of ML_CONSTRUCT_PATTERNS) {
    const re = new RegExp(pattern, 'g');
    re.lastIndex = 0;
    while ((m = re.exec(stripped)) !== null) {
      diags.push(makeDiag(doc, m.index, m.index + m[0].length,
        `'${displayName}' is a MarkLogic-specific construct. Consider declaring xquery version "1.0-ml" at the top of the file.`,
        vscode.DiagnosticSeverity.Hint, 'ml-construct-in-standard-version', stripped));
    }
  }
}

// ---------------------------------------------------------------------------
// Group A — new checks
// ---------------------------------------------------------------------------

/**
 * A1 + A2 — Unused `import module namespace` and `declare namespace` prefixes.
 * A prefix is "used" if it appears as `prefix:` anywhere in the stripped body
 * (function calls, variable refs, XML tags, QName constructors).
 */
function checkUnusedNamespaceDeclarations(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  type NsDecl = { prefix: string; offset: number; kind: 'import' | 'namespace' };
  const declarations: NsDecl[] = [];

  const importRe = /\bimport\s+module\s+namespace\s+([\w\-]+)\s*=/g;
  const declNsRe  = /\bdeclare\s+namespace\s+([\w\-]+)\s*=/g;
  let m: RegExpExecArray | null;

  importRe.lastIndex = 0;
  while ((m = importRe.exec(stripped)) !== null) {
    const prefixOffset = m.index + m[0].lastIndexOf(m[1]);
    declarations.push({ prefix: m[1], offset: prefixOffset, kind: 'import' });
  }

  declNsRe.lastIndex = 0;
  while ((m = declNsRe.exec(stripped)) !== null) {
    const prefixOffset = m.index + m[0].lastIndexOf(m[1]);
    declarations.push({ prefix: m[1], offset: prefixOffset, kind: 'namespace' });
  }

  if (declarations.length === 0) return;

  // Collect every `prefix:` token that appears in the body.
  // Running on `stripped` avoids false matches inside string literals or comments.
  const usedPrefixes = new Set<string>();
  const usageRe = /\b([\w\-]+):/g;
  usageRe.lastIndex = 0;
  while ((m = usageRe.exec(stripped)) !== null) {
    usedPrefixes.add(m[1]);
  }

  for (const decl of declarations) {
    if (!usedPrefixes.has(decl.prefix)) {
      const msg = decl.kind === 'import'
        ? `Import of namespace '${decl.prefix}' is never used`
        : `Namespace declaration '${decl.prefix}' is never used`;
      const code = decl.kind === 'import' ? 'unused-import' : 'unused-namespace-decl';
      diags.push(makeDiag(doc, decl.offset, decl.offset + decl.prefix.length,
        msg, vscode.DiagnosticSeverity.Warning, code, stripped));
    }
  }
}

/**
 * A6 — Unused function parameters.
 * For each `declare function`, extract parameters via balanced-paren scan, locate the
 * function body `{ ... }`, then count references to each `$param` within the body only.
 * Skips `$_` (conventional ignore pattern).
 */
function checkUnusedFunctionParameters(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  const funcHeadRe = /\bdeclare\s+(?:(?:%[\w:]+|private|public)\s+)*function\s+[\w:-]+\s*\(/g;
  let m: RegExpExecArray | null;
  funcHeadRe.lastIndex = 0;

  while ((m = funcHeadRe.exec(stripped)) !== null) {
    // --- 1. Extract parameters with their offsets using a balanced-paren scan ---
    const params: Array<{ name: string; offset: number }> = [];
    let i = m.index + m[0].length; // position right after the opening `(`
    let depth = 1;

    while (i < stripped.length && depth > 0) {
      const ch = stripped[i];
      if (ch === '(') { depth++; i++; }
      else if (ch === ')') { depth--; i++; }
      else if (ch === '$') {
        i++;
        const nameStart = i;
        while (i < stripped.length && /[\w-]/.test(stripped[i])) i++;
        const name = stripped.slice(nameStart, i);
        if (name && name !== '_') {
          params.push({ name, offset: nameStart - 1 }); // -1 to include the `$`
        }
      } else { i++; }
    }

    if (params.length === 0) continue;

    // --- 2. Find the function body: scan past optional `as return-type` to `{` ---
    let bodyStart = -1;
    let j = i;
    while (j < stripped.length) {
      if (stripped[j] === '{') { bodyStart = j; break; }
      if (stripped[j] === ';') break; // `external` function — no body
      j++;
    }
    if (bodyStart === -1) continue;

    // --- 3. Find matching `}` for the body ---
    let bodyEnd = -1;
    let braceDepth = 1;
    j = bodyStart + 1;
    while (j < stripped.length && braceDepth > 0) {
      if (stripped[j] === '{') braceDepth++;
      else if (stripped[j] === '}') {
        braceDepth--;
        if (braceDepth === 0) { bodyEnd = j; break; }
      }
      j++;
    }
    if (bodyEnd === -1) continue;

    const body = stripped.slice(bodyStart + 1, bodyEnd);

    // --- 4. Count references to each parameter inside the body ---
    for (const param of params) {
      const refRe = new RegExp(`\\$${escapeRegex(param.name)}(?![\\w-])`, 'g');
      refRe.lastIndex = 0;
      if (!refRe.test(body)) {
        diags.push(makeDiag(doc, param.offset, param.offset + param.name.length + 1,
          `Parameter '$${param.name}' is declared but never used`,
          vscode.DiagnosticSeverity.Warning, 'unused-parameter', stripped));
      }
    }
  }
}

/**
 * A4 — Bare call to a known W3C `fn:` built-in without the `fn:` prefix.
 * Fired as a Hint: the call is valid XQuery, but using the prefix avoids silent
 * shadowing by local functions of the same name.
 */
function checkFnNamespaceAssumed(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  const callRe = /\b([a-zA-Z][\w\-]*)\s*\(/g;
  let m: RegExpExecArray | null;
  callRe.lastIndex = 0;

  while ((m = callRe.exec(stripped)) !== null) {
    const name = m[1];
    if (!FN_BUILTIN_NAMES.has(name)) continue;

    // Skip if prefixed: character immediately before the match must not be `:`
    if (m.index > 0 && stripped[m.index - 1] === ':') continue;

    // Skip if this is a `declare function name(` — it's a declaration, not a call
    const before = stripped.slice(Math.max(0, m.index - 25), m.index).trimEnd();
    if (/\bfunction\s*$/.test(before)) continue;

    diags.push(makeDiag(doc, m.index, m.index + name.length,
      `Call to '${name}' assumes the fn: namespace. Consider using 'fn:${name}' for clarity.`,
      vscode.DiagnosticSeverity.Hint, 'fn-namespace-assumed', stripped));
  }
}

/**
 * A3 — Default function namespace conflicts with module namespace.
 * Fires only for library modules. If `declare default function namespace "URI"` is
 * present and the URI differs from both the module namespace URI and the W3C fn: URI,
 * report a warning.
 */
function checkDefaultFunctionNamespaceConflict(
  text: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  const moduleNsRe   = /\bmodule\s+namespace\s+[\w\-]+\s*=\s*"([^"]+)"/;
  const defaultFnNsRe = /\bdeclare\s+default\s+function\s+namespace\s+"([^"]+)"/g;

  const moduleMatch = moduleNsRe.exec(text);
  if (!moduleMatch) return; // only applies to library modules

  const moduleUri = moduleMatch[1];
  const W3C_FN_NS = 'http://www.w3.org/2005/xpath-functions';

  let m: RegExpExecArray | null;
  defaultFnNsRe.lastIndex = 0;
  while ((m = defaultFnNsRe.exec(text)) !== null) {
    const defaultUri = m[1];
    if (defaultUri !== moduleUri && defaultUri !== W3C_FN_NS) {
      const uriStart = m.index + m[0].indexOf('"');
      const uriEnd   = uriStart + defaultUri.length + 2;
      diags.push(makeDiag(doc, uriStart, uriEnd,
        `Default function namespace '${defaultUri}' should match the module namespace '${moduleUri}'`,
        vscode.DiagnosticSeverity.Warning, 'default-ns-mismatch', text));
    }
  }
}

// ---------------------------------------------------------------------------
// Group B — same-file resolution checks
// ---------------------------------------------------------------------------

/**
 * B1 — Unresolved variable reference.
 * Flags any $var that has no binding anywhere in the file.
 * Conservative (file-scope, no per-function scoping): avoids false positives at
 * the cost of not catching variables that leak across function boundaries.
 *
 * Binding constructs covered:
 *   declare variable $x
 *   let $x / for $x / some $x / every $x
 *   for $x at $pos in   (positional binding)
 *   catch ($err)
 *   typeswitch case … as $x
 *   declare function parameters (balanced-paren scan)
 *
 * Skipped: $_ (ignore convention), $pfx:local (namespace-qualified, cross-file).
 */
function checkUnresolvedVariables(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  const bound = new Set<string>();

  // declare variable $x  (also: declare private variable, declare %private variable)
  // The optional `(?:[\w\-]+:)?` skips a namespace prefix so that both
  //   $PROJECT-BASE-URI          → binds "PROJECT-BASE-URI"
  //   $project:repo-is-enabled   → binds "repo-is-enabled"  (bare local name used inside module)
  const moduleVarRe = /\bdeclare\s+(?:(?:%[\w:]+|private|public)\s+)*variable\s+\$(?:[\w\-]+:)?([a-zA-Z_][\w\-]*)/g;
  let m: RegExpExecArray | null;
  moduleVarRe.lastIndex = 0;
  while ((m = moduleVarRe.exec(stripped)) !== null) bound.add(m[1]);

  // let / for / some / every $x
  const flworRe = /\b(?:let|for|some|every)\s+\$([a-zA-Z_][\w\-]*)/g;
  flworRe.lastIndex = 0;
  while ((m = flworRe.exec(stripped)) !== null) bound.add(m[1]);

  // for $x at $pos in  — positional binding
  const positionalRe = /\bfor\s+\$[\w\-]+\s+at\s+\$([a-zA-Z_][\w\-]*)/g;
  positionalRe.lastIndex = 0;
  while ((m = positionalRe.exec(stripped)) !== null) bound.add(m[1]);

  // catch ($err) — MarkLogic style: catch($e) or catch ($e)
  const catchVarRe = /\bcatch\s*\(\s*\$([a-zA-Z_][\w\-]*)/g;
  catchVarRe.lastIndex = 0;
  while ((m = catchVarRe.exec(stripped)) !== null) bound.add(m[1]);

  // typeswitch case … as $x
  const caseBindingRe = /\bas\s+\$([a-zA-Z_][\w\-]*)/g;
  caseBindingRe.lastIndex = 0;
  while ((m = caseBindingRe.exec(stripped)) !== null) bound.add(m[1]);

  // declare function / inline function parameters (balanced-paren scan)
  // Covers both `declare function name(` and anonymous `function(`
  const funcHeadRe = /(?:\bdeclare\s+(?:(?:%[\w:]+|private|public)\s+)*function\s+[\w:-]+|\bfunction)\s*\(/g;
  funcHeadRe.lastIndex = 0;
  while ((m = funcHeadRe.exec(stripped)) !== null) {
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < stripped.length && depth > 0) {
      const ch = stripped[i];
      if      (ch === '(') { depth++; i++; }
      else if (ch === ')') { depth--; i++; }
      else if (ch === '$') {
        i++;
        const start = i;
        while (i < stripped.length && /[\w-]/.test(stripped[i])) i++;
        const name = stripped.slice(start, i);
        if (name) bound.add(name);
      } else { i++; }
    }
  }

  // Scan all variable references and flag any with no known binding
  const refRe = /\$([a-zA-Z_][\w\-]*)/g;
  refRe.lastIndex = 0;
  while ((m = refRe.exec(stripped)) !== null) {
    const name = m[1];
    if (name === '_') continue;
    // Skip namespace-qualified refs like $pfx:local — the `:` sits right after
    if (stripped[m.index + m[0].length] === ':') continue;
    if (!bound.has(name)) {
      diags.push(makeDiag(doc, m.index, m.index + m[0].length,
        `Cannot resolve variable '$${name}'`,
        vscode.DiagnosticSeverity.Error, 'unresolved-variable', stripped));
    }
  }
}

/**
 * B2 — Unresolved function reference (same-file scope).
 * Checks only the calls that can be verified without reading external files:
 *   • local:name(…)  — must have a matching declare function local:name
 *   • modulePrefix:name(…) — must have declare function modulePrefix:name
 *                             OR bare declare function name (implicit module namespace)
 *
 * All imported-namespace prefixes and all known builtin prefixes are skipped.
 * Unprefixed calls are skipped in library modules (default fn-ns is module ns).
 */
function checkUnresolvedFunctions(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  // Collect all declared function names (both bare and qualified)
  const declared = new Set<string>();
  const funcDeclRe = /\bdeclare\s+(?:(?:%[\w:]+|private|public)\s+)*function\s+([\w:-]+)\s*\(/g;
  let m: RegExpExecArray | null;
  funcDeclRe.lastIndex = 0;
  while ((m = funcDeclRe.exec(stripped)) !== null) declared.add(m[1]);

  const rawText = doc.getText();

  // Module namespace prefix (library modules only)
  const moduleNsMatch = /\bmodule\s+namespace\s+([\w\-]+)\s*=/.exec(rawText);
  const modulePrefix = moduleNsMatch ? moduleNsMatch[1] : null;

  // Imported namespace prefixes — never check these (cross-file = Group C)
  const importedPrefixes = new Set<string>();
  const importRe = /\bimport\s+module\s+namespace\s+([\w\-]+)\s*=/g;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(stripped)) !== null) importedPrefixes.add(m[1]);

  // Standard prefixes whose functions are always externally resolved
  const BUILTIN_PREFIXES = new Set([
    'fn', 'xs', 'xsi', 'math', 'map', 'array', 'err', 'op', 'sql',
    'xdmp', 'cts', 'sem', 'json', 'spell', 'thsr', 'alert',
    'cpf', 'dls', 'admin', 'security', 'pki', 'temporal',
    'prof', 'debug', 'dbg', 'rdf', 'sc', 'xml',
  ]);

  // Scan all qualified function calls: prefix:name(
  const callRe = /\b([\w\-]+):([\w\-]+)\s*\(/g;
  callRe.lastIndex = 0;
  while ((m = callRe.exec(stripped)) !== null) {
    const prefix    = m[1];
    const localName = m[2];
    const fullName  = `${prefix}:${localName}`;

    // Skip known builtins and imported modules
    if (BUILTIN_PREFIXES.has(prefix)) continue;
    if (importedPrefixes.has(prefix)) continue;

    // Skip function declaration headers — `declare … function prefix:name(`
    const before = stripped.slice(Math.max(0, m.index - 30), m.index);
    if (/\bfunction\s+$/.test(before)) continue;

    const checkPrefix = prefix === 'local' || prefix === modulePrefix;
    if (!checkPrefix) continue;

    // For the module prefix: accept both explicit `pfx:name` and bare `name`
    // declarations (implicit module namespace assignment)
    const resolved = declared.has(fullName) ||
                     (prefix === modulePrefix && declared.has(localName));

    if (!resolved) {
      diags.push(makeDiag(doc, m.index, m.index + fullName.length,
        `Cannot resolve function '${fullName}'`,
        vscode.DiagnosticSeverity.Error, 'unresolved-function', stripped));
    }
  }
}

/**
 * B3 — Unresolved XML namespace prefix in element constructors.
 * Flags <prefix:tag> patterns where `prefix` has no namespace declaration in the file.
 * Skips if the `<` is preceded by a word character or `)` (comparison context).
 */
function checkUnresolvedXmlNamespaces(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument
): void {
  const rawText = doc.getText();

  // Collect all in-scope namespace prefixes
  const declared = new Set<string>();

  // Always-available built-in prefixes
  for (const p of ['xml', 'xs', 'xsi', 'fn', 'local', 'err']) declared.add(p);

  // module namespace prefix
  const moduleNsMatch = /\bmodule\s+namespace\s+([\w\-]+)\s*=/.exec(rawText);
  if (moduleNsMatch) declared.add(moduleNsMatch[1]);

  // declare namespace pfx = "…"
  const declNsRe = /\bdeclare\s+namespace\s+([\w\-]+)\s*=/g;
  let m: RegExpExecArray | null;
  declNsRe.lastIndex = 0;
  while ((m = declNsRe.exec(stripped)) !== null) declared.add(m[1]);

  // import module namespace pfx = "…"
  const importRe = /\bimport\s+module\s+namespace\s+([\w\-]+)\s*=/g;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(stripped)) !== null) declared.add(m[1]);

  // declare default element namespace — adds no prefix but signals intent;
  // we conservatively skip B3 entirely when this declaration is present because
  // the default namespace applies to unprefixed elements but prefixed ones still
  // need explicit declarations.

  // Scan direct XML element constructors: <prefix:localname
  const xmlTagRe = /<([a-zA-Z_][\w\-]*):([a-zA-Z_][\w\-]*)/g;
  xmlTagRe.lastIndex = 0;
  while ((m = xmlTagRe.exec(stripped)) !== null) {
    const prefix = m[1];

    // Skip if immediately preceded by a word character, `$`, or `)` —
    // those indicate a comparison operator context, not an XML constructor.
    if (m.index > 0 && /[\w$)]/.test(stripped[m.index - 1])) continue;

    if (declared.has(prefix)) continue;

    // Point the diagnostic at the prefix only (after the `<`)
    const prefixStart = m.index + 1;
    diags.push(makeDiag(doc, prefixStart, prefixStart + prefix.length,
      `Cannot resolve namespace prefix '${prefix}'`,
      vscode.DiagnosticSeverity.Error, 'unresolved-xml-namespace', stripped));
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Phase 3 — Cross-file helpers
// ---------------------------------------------------------------------------

/** Parsed exports from a single XQuery module file. */
interface ModuleExports {
  modulePrefix: string | null;
  /** Set of "localName/arity" strings for every declared function. */
  functions: Set<string>;
}

/**
 * Reads an XQuery file and extracts its module prefix and declared function
 * signatures (local name + arity).  Used by both C1 and C2 checks.
 */
async function readModuleExports(uri: vscode.Uri): Promise<ModuleExports | null> {
  let content: string;
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    content = new TextDecoder().decode(bytes);
  } catch {
    return null;
  }

  const stripped = stripStringsAndComments(content);

  const modulePrefixMatch = /\bmodule\s+namespace\s+([\w\-]+)\s*=/.exec(content);
  const modulePrefix = modulePrefixMatch ? modulePrefixMatch[1] : null;

  const functions = new Set<string>();
  const funcHeadRe =
    /\bdeclare\s+(?:(?:%[\w:]+|private|public)\s+)*function\s+([\w:-]+)\s*\(/g;
  let m: RegExpExecArray | null;
  funcHeadRe.lastIndex = 0;
  while ((m = funcHeadRe.exec(stripped)) !== null) {
    const fullName = m[1];
    // Count parameters via balanced-paren scan
    let i = m.index + m[0].length;
    let depth = 1, arity = 0;
    while (i < stripped.length && depth > 0) {
      const ch = stripped[i];
      if      (ch === '(') { depth++; i++; }
      else if (ch === ')') { depth--; i++; }
      else if (ch === '$') { arity++; i++; }
      else                 { i++; }
    }
    // Store by local name only (strip namespace prefix if present)
    const colonIdx = fullName.indexOf(':');
    const localName = colonIdx >= 0 ? fullName.slice(colonIdx + 1) : fullName;
    functions.add(`${localName}/${arity}`);
  }

  return { modulePrefix, functions };
}

/**
 * Resolves an `at "path"` import path to a workspace URI.
 *
 * Two strategies are tried in order:
 *  1. Relative path — join with the directory of the importing file.
 *  2. Suffix search — use `vscode.workspace.findFiles` to locate any workspace
 *     file whose path ends with the import path (handles absolute MarkLogic
 *     module paths like `/tpms/utils/path.xqy`).
 */
async function resolveImportPath(
  importPath: string,
  currentDocUri: vscode.Uri,
): Promise<vscode.Uri | null> {
  // Strategy 1: relative path
  if (!importPath.startsWith('/')) {
    try {
      const dir = vscode.Uri.joinPath(currentDocUri, '..');
      const candidate = vscode.Uri.joinPath(dir, importPath);
      await vscode.workspace.fs.stat(candidate);
      return candidate;
    } catch { /* not found */ }
  }

  // Strategy 2: workspace suffix search
  const suffix   = importPath.replace(/^\//, '').replace(/\\/g, '/');
  const basename = suffix.split('/').pop() ?? suffix;
  try {
    const matches = await vscode.workspace.findFiles(`**/${basename}`, null, 20);
    const hit = matches.find(u => u.fsPath.replace(/\\/g, '/').endsWith(suffix));
    if (hit) return hit;
  } catch { /* workspace API unavailable */ }

  return null;
}

// ---------------------------------------------------------------------------
// Phase 3 — C1: Cross-file duplicate function declaration
// ---------------------------------------------------------------------------

/**
 * C1 — For each `import module … at "path"`, reads the imported file and
 * reports an error on any local `declare function` whose local name + arity
 * matches a function already declared in the imported module.
 *
 * Only runs on save (file I/O).
 */
async function checkCrossFileDuplicateFunctions(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument,
): Promise<void> {
  const rawText = doc.getText();

  // Collect local declared functions: "localName/arity" → offset of `declare`
  const localFuncs = new Map<string, { offset: number; arity: number }>();
  const funcHeadRe =
    /\bdeclare\s+(?:(?:%[\w:]+|private|public)\s+)*function\s+([\w:-]+)\s*\(/g;
  let m: RegExpExecArray | null;
  funcHeadRe.lastIndex = 0;
  while ((m = funcHeadRe.exec(stripped)) !== null) {
    const fullName = m[1];
    const offset   = m.index;
    let i = m.index + m[0].length;
    let depth = 1, arity = 0;
    while (i < stripped.length && depth > 0) {
      const ch = stripped[i];
      if      (ch === '(') { depth++; i++; }
      else if (ch === ')') { depth--; i++; }
      else if (ch === '$') { arity++; i++; }
      else                 { i++; }
    }
    const colonIdx = fullName.indexOf(':');
    const localName = colonIdx >= 0 ? fullName.slice(colonIdx + 1) : fullName;
    // Keep only the first declaration (duplicate-function check handles the rest)
    if (!localFuncs.has(`${localName}/${arity}`)) {
      localFuncs.set(`${localName}/${arity}`, { offset, arity });
    }
  }

  if (localFuncs.size === 0) return;

  // Parse all `import module … at "path"` statements from raw text
  const importRe =
    /\bimport\s+module\s+namespace\s+([\w\-]+)\s*=\s*"[^"]*"\s*at\s*"([^"]*)"/g;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(rawText)) !== null) {
    const prefix = m[1];
    const path   = m[2];

    const resolved = await resolveImportPath(path, doc.uri);
    if (!resolved) continue;

    const exports = await readModuleExports(resolved);
    if (!exports) continue;

    const importFileName = path.split('/').pop() ?? path;

    for (const key of exports.functions) {
      if (!localFuncs.has(key)) continue;

      const { offset, arity } = localFuncs.get(key)!;
      const localName = key.slice(0, key.lastIndexOf('/'));
      const qualifiedName = `${prefix}:${localName}`;
      const endOffset = offset + 'declare'.length;

      diags.push(makeDiag(doc, offset, endOffset,
        `Function '${qualifiedName}' with ${arity} parameter${arity !== 1 ? 's' : ''} ` +
        `is already declared in imported module '${importFileName}'`,
        vscode.DiagnosticSeverity.Error, 'cross-file-duplicate-function', stripped));
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 3 — C2: Cross-file unresolved function reference
// ---------------------------------------------------------------------------

/**
 * C2 — For calls `pfx:name(…)` where `pfx` is an imported module namespace,
 * reads the imported file and reports an error if no function named `name`
 * (any arity) is declared there.
 *
 * If the imported file cannot be resolved the call is silently skipped to
 * avoid false positives on modules that live outside the workspace.
 *
 * Only runs on save (file I/O).
 */
async function checkCrossFileUnresolvedFunctions(
  stripped: string, diags: vscode.Diagnostic[], doc: vscode.TextDocument,
): Promise<void> {
  const rawText = doc.getText();

  // Build prefix → import-path map (only imports that include an `at` path)
  const importMap = new Map<string, string>();
  const importRe =
    /\bimport\s+module\s+namespace\s+([\w\-]+)\s*=\s*"[^"]*"\s*at\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(rawText)) !== null) importMap.set(m[1], m[2]);

  if (importMap.size === 0) return;

  // Lazily resolve and cache exports per import path
  const exportsCache = new Map<string, ModuleExports | null>();
  async function getExports(path: string): Promise<ModuleExports | null> {
    if (exportsCache.has(path)) return exportsCache.get(path)!;
    const resolved = await resolveImportPath(path, doc.uri);
    const exports  = resolved ? await readModuleExports(resolved) : null;
    exportsCache.set(path, exports);
    return exports;
  }

  // Scan all qualified function calls: prefix:localName(
  const callRe = /\b([\w\-]+):([\w\-]+)\s*\(/g;
  callRe.lastIndex = 0;
  while ((m = callRe.exec(stripped)) !== null) {
    const prefix    = m[1];
    const localName = m[2];

    if (!importMap.has(prefix)) continue;

    // Skip function declaration headers: `declare … function prefix:name(`
    const before = stripped.slice(Math.max(0, m.index - 30), m.index);
    if (/\bfunction\s+$/.test(before)) continue;

    const path    = importMap.get(prefix)!;
    const exports = await getExports(path);
    if (!exports) continue; // file not found — do not false-positive

    // Accept any arity — we don't parse call-site argument counts
    const nameExists = [...exports.functions].some(
      key => key.slice(0, key.lastIndexOf('/')) === localName,
    );

    if (!nameExists) {
      const importFileName = path.split('/').pop() ?? path;
      const callEnd = m.index + prefix.length + 1 + localName.length;
      diags.push(makeDiag(doc, m.index, callEnd,
        `Cannot resolve function '${prefix}:${localName}' in imported module '${importFileName}'`,
        vscode.DiagnosticSeverity.Error, 'cross-file-unresolved-function', stripped));
    }
  }
}
