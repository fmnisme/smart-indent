import * as vscode from 'vscode';

// 用于跟踪插件状态的变量
let enabled = true;
// 存储上一次光标位置的变量
let lastPosition: vscode.Position | null = null;
// 存储当前文档的变量
let activeEditor: vscode.TextEditor | undefined;
// 存储上一次行内容的映射，用于检测VSCode自动缩进是否生效
let lastLineContents = new Map<number, string>();
// 存储是否处于回车键事件的标志
let enterKeyPressed = false;
// 新增：用于调试的输出通道
let outputChannel: vscode.OutputChannel;

/**
 * 检查当前是否处于vim编辑模式
 * @returns 是否处于vim模式
 */
function isVimMode(): boolean {
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
 * 检查当前是否处于Vim Normal模式
 * @returns Promise<boolean> 是否处于Vim Normal模式
 */
async function isInVimNormalMode(): Promise<boolean> {
    if (outputChannel) {
        outputChannel.appendLine('[SmartIndent Debug] Checking isInVimNormalMode...');
        const allExtensions = vscode.extensions.all.map(ext => ext.id);
        outputChannel.appendLine('[SmartIndent Debug] All available extension IDs at this moment: ' + JSON.stringify(allExtensions));
    } else {
        console.error('[SmartIndent Debug] Cannot log isInVimNormalMode check.')
    }

    const VIM_EXTENSION_ID = 'vscodevim.vim'; // 使用常量

    const vimExtension = vscode.extensions.getExtension(VIM_EXTENSION_ID);

    if (!vimExtension) {
        if (outputChannel) {
            outputChannel.appendLine(`[SmartIndent Debug] ${VIM_EXTENSION_ID} extension not found directly.`);
        }
        // 如果直接获取不到，再等一小段时间看看是否会出现（处理可能的激活延迟）
        // 这是一种妥协，更健壮的是监听 onDidChange 事件
        await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms
        const vimExtensionAgain = vscode.extensions.getExtension(VIM_EXTENSION_ID);
        if (!vimExtensionAgain) {
            if (outputChannel) {
                outputChannel.appendLine(`[SmartIndent Debug] ${VIM_EXTENSION_ID} extension still not found after 500ms delay.`);
            }
            return false; // 彻底找不到，则认为不在 Vim Normal 模式
        }
        // 如果延迟后找到了，则继续使用 vimExtensionAgain
        if (outputChannel) {
            outputChannel.appendLine(`[SmartIndent Debug] ${VIM_EXTENSION_ID} extension found after 500ms delay.`);
        }
        return await checkVimExports(vimExtensionAgain); // 调用新的辅助函数
    }

    // 如果直接找到了，则继续检查
    if (outputChannel) {
        outputChannel.appendLine(`[SmartIndent Debug] ${VIM_EXTENSION_ID} extension found directly.`);
    }
    return await checkVimExports(vimExtension); // 调用新的辅助函数
}

// 新的辅助函数，用于处理激活和检查 exports
async function checkVimExports(vimExtension: vscode.Extension<any>): Promise<boolean> {
    const VIM_EXTENSION_ID = vimExtension.id; // 从传入的 extension 对象获取 ID

    if (!vimExtension.isActive) {
        if (outputChannel) {
            outputChannel.appendLine(`[SmartIndent Debug] ${VIM_EXTENSION_ID} is not active. Attempting to activate...`);
        }
        try {
            await vimExtension.activate();
            // 激活后稍作等待，确保 exports 可用
            await new Promise(resolve => setTimeout(resolve, 200));
            if (outputChannel) {
                outputChannel.appendLine(`[SmartIndent Debug] ${VIM_EXTENSION_ID} activated.`);
            }
        } catch (activationError) {
            if (outputChannel) {
                outputChannel.appendLine(`[SmartIndent Debug] Failed to activate ${VIM_EXTENSION_ID}: ` + JSON.stringify(activationError));
            }
            return false; // 激活失败
        }
    }

    // 再次检查激活状态，因为 activate() 是异步的
    if (!vimExtension.isActive) {
        if (outputChannel) {
            outputChannel.appendLine(`[SmartIndent Debug] ${VIM_EXTENSION_ID} still not active after attempt. Assuming not in Vim mode for safety.`);
        }
        return false;
    }

    const vimExports = vimExtension.exports;
    if (outputChannel) {
        outputChannel.appendLine(`[SmartIndent Debug] --- ${VIM_EXTENSION_ID} exports --- START ---`);
        try {
            outputChannel.appendLine(JSON.stringify(vimExports, null, 2));
        } catch (stringifyError) {
            outputChannel.appendLine('[SmartIndent Debug] Failed to stringify vimExports: ' + stringifyError);
            outputChannel.appendLine('[SmartIndent Debug] vimExports (raw): ' + vimExports);
        }
        outputChannel.appendLine(`[SmartIndent Debug] --- ${VIM_EXTENSION_ID} exports --- END ---`);
    }

    if (vimExports && vimExports.mode) {
        const currentMode = vimExports.mode;
        if (outputChannel) {
            outputChannel.appendLine(`[SmartIndent Debug] Found ${VIM_EXTENSION_ID} exports.mode: ${currentMode} (type: ${typeof currentMode})`);
        }
        return typeof currentMode === 'string' && currentMode.toLowerCase() === 'normal';
    } else if (vimExports && vimExports.vimState && vimExports.vimState.mode) {
        const currentMode = vimExports.vimState.mode;
        if (outputChannel) {
            outputChannel.appendLine(`[SmartIndent Debug] Found ${VIM_EXTENSION_ID} exports.vimState.mode: ${currentMode} (type: ${typeof currentMode})`);
        }
        return typeof currentMode === 'string' && currentMode.toLowerCase() === 'normal';
    } else {
        if (vimExports) {
            if (outputChannel) {
                outputChannel.appendLine(`[SmartIndent Debug] ${VIM_EXTENSION_ID} exports keys: ` + Object.keys(vimExports));
            }
        } else {
            if (outputChannel) {
                outputChannel.appendLine(`[SmartIndent Debug] ${VIM_EXTENSION_ID} exports is null or undefined.`);
            }
        }
    }

    if (outputChannel) {
        outputChannel.appendLine(`[SmartIndent Debug] Could not determine Vim mode from ${VIM_EXTENSION_ID} exports. Assuming not Normal.`);
    }
    return false;
}

/**
 * 应用自动缩进 (修改为异步函数)
 */
async function applyAutoIndent() {
    if (outputChannel) {
        outputChannel.appendLine('[SmartIndent Debug] Entering applyAutoIndent'); // 输出到通道
    } else {
        console.error('[SmartIndent Debug] Cannot log entering applyAutoIndent (no output channel).');
    }
    if (!activeEditor || !enabled) {
        if (outputChannel) {
            outputChannel.appendLine('[SmartIndent Debug] applyAutoIndent exiting: No active editor or disabled.'); // 输出到通道
        } else {
            console.error('[SmartIndent Debug] Cannot log applyAutoIndent exit: no active editor (no output channel).')
        }
        return;
    }

    // 新增：检查是否处于 Vim Normal 模式
    if (await isInVimNormalMode()) {
        if (outputChannel) {
            outputChannel.appendLine('[SmartIndent Debug] applyAutoIndent exiting: Vim Normal mode detected.'); // 输出到通道
        } else {
            console.error('[SmartIndent Debug] Cannot log applyAutoIndent exit: vim normal mode (no output channel).')
        }
        return; // 如果在 Normal 模式，则不执行任何操作
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
    const currentLine = document.lineAt(selection.active.line);

    // 首先检查是否需要应用自定义缩进
    if (shouldApplyCustomIndent(document, selection.active.line)) {
        const properIndentation = getProperIndentation(document, selection.active.line);

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

/**
 * 当扩展被激活时调用
 */
export function activate(context: vscode.ExtensionContext) {
    let activationMessage = 'Smart Indent Activating!';
    try {
        // 重新尝试创建输出通道
        outputChannel = vscode.window.createOutputChannel("Smart Indent Debug");
        context.subscriptions.push(outputChannel);
        outputChannel.appendLine('[SmartIndent Debug] Output channel created successfully.'); // 确认通道创建
        activationMessage = 'Smart Indent Activated & Output Channel Created!';
    } catch (error) {
        activationMessage = 'Smart Indent ERROR: Failed to create output channel!';
        console.error(activationMessage, error); // 同时在控制台打印错误
        // 如果通道创建失败，后续的 appendLine 会出错，这里可以选择禁用插件或提前返回
    }

    // vscode.window.showInformationMessage(activationMessage); // 显示激活状态或错误

    // 如果通道未成功创建，后续代码可能会出错，但为了调试我们暂时让它继续
    if (outputChannel) {
        outputChannel.appendLine('[SmartIndent Debug] Activating extension...'); // 输出到通道
    } else {
        console.error('[SmartIndent Debug] Cannot log to output channel because it failed to create.');
    }

    // vscode.window.showInformationMessage('Smart Indent Activating!'); // 可以暂时注释掉这个通知了

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

    if (outputChannel) {
        outputChannel.appendLine('[SmartIndent Debug] Registered enable/disable commands.'); // 输出到通道
    } else {
        console.error('[SmartIndent Debug] Cannot log registered commands (no output channel).');
    }

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
                if (outputChannel) {
                    outputChannel.appendLine('[SmartIndent Debug] Enter key detected in onDidChangeTextDocument.'); // 输出到通道
                } else {
                    console.error('[SmartIndent Debug] Cannot log enter key detected (no output channel).')
                }

                // 设置延时，给VSCode自动缩进一些时间生效
                setTimeout(async () => {
                    if (activeEditor && enabled) {
                        await applyAutoIndent();
                    }
                    enterKeyPressed = false;
                }, 50);

                break;
            }
        }
    });
    if (outputChannel) {
        outputChannel.appendLine('[SmartIndent Debug] Registered onDidChangeTextDocument listener.'); // 输出到通道
    } else {
        console.error('[SmartIndent Debug] Cannot log registered text document listener (no output channel).');
    }

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
            event.selections[0].active.line !== lastPosition.line &&
            event.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {

            if (outputChannel) {
                outputChannel.appendLine('[SmartIndent Debug] Cursor moved to new line by keyboard/command in onDidChangeTextEditorSelection.');
            } else {
                console.error('[SmartIndent Debug] Cannot log cursor moved (no output channel).');
            }
            // 光标移动到了新行（非鼠标点击），应用自动缩进
            // 设置短暂延时，以确保在VSCode的自动缩进之后运行
            setTimeout(async () => {
                await applyAutoIndent();
            }, 10);
        }

        // 更新光标位置
        lastPosition = event.selections[0].active;
    });
    if (outputChannel) {
        outputChannel.appendLine('[SmartIndent Debug] Registered onDidChangeTextEditorSelection listener.'); // 输出到通道
    } else {
        console.error('[SmartIndent Debug] Cannot log registered selection listener (no output channel).');
    }

    // 监听编辑器变化
    const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            lastPosition = editor.selection.active;
        }
    });
    if (outputChannel) {
        outputChannel.appendLine('[SmartIndent Debug] Registered onDidChangeActiveTextEditor listener.'); // 输出到通道
    } else {
        console.error('[SmartIndent Debug] Cannot log registered active editor listener (no output channel).');
    }

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