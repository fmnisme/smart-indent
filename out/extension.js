"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
// 用于跟踪插件状态的变量
let enabled = true;
// 存储上一次光标位置的变量
let lastPosition = null;
// 存储当前文档的变量
let activeEditor;
// 存储上一次行内容的映射，用于检测VSCode自动缩进是否生效
let lastLineContents = new Map();
// 存储是否处于回车键事件的标志
let enterKeyPressed = false;
/**
 * 检查当前是否处于vim编辑模式
 * @returns 是否处于vim模式
 */
function isVimMode() {
    // 检查vscodevim扩展是否激活
    const vimExtension = vscode.extensions.getExtension('vscodevim.vim');
    if (vimExtension && vimExtension.isActive) {
        return true;
    }
    // 检查其他可能的vim扩展
    const amVimExtension = vscode.extensions.getExtension('auiworks.amvim');
    if (amVimExtension && amVimExtension.isActive) {
        return true;
    }
    return false;
}
/**
 * 获取适当的缩进级别
 * @param document 当前文档
 * @param lineNumber 当前行号
 * @returns 缩进字符串
 */
function getProperIndentation(document, lineNumber) {
    // 如果是第一行，不缩进
    if (lineNumber === 0) {
        return '';
    }
    // 获取编辑器配置
    const editorConfig = vscode.workspace.getConfiguration('editor');
    const indentSize = editorConfig.get('tabSize', 4);
    const insertSpaces = editorConfig.get('insertSpaces', true);
    // 定义一个缩进单位
    const indentUnit = insertSpaces ? ' '.repeat(indentSize) : '\t';
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
                return baseIndent + indentUnit;
            }
            return baseIndent;
        }
        prevLineNumber--;
    }
    // 如果没有找到非空行，不缩进
    return '';
}
/**
 * 检查VSCode自动缩进是否已经生效
 * @param document 当前文档
 * @param lineNumber 当前行号
 * @returns 是否需要应用自定义缩进
 */
function shouldApplyCustomIndent(document, lineNumber) {
    // 获取当前行
    const currentLine = document.lineAt(lineNumber).text;
    // 如果当前行不为空且不仅包含空白字符，说明用户已经开始输入，不应用自定义缩进
    if (currentLine.trim() !== '') {
        return false;
    }
    // 获取期望的缩进
    const properIndentation = getProperIndentation(document, lineNumber);
    // 检查VSCode是否已经应用了正确的缩进
    // 只有当当前行的内容与期望的缩进不同时，才应用自定义缩进
    // 注意：前导空格数量不一致才需要调整
    return currentLine !== properIndentation;
}
/**
 * 应用自动缩进
 */
function applyAutoIndent() {
    if (!activeEditor || !enabled) {
        return;
    }
    const document = activeEditor.document;
    const uri = document.uri;
    // 1. 基础协议检查
    if (uri.scheme !== 'file' && uri.scheme !== 'untitled') {
        return; // 如果不是普通文件或未保存文件，则退出
    }
    // 2. 检查是否为 Go 模块依赖或不在工作区内
    const filePath = uri.fsPath; // 获取文件系统路径
    const isGoModDependency = filePath.includes('/pkg/mod/') || filePath.includes('/vendor/');
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (isGoModDependency || !workspaceFolder) {
        // 如果路径包含 Go 模块特征 或 文件不属于任何工作区文件夹，则退出
        return;
    }
    // 如果处于vim模式，不应用自动缩进
    if (isVimMode()) {
        return;
    }
    const selection = activeEditor.selection;
    const currentLine = document.lineAt(selection.active.line);
    // 首先检查是否需要应用自定义缩进
    if (shouldApplyCustomIndent(document, selection.active.line)) {
        const properIndentation = getProperIndentation(document, selection.active.line);
        // 应用缩进
        activeEditor.edit(editBuilder => {
            const range = new vscode.Range(new vscode.Position(selection.active.line, 0), new vscode.Position(selection.active.line, currentLine.text.length));
            editBuilder.replace(range, properIndentation);
        });
    }
}
/**
 * 当扩展被激活时调用
 */
function activate(context) {
    console.log('插件 "smart-indent" 已激活');
    // 保存当前活动的编辑器
    activeEditor = vscode.window.activeTextEditor;
    // 注册启用命令
    const enableCommand = vscode.commands.registerCommand('smart-indent.enableAutoIndent', () => {
        enabled = true;
        vscode.window.showInformationMessage('智能缩进已启用');
    });
    // 注册禁用命令
    const disableCommand = vscode.commands.registerCommand('smart-indent.disableAutoIndent', () => {
        enabled = false;
        vscode.window.showInformationMessage('智能缩进已禁用');
    });
    // 监听键盘输入事件，检测回车键
    const typeListener = vscode.workspace.onDidChangeTextDocument(event => {
        if (!activeEditor || event.document !== activeEditor.document) {
            return;
        }
        // 如果处于vim模式，不应用自动缩进
        if (isVimMode()) {
            return;
        }
        // 检查是否有换行符的变化
        for (const change of event.contentChanges) {
            if (change.text.includes('\n') || change.text.includes('\r')) {
                enterKeyPressed = true;
                // 设置延时，给VSCode自动缩进一些时间生效
                setTimeout(() => {
                    if (activeEditor && enabled && !isVimMode()) {
                        applyAutoIndent();
                    }
                    enterKeyPressed = false;
                }, 50); // 增加延时到50毫秒，给VSCode更多时间应用自动缩进
                break;
            }
        }
    });
    // 监听光标位置变化
    const cursorPositionListener = vscode.window.onDidChangeTextEditorSelection(event => {
        activeEditor = event.textEditor;
        // 如果处于vim模式，不应用自动缩进
        if (isVimMode()) {
            return;
        }
        // 只有在非回车键事件且光标移动到新行时，才考虑应用自动缩进
        if (!enterKeyPressed &&
            event.selections.length === 1 &&
            lastPosition &&
            event.selections[0].active.line !== lastPosition.line) {
            // 光标移动到了新行，应用自动缩进
            // 设置短暂延时，以确保在VSCode的自动缩进之后运行
            setTimeout(() => {
                if (!isVimMode()) {
                    applyAutoIndent();
                }
            }, 10); // 增加到50毫秒，与回车键事件的延时保持一致
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
    context.subscriptions.push(enableCommand, disableCommand, typeListener, cursorPositionListener, activeEditorListener);
}
/**
 * 当扩展被停用时调用
 */
function deactivate() { }
//# sourceMappingURL=extension.js.map