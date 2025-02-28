# Smart Indent

这是一个实用的VS Code扩展，当光标移动到空行时自动应用正确的缩进。解决在空行间移动需要按Tab键手动缩进而意外触发AI代码补全的问题。

*中文 | [English](README_EN.md)*

## 主要优势

- **避免AI干扰**：无需按Tab键手动缩进，减少触发AI代码补全的机会
- **光标移动即缩进**：当光标移动到空行时自动缩进到正确位置
- **回车创建新行自动缩进**：在按回车创建新行时自动缩进到正确位置
- **智能大括号处理**：自动处理大括号（`{` 和 `}`）的正确缩进
- **根据上下文精准缩进**：基于前一个非空行的级别和特殊字符决定缩进
- **语言特定优化**：特别优化了Go语言函数定义后的自动缩进
- **尊重编辑器设置**：完全遵循VS Code的缩进设置（空格/制表符）

## 使用场景

此扩展特别适合：

- **使用AI代码补全工具的开发者**：避免缩进操作误触发代码补全
- **注重代码整洁度的程序员**：自动保持一致的缩进，无需手动干预
- **多人协作项目**：确保团队代码缩进格式一致
- **频繁编辑代码的场景**：提高编码效率，专注于逻辑而非格式

## 工作原理

安装后，插件默认启用。以下情况会触发自动缩进：

1. 当您在编辑器中上下移动光标到空行时
2. 当您按回车键创建新行时（特别适用于函数定义等场景）
3. 当您在大括号处按回车时，新的大括号行和右大括号都会自动缩进到正确位置

插件会自动检测上下文并应用适当的缩进级别，无需任何手动干预。

### 命令

此扩展提供了以下命令，可在命令面板中访问（按F1或Ctrl+Shift+P）：

- `启用智能缩进`: 启用自动缩进功能
- `禁用智能缩进`: 禁用自动缩进功能

## 语言特定支持

- **Go语言**: 
  - 特别优化了函数定义后的自动缩进
  - 当在函数签名行按回车时，新行会自动缩进
  - 在函数定义后的大括号处按回车，会自动处理左右大括号的缩进

## 注意事项

- 此插件仅在编辑模式下工作
- 空行和大括号行会被自动缩进
- 当光标在多个非空行之间移动时不会触发缩进（除大括号外）

## 问题反馈

如有问题或建议，请在GitHub仓库提交issue。

## 许可证

MIT 