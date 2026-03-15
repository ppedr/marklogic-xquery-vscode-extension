import * as vscode from 'vscode';
import { XQueryCompletionProvider } from './language/completionProvider';
import { XQueryHoverProvider } from './language/hoverProvider';
import { XQuerySignatureHelpProvider } from './language/signatureHelpProvider';
import { XQueryDefinitionProvider } from './language/definitionProvider';
import { XQueryDocumentSymbolProvider } from './language/documentSymbolProvider';
import { XQueryFoldingProvider } from './language/foldingProvider';
import { XQueryDiagnosticProvider } from './language/diagnosticProvider';

const XQUERY_SELECTOR: vscode.DocumentSelector = { language: 'xquery' };

export function activate(context: vscode.ExtensionContext): void {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('xquery');
  context.subscriptions.push(diagnosticCollection);

  const diagnosticProvider = new XQueryDiagnosticProvider(diagnosticCollection);

  // Run diagnostics on all already-open XQuery documents
  for (const doc of vscode.workspace.textDocuments) {
    diagnosticProvider.updateImmediate(doc);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(doc => {
      diagnosticProvider.updateImmediate(doc);
    }),

    vscode.workspace.onDidChangeTextDocument(event => {
      diagnosticProvider.triggerUpdate(event.document);
    }),

    vscode.workspace.onDidSaveTextDocument(doc => {
      diagnosticProvider.updateOnSave(doc);
    }),

    vscode.workspace.onDidCloseTextDocument(doc => {
      diagnosticProvider.clear(doc);
    }),

    vscode.languages.registerCompletionItemProvider(
      XQUERY_SELECTOR,
      new XQueryCompletionProvider(),
      ':', '$', '%'
    ),

    vscode.languages.registerHoverProvider(
      XQUERY_SELECTOR,
      new XQueryHoverProvider()
    ),

    vscode.languages.registerSignatureHelpProvider(
      XQUERY_SELECTOR,
      new XQuerySignatureHelpProvider(),
      '(', ','
    ),

    vscode.languages.registerDefinitionProvider(
      XQUERY_SELECTOR,
      new XQueryDefinitionProvider()
    ),

    vscode.languages.registerDocumentSymbolProvider(
      XQUERY_SELECTOR,
      new XQueryDocumentSymbolProvider()
    ),

    vscode.languages.registerFoldingRangeProvider(
      XQUERY_SELECTOR,
      new XQueryFoldingProvider()
    )
  );
}

export function deactivate(): void {}
