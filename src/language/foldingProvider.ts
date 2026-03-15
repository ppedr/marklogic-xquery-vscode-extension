import * as vscode from 'vscode';

export class XQueryFoldingProvider implements vscode.FoldingRangeProvider {
  provideFoldingRanges(
    _document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    return [];
  }
}
