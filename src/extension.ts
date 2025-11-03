import * as vscode from 'vscode';

// 延迟常量 - 让 VS Code 的内置缩进先生效
const INDENT_DELAY_AFTER_ENTER = 50; // 回车后延迟（ms）- VS Code 需要更多时间处理回车
const INDENT_DELAY_AFTER_CURSOR_MOVE = 10; // 光标移动后延迟（ms）

// 用于跟踪插件状态的变量
let enabled = true;
// 存储上一次光标位置的变量
let lastPosition: vscode.Position | null = null;
// 存储当前文档的变量
let activeEditor: vscode.TextEditor | undefined;
// 存储是否处于回车键事件的标志
let enterKeyPressed = false;

// Vim 扩展缓存
let vimExtensionCache: vscode.Extension<any> | null | undefined = undefined;

/**
 * 检查当前是否处于 Vim Normal/Visual 模式（应该禁用自动缩进）
 * 在 Insert 模式下返回 false（允许自动缩进）
 * @returns 是否应该禁用自动缩进
 */
function shouldDisableForVim(): boolean {
    // 第一次检查或缓存未初始化
    if (vimExtensionCache === undefined) {
        vimExtensionCache = vscode.extensions.getExtension('vscodevim.vim')
                         || vscode.extensions.getExtension('auiworks.amvim')
                         || null;
    }

    // 没有安装 Vim 扩展
    if (!vimExtensionCache) {
        return false;
    }

    // Vim 扩展未激活
    if (!vimExtensionCache.isActive) {
        return false;
    }

    // 尝试获取当前模式
    const exports = vimExtensionCache.exports;
    if (!exports) {
        return false;
    }

    // 检查 vscodevim 的导出格式
    let currentMode: string | undefined;
    if (exports.mode) {
        currentMode = exports.mode;
    } else if (exports.vimState && exports.vimState.mode) {
        currentMode = exports.vimState.mode;
    }

    if (!currentMode) {
        return false;
    }

    // 只在 Normal、Visual 等非编辑模式下禁用
    // Insert 模式下允许自动缩进
    const mode = currentMode.toLowerCase();
    return mode === 'normal' || mode === 'visual' || mode === 'visualline' || mode === 'visualblock';
}

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

    // 获取编辑器配置
    const editorConfig = vscode.workspace.getConfiguration('editor');
    const indentSize = editorConfig.get<number>('tabSize', 4);
    const insertSpaces = editorConfig.get<boolean>('insertSpaces', true);

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
function shouldApplyCustomIndent(document: vscode.TextDocument, lineNumber: number): boolean {
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

    // 检查是否应该因为 Vim 模式而禁用
    if (shouldDisableForVim()) {
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

    const selection = activeEditor.selection;
    const lineNumber = selection.active.line;

    // 首先检查是否需要应用自定义缩进
    if (!shouldApplyCustomIndent(document, lineNumber)) {
        return;
    }

    const properIndentation = getProperIndentation(document, lineNumber);

    // 应用缩进 - 使用更安全的方式
    activeEditor.edit(editBuilder => {
        // 再次检查行是否仍然为空（防止用户在延迟期间输入）
        const currentLine = document.lineAt(lineNumber);
        if (currentLine.text.trim() !== '') {
            return; // 用户已经开始输入，不应用缩进
        }

        // 只替换行首的空白字符
        const leadingWhitespaceLength = currentLine.text.length - currentLine.text.trimStart().length;
        const range = new vscode.Range(
            new vscode.Position(lineNumber, 0),
            new vscode.Position(lineNumber, leadingWhitespaceLength)
        );
        editBuilder.replace(range, properIndentation);
    }, {
        undoStopBefore: false,
        undoStopAfter: false
    }).then(success => {
        if (success) {
            // 将光标移动到缩进后的位置
            const newPosition = new vscode.Position(lineNumber, properIndentation.length);
            activeEditor!.selection = new vscode.Selection(newPosition, newPosition);
        }
    });
}

/**
 * 当扩展被激活时调用
 */
export function activate(context: vscode.ExtensionContext) {
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

        // 如果处于 Vim 非编辑模式，不应用自动缩进
        if (shouldDisableForVim()) {
            return;
        }

        // 检查是否有换行符的变化
        for (const change of event.contentChanges) {
            if (change.text.includes('\n') || change.text.includes('\r')) {
                enterKeyPressed = true;

                // 设置延时，给VSCode自动缩进一些时间生效
                setTimeout(() => {
                    if (activeEditor && enabled) {
                        applyAutoIndent();
                    }
                    enterKeyPressed = false;
                }, INDENT_DELAY_AFTER_ENTER);

                break;
            }
        }
    });

    // 监听光标位置变化
    const cursorPositionListener = vscode.window.onDidChangeTextEditorSelection(event => {
        activeEditor = event.textEditor;

        // 只有在非回车键事件且光标移动到新行时，才考虑应用自动缩进
        // 注意：先检查再更新 lastPosition
        if (!shouldDisableForVim() &&  // 不在 Vim 非编辑模式下
            !enterKeyPressed &&
            event.selections.length === 1 &&
            lastPosition &&
            event.selections[0].active.line !== lastPosition.line &&
            event.kind === vscode.TextEditorSelectionChangeKind.Keyboard) { // 只响应键盘导航

            // 光标移动到了新行（键盘导航），应用自动缩进
            // 设置短暂延时，以确保在VSCode的自动缩进之后运行
            setTimeout(() => {
                applyAutoIndent();
            }, INDENT_DELAY_AFTER_CURSOR_MOVE);
        }

        // ⚠️ 重要：始终更新光标位置，即使不触发自动缩进
        // 这样在 Vim 模式切换后（如 Normal → Insert）才能正确检测光标移动
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
        typeListener,
        cursorPositionListener,
        activeEditorListener
    );
}

/**
 * 当扩展被停用时调用
 */
export function deactivate() { } 