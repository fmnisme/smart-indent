import * as vscode from 'vscode';

// 用于跟踪插件状态的变量
let enabled = true;
// 存储上一次光标位置的变量
let lastPosition: vscode.Position | null = null;
// 存储当前文档的变量
let activeEditor: vscode.TextEditor | undefined;

/**
 * 获取适当的缩进级别
 * @param document 当前文档
 * @param lineNumber 当前行号
 * @returns 缩进字符串
 */
function getProperIndentation(document: vscode.TextDocument, lineNumber: number): string {
    // 如果是第一行，不缩进
    if (lineNumber === 0) {
        return '';
    }

    // 向上查找非空行
    let prevLineNumber = lineNumber - 1;
    while (prevLineNumber >= 0) {
        const prevLine = document.lineAt(prevLineNumber).text;
        if (prevLine.trim() !== '') {
            // 找到最近的非空行
            const indentMatch = prevLine.match(/^(\s*)/);
            const baseIndent = indentMatch ? indentMatch[1] : '';

            // 检查前一行是否需要增加缩进（以大括号、冒号等结尾）
            if (prevLine.trim().endsWith('{') ||
                prevLine.trim().endsWith(':') ||
                prevLine.trim().endsWith('(') ||
                prevLine.trim().endsWith('[')) {
                // 根据编辑器设置获取缩进单位
                const editorConfig = vscode.workspace.getConfiguration('editor');
                const indentSize = editorConfig.get<number>('tabSize', 4);
                const insertSpaces = editorConfig.get<boolean>('insertSpaces', true);

                if (insertSpaces) {
                    return baseIndent + ' '.repeat(indentSize);
                } else {
                    return baseIndent + '\t';
                }
            }
            return baseIndent;
        }
        prevLineNumber--;
    }

    // 如果没有找到非空行，不缩进
    return '';
}

/**
 * 应用自动缩进
 */
function applyAutoIndent() {
    if (!activeEditor || !enabled) {
        return;
    }

    const document = activeEditor.document;
    const selection = activeEditor.selection;

    // 获取当前行
    const currentLine = document.lineAt(selection.active.line);

    // 只有当当前行为空行时进行缩进
    if (currentLine.text.trim() === '') {
        const properIndentation = getProperIndentation(document, selection.active.line);

        // 检查当前行的缩进是否已经正确
        if (currentLine.text !== properIndentation) {
            // 应用缩进
            activeEditor.edit(editBuilder => {
                const range = new vscode.Range(
                    new vscode.Position(selection.active.line, 0),
                    new vscode.Position(selection.active.line, currentLine.text.length)
                );
                editBuilder.replace(range, properIndentation);
            });
        }
    }
}

/**
 * 当扩展被激活时调用
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('插件 "auto-indent" 已激活');

    // 保存当前活动的编辑器
    activeEditor = vscode.window.activeTextEditor;

    // 注册启用命令
    const enableCommand = vscode.commands.registerCommand('auto-indent.enableAutoIndent', () => {
        enabled = true;
        vscode.window.showInformationMessage('自动缩进已启用');
    });

    // 注册禁用命令
    const disableCommand = vscode.commands.registerCommand('auto-indent.disableAutoIndent', () => {
        enabled = false;
        vscode.window.showInformationMessage('自动缩进已禁用');
    });

    // 监听光标位置变化
    const cursorPositionListener = vscode.window.onDidChangeTextEditorSelection(event => {
        activeEditor = event.textEditor;

        // 只处理光标移动事件
        if (event.selections.length === 1 &&
            lastPosition &&
            event.selections[0].active.line !== lastPosition.line) {

            // 光标移动到了新行，应用自动缩进
            applyAutoIndent();
        }

        // 更新光标位置
        lastPosition = event.selections[0].active;
    });

    // 监听编辑器变化
    const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            lastPosition = editor.selection.active;
        }
    });

    // 将所有事件监听器添加到上下文中
    context.subscriptions.push(
        enableCommand,
        disableCommand,
        cursorPositionListener,
        activeEditorListener
    );
}

/**
 * 当扩展被停用时调用
 */
export function deactivate() { } 