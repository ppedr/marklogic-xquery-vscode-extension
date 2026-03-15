import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// ── Patterns ──────────────────────────────────────────────────────────────

// declare [annotations] [private] function ns:name(
const FUNCTION_DECL =
  /declare\s+(?:%[\w:]+\s+)*(?:private\s+)?function\s+([\w\-]+(?::[\w\-]+)?)\s*\(/g;

// declare [annotations] variable $name
const VARIABLE_DECL =
  /declare\s+(?:%[\w:]+\s+)*variable\s+\$([\w\-:]+)/g;

// let $name  |  for $name
const BINDING_DECL =
  /(?:let|for)\s+\$([\w\-:]+)/g;

// import module namespace pfx = "uri" at "path"
const IMPORT_AT =
  /import\s+module\s+namespace\s+([\w\-]+)\s*=\s*(?:"[^"]*"|'[^']*')\s+at\s+(?:"([^"]*)"|'([^']*)')/g;

// ── Helpers ───────────────────────────────────────────────────────────────

/** Return the word (including hyphens and one colon) under the cursor. */
function wordAt(document: vscode.TextDocument, position: vscode.Position): string {
  const range = document.getWordRangeAtPosition(position, /[\w\-]+(?::[\w\-]+)?/);
  return range ? document.getText(range) : '';
}

/**
 * If the cursor sits on a `$name` variable reference, return the name
 * (without the `$`), otherwise null.
 */
function variableNameAt(document: vscode.TextDocument, position: vscode.Position): string | null {
  const line = document.lineAt(position.line).text;
  const col  = position.character;

  const tokenRe = /\$([\w\-:]+)/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(line)) !== null) {
    const dollarCol = m.index;
    const endCol    = m.index + m[0].length;
    if (col >= dollarCol && col <= endCol) {
      return m[1];
    }
  }
  return null;
}

/**
 * If the cursor sits on the namespace prefix token of an
 * `import module namespace pfx = …` line, return that prefix.
 */
function importPrefixAt(document: vscode.TextDocument, position: vscode.Position): string | null {
  const line = document.lineAt(position.line).text;
  const m    = /import\s+module\s+namespace\s+([\w\-]+)/.exec(line);
  if (!m) { return null; }
  const prefixStart = line.indexOf(m[1], m.index);
  const prefixEnd   = prefixStart + m[1].length;
  if (position.character >= prefixStart && position.character <= prefixEnd) {
    return m[1];
  }
  return null;
}

/** Build a vscode.Location pointing at the first character of a regex match. */
function locationFromMatch(
  document: vscode.TextDocument,
  matchIndex: number
): vscode.Location {
  const pos = document.positionAt(matchIndex);
  return new vscode.Location(document.uri, pos);
}

/**
 * Resolve a namespace prefix to an absolute filesystem path by reading the
 * `import module namespace pfx = … at "path"` statement in `document`.
 *
 * Two cases for the `at` path:
 *
 *  • Relative path ("../foo.xqy"):
 *      Resolve against the document directory, then workspace folder roots.
 *
 *  • Server-absolute path ("/tpms/specification/foo.xqy"):
 *      MarkLogic server-absolute paths are relative to the modules root, not
 *      the OS root.  We don't know the modules root, so we walk up the
 *      directory tree from the calling file, trying each ancestor as the
 *      candidate modules root, until the file is found.
 *      We also try every workspace folder root as a fallback.
 */
function resolveImportPath(document: vscode.TextDocument, prefix: string): string | null {
  const text = document.getText();
  IMPORT_AT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMPORT_AT.exec(text)) !== null) {
    if (m[1] !== prefix) { continue; }

    const atPath = m[2] ?? m[3];
    if (!atPath) { continue; }

    const docDir = path.dirname(document.uri.fsPath);

    if (!atPath.startsWith('/') && !atPath.startsWith('\\')) {
      // ── Relative path ────────────────────────────────────────────────
      const candidates = [path.resolve(docDir, atPath)];
      for (const folder of vscode.workspace.workspaceFolders ?? []) {
        candidates.push(path.resolve(folder.uri.fsPath, atPath));
      }
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) { return candidate; }
      }
    } else {
      // ── Server-absolute path — walk up from the document's directory ─
      // Strip the leading slash so we can join it with candidate roots.
      const rel = atPath.replace(/^[/\\]/, '');

      // Collect candidate roots: ancestors of the calling file + workspace roots
      const roots: string[] = [];
      let dir = docDir;
      while (true) {
        roots.push(dir);
        const parent = path.dirname(dir);
        if (parent === dir) { break; }  // reached the filesystem root
        dir = parent;
      }
      for (const folder of vscode.workspace.workspaceFolders ?? []) {
        roots.push(folder.uri.fsPath);
      }

      for (const root of roots) {
        const candidate = path.join(root, rel);
        if (fs.existsSync(candidate)) { return candidate; }
      }
    }
  }
  return null;
}

