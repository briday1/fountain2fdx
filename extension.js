'use strict';

/**
 * VS Code extension entry point for fountain2fdx.
 *
 * Provides:
 *   - Command: "Fountain to FDX: Convert File"  (fountain2fdx.convertFile)
 *   - Explorer/editor context menu for .fountain files
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { fountain2fdx } = require('./src/index');

/**
 * Called by VS Code when the extension is activated.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const disposable = vscode.commands.registerCommand(
    'fountain2fdx.convertFile',
    async (uri) => {
      // Resolve the file URI from the command argument (context menu)
      // or fall back to the active text editor
      let fileUri = uri instanceof vscode.Uri ? uri : null;

      if (!fileUri) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          fileUri = editor.document.uri;
        }
      }

      if (!fileUri) {
        vscode.window.showErrorMessage(
          'fountain2fdx: No file selected. ' +
            'Open a .fountain file or right-click one in the Explorer.'
        );
        return;
      }

      const filePath = fileUri.fsPath;

      if (!filePath.endsWith('.fountain')) {
        vscode.window.showErrorMessage(
          `fountain2fdx: "${path.basename(filePath)}" is not a .fountain file.`
        );
        return;
      }

      let fountainText;
      try {
        fountainText = fs.readFileSync(filePath, 'utf8');
      } catch (err) {
        vscode.window.showErrorMessage(
          `fountain2fdx: Failed to read file: ${err.message}`
        );
        return;
      }

      let fdxContent;
      try {
        fdxContent = fountain2fdx(fountainText);
      } catch (err) {
        vscode.window.showErrorMessage(
          `fountain2fdx: Conversion failed: ${err.message}`
        );
        return;
      }

      const outputPath = filePath.replace(/\.fountain$/, '.fdx');

      try {
        fs.writeFileSync(outputPath, fdxContent, 'utf8');
      } catch (err) {
        vscode.window.showErrorMessage(
          `fountain2fdx: Failed to write output file: ${err.message}`
        );
        return;
      }

      const openFile = 'Open File';
      const choice = await vscode.window.showInformationMessage(
        `fountain2fdx: Converted to ${path.basename(outputPath)}`,
        openFile
      );

      if (choice === openFile) {
        try {
          const doc = await vscode.workspace.openTextDocument(outputPath);
          await vscode.window.showTextDocument(doc);
        } catch (err) {
          vscode.window.showErrorMessage(
            `fountain2fdx: Could not open output file: ${err.message}`
          );
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
