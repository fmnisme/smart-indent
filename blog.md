# 零基础、零代码：我如何用Cursor + Claude Sonnet 3.7一小时打造VS Code插件

[点我直接查看插件](https://marketplace.visualstudio.com/items?itemName=fmnisme.smart-indent)

## 一个意外的烦恼

在使用vscode系列编辑器时(trae, cursor..)，不断遇到一个小烦恼：每次光标移动到空行，都得手动按Tab键缩进，结果老是意外触发AI代码补全。这个小问题不断打断我的思路，体验很差。

我只是想正确缩进而已，为什么要频繁按Tab键呢？VS Code为什么不能自动判断我需要的缩进呢？

突然冒出个想法："如果有个插件能自动处理这个问题就好了。"



## 从需求到插件：零开发经验的挑战

说实话，我完全没有开发过VS Code插件，对TypeScript也不太熟悉。但我确实有这个实际需求，所以决定尝试下能否通过AI工具实现它。

我的需求很简单：制作一个插件，当光标移动到空行时，自动应用合适的缩进，这样就不需要手动按Tab键了，也就不会触发那些烦人的AI代码补全。

## Cursor Agent + Claude 3.7：零代码开发奇迹

我决定使用Cursor编辑器的Agent功能配合Claude 3.7 Sonnet模型来尝试开发这个插件。这是我第一次尝试用AI完成"真正的"编程项目，而不仅仅是生成一些简单代码片段。

惊人的是，我完全没有手写一行代码就完成了整个插件！

开始时，我只是简单描述了我的需求："我想开发一个VS Code插件，当光标移到空行时自动识别上下文并应用正确缩进，这样我就不用手动按Tab了。我对插件开发完全不了解，请指导我。"

Agent立刻理解了我的意图，开始一步步引导我：
1. 首先解释了VS Code插件的基本结构
2. 帮我创建项目骨架
3. 指导我如何监听编辑器事件
4. 设计并实现了缩进逻辑
5. 最后打包和测试整个插件

整个过程中，我只是描述需求、提问和确认方向，所有代码都是由AI生成的，我从未直接编写过任何TypeScript代码。

## 遇到的挑战与AI的解决方案

开发过程出乎意料地顺利。Cursor Agent一次性就完成了插件的核心功能开发，代码逻辑清晰，结构完整。实际上我几乎没有遇到任何实质性的障碍。

在实际测试阶段，我只发现了两个需要补充的功能点：

1. **回车缩进功能** - 初始版本只实现了光标移动到空行时的自动缩进，后来发现还需要在按回车创建新行时也应用同样的缩进逻辑。向Agent描述这个需求后，它立即生成了相应代码。

2. **兼容现有的自动缩进** - 需要确保插件与VS Code原有的自动缩进功能和谐共存，避免冲突。Agent提供了一个优雅的解决方案，只在VS Code默认行为无法处理的情况下才触发我们的自定义缩进。

整个补充功能的过程也很简单，只需要告诉Agent："我需要添加回车自动缩进功能"，它就能完成剩余的工作。下面是Agent生成的核心缩进逻辑，展示了它如何处理各种情况：

```typescript
// AI生成的核心缩进逻辑，我没有编写任何代码
function calculateIndentationLevel(document: vscode.TextDocument, lineNumber: number): number {
    // 查找前一个非空行
    let prevNonEmptyLine = lineNumber - 1;
    while (prevNonEmptyLine >= 0) {
        const lineText = document.lineAt(prevNonEmptyLine).text.trim();
        if (lineText.length > 0) {
            break;
        }
        prevNonEmptyLine--;
    }
    
    if (prevNonEmptyLine >= 0) {
        const prevLine = document.lineAt(prevNonEmptyLine);
        const prevLineText = prevLine.text;
        const currentIndent = getIndentationLevel(prevLineText);
        
        // 特殊字符处理
        if (prevLineText.trim().endsWith('{') || prevLineText.trim().endsWith(':')) {
            return currentIndent + 1; // 增加缩进
        } else if (prevLineText.trim() === '}') {
            return Math.max(0, currentIndent - 1); // 减少缩进
        }
        
        return currentIndent;
    }
    
    return 0; // 默认无缩进
}
```

令人惊讶的是，即使我完全不懂VS Code插件开发和TypeScript，这段AI生成的代码也能完美工作，而且经过简单扩展后就能处理各种边缘情况。

## 完成的功能

最终，Smart Indent插件实现了几个关键功能：

- **避免AI干扰**：不需要按Tab键手动缩进，减少触发AI代码补全的机会
- **光标移动即缩进**：当光标移动到空行时自动缩进到正确位置
- **回车创建新行自动缩进**：在按回车创建新行时自动缩进到正确位置
- **智能大括号处理**：自动处理大括号（`{` 和 `}`）的正确缩进

还根据我的需求，特别为Go语言做了优化，同时保证插件遵循VS Code的缩进设置。

## 对AI辅助开发的全新认识

这次经历彻底改变了我对AI辅助编程的认识。作为一个VS Code插件开发和TypeScript的完全新手，我原本认为这个项目至少需要我花费大量时间学习相关知识。但事实证明，现代AI工具已经强大到能够弥补专业知识的不足，让零基础开发者也能创建实用工具。

特别让我惊讶的几点：

1. **理解复杂需求** - Claude能够理解我描述的问题和需求，即使我使用的是非技术性语言
2. **全程指导** - 从项目设置到代码实现，AI提供了完整的指导
3. **主动解决问题** - 它能主动识别潜在问题并提出解决方案，而不是被动等待我的指令
4. **学习曲线平缓** - 我在不学习复杂API的情况下就完成了项目

## 感悟与启示

这个小项目带给我的最大启示是：技术门槛正在被AI快速降低。即使是专业领域的开发工作，现在也可以通过正确引导AI来完成。

当然，这并不意味着程序员的知识和经验变得不重要。相反，知道"要构建什么"和"如何有效指导AI"变得更加关键。我发现，提出清晰问题和理解AI生成内容的能力，比手写代码的能力更为重要。

## 写在最后

Smart Indent这个小插件虽然功能简单，但它解决了一个实际痛点，提升了我的编码体验。更重要的是，它证明了即使是完全没有相关经验的人，也能通过AI工具创建有价值的软件。

如果你也有类似的小需求，不妨尝试用AI辅助开发。你可能会惊讶于自己能够实现的东西！

---

**PS**: 提供了核心思路后，本篇文档也是用claude-3.7-sonnet-thinkg写的 ~