// ── Resolution steps ──────────────────────────────────────────────────────

/**
 * Search `text` for a `declare function` whose local name (the part after
 * the colon, or the whole name if unqualified) matches `localName`.
 * Returns the match index, or -1 if not found.
 */
function findFunctionDeclIndex(text: string, localName: string): number {
  FUNCTION_DECL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FUNCTION_DECL.exec(text)) !== null) {
    const declaredName  = m[1];                           // e.g. "utils:do-something" or "do-something"
    const colonIdx      = declaredName.indexOf(':');
    const declLocalName = colonIdx >= 0
      ? declaredName.slice(colonIdx + 1)
      : declaredName;
    if (declLocalName === localName) {
      return m.index;
    }
  }
  return -1;
}

/**
 * 1. Function call → declaration.
 *    Resolution order:
 *      a. Same file — match full qualified name (handles local:name calls)
 *      b. Imported file — when `word` has a namespace prefix, find the import
 *         that maps that prefix to a file, then match by local name in that file.
 */
async function resolveFunction(
  document: vscode.TextDocument,
  word: string
): Promise<vscode.Location | null> {
  const text = document.getText();

  // (a) Same-file search — match full qualified name
  FUNCTION_DECL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FUNCTION_DECL.exec(text)) !== null) {
    if (m[1] === word) {
      return locationFromMatch(document, m.index);
    }
  }

  // (b) Cross-file search — only when the call is prefix:localName
  const colonIdx = word.indexOf(':');
  if (colonIdx < 0) { return null; }

  const callPrefix    = word.slice(0, colonIdx);
  const callLocalName = word.slice(colonIdx + 1);

  const targetFsPath = resolveImportPath(document, callPrefix);
  if (!targetFsPath) { return null; }

  const targetContent = fs.readFileSync(targetFsPath, 'utf8');
  const declIndex     = findFunctionDeclIndex(targetContent, callLocalName);
  if (declIndex < 0) { return null; }

  // Convert character offset to a line/col position inside the target file
  const before   = targetContent.slice(0, declIndex);
  const line     = before.split('\n').length - 1;
  const lastNl   = before.lastIndexOf('\n');
  const col      = declIndex - (lastNl + 1);
  const targetUri = vscode.Uri.file(targetFsPath);
  return new vscode.Location(targetUri, new vscode.Position(line, col));
}

/**
 * 2a. Variable reference → declare variable $name anywhere in file.
 */
function resolveVariableDecl(
  document: vscode.TextDocument,
  name: string
): vscode.Location | null {
  const text = document.getText();
  VARIABLE_DECL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = VARIABLE_DECL.exec(text)) !== null) {
    if (m[1] === name) {
      return locationFromMatch(document, m.index);
    }
  }
  return null;
}

/**
 * 2b. Variable reference → nearest let/for binding *above* the cursor.
 */
function resolveBinding(
  document: vscode.TextDocument,
  position: vscode.Position,
  name: string
): vscode.Location | null {
  const upTo = document.offsetAt(position);
  const text = document.getText().slice(0, upTo);
  BINDING_DECL.lastIndex = 0;
  let last: vscode.Location | null = null;
  let m: RegExpExecArray | null;
  while ((m = BINDING_DECL.exec(text)) !== null) {
    if (m[1] === name) {
      last = locationFromMatch(document, m.index);
    }
  }
  return last;
}

/**
 * 3. Import module prefix → open the `at "path"` file at line 0.
 *    This path is triggered only when the cursor is on the prefix token
 *    of the import line itself.
 */
async function resolveImportAt(
  document: vscode.TextDocument,
  prefix: string
): Promise<vscode.Location | null> {
  const targetFsPath = resolveImportPath(document, prefix);
  if (!targetFsPath) { return null; }
  return new vscode.Location(vscode.Uri.file(targetFsPath), new vscode.Position(0, 0));
}

// ── Provider ──────────────────────────────────────────────────────────────

export class XQueryDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Definition | null> {

    // 3. Import module prefix → at "path"
    const importPrefix = importPrefixAt(document, position);
    if (importPrefix) {
      return resolveImportAt(document, importPrefix);
    }

    // 2. Variable reference $name
    const varName = variableNameAt(document, position);
    if (varName) {
      return (
        resolveBinding(document, position, varName) ??
        resolveVariableDecl(document, varName)
      );
    }

    // 1. Function call — same file first, then imported file
    const word = wordAt(document, position);
    if (word) {
      return resolveFunction(document, word);
    }

    return null;
  }
}
