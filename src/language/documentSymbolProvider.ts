import * as vscode from 'vscode';

const FUNCTION_DECL  = /declare\s+(?:%[\w:]+\s+)*function\s+([\w\-]+(?::[\w\-]+)?)\s*\(/g;
const VARIABLE_DECL  = /declare\s+(?:%[\w:]+\s+)*variable\s+\$([\w\-:]+)/g;
const MODULE_DECL    = /module\s+namespace\s+([\w\-]+)\s*=/g;
const IMPORT_MODULE  = /import\s+module\s+namespace\s+([\w\-]+)\s*=/g;

interface PatternConfig {
  pattern: RegExp;
  kind: vscode.SymbolKind;
  detail: string;
}

const PATTERNS: PatternConfig[] = [
  { pattern: FUNCTION_DECL, kind: vscode.SymbolKind.Function,  detail: 'function'  },
  { pattern: VARIABLE_DECL, kind: vscode.SymbolKind.Variable,  detail: 'variable'  },
  { pattern: MODULE_DECL,   kind: vscode.SymbolKind.Module,    detail: 'module'    },
  { pattern: IMPORT_MODULE, kind: vscode.SymbolKind.Namespace, detail: 'namespace' },
];

export class XQueryDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {
    const text = document.getText();
    const symbols: vscode.DocumentSymbol[] = [];

    for (const { pattern, kind, detail } of PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(text)) !== null) {
        const name = match[1];
        const matchStart = document.positionAt(match.index);
        const matchEnd = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(matchStart, matchEnd);

        symbols.push(new vscode.DocumentSymbol(name, detail, kind, range, range));
      }
    }

    symbols.sort((a, b) => a.range.start.compareTo(b.range.start));
    return symbols;
  }
}
