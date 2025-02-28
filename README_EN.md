# Smart Indent

A practical VS Code extension that automatically applies the correct indentation when the cursor moves to an empty line. Solves the problem of accidentally triggering AI code completion when manually indenting with the Tab key.

*[中文文档](README.md) | English*

## Key Benefits

- **Avoid AI Interference**: No need to manually indent with the Tab key, reducing chances of triggering AI code completion
- **Indent on Cursor Movement**: Automatically indents when the cursor moves to an empty line
- **Auto-indent on New Lines**: Automatically indents when creating new lines with Enter
- **Smart Brace Handling**: Automatically handles correct indentation for braces (`{` and `}`)
- **Context-aware Precision**: Determines indentation based on the level of the previous non-empty line and special characters
- **Language-specific Optimization**: Specially optimized for Go language function definitions
- **Respects Editor Settings**: Fully complies with VS Code indentation settings (spaces/tabs)

## Use Cases

This extension is particularly suitable for:

- **Developers using AI code completion tools**: Avoid accidentally triggering code completion during indentation
- **Programmers focused on code cleanliness**: Automatically maintain consistent indentation without manual intervention
- **Collaborative projects**: Ensure consistent indentation formatting across the team
- **Frequent code editing scenarios**: Improve coding efficiency, focus on logic rather than formatting

## How It Works

After installation, the extension is enabled by default. Automatic indentation is triggered in the following situations:

1. When you move the cursor up or down to an empty line in the editor
2. When you press Enter to create a new line (especially useful in function definition scenarios)
3. When you press Enter at braces, the new brace line and the right brace will automatically indent to the correct position

The extension automatically detects the context and applies the appropriate indentation level without any manual intervention.

### Commands

This extension provides the following commands, accessible from the command palette (press F1 or Ctrl+Shift+P):

- `Enable Smart Indent`: Enable the automatic indentation feature
- `Disable Smart Indent`: Disable the automatic indentation feature

## Language-specific Support

- **Go language**: 
  - Specially optimized for automatic indentation after function definitions
  - When pressing Enter on a function signature line, the new line will automatically indent
  - When pressing Enter at braces after a function definition, it will automatically handle the indentation of left and right braces

## Notes

- This extension only works in editing mode
- Empty lines and brace lines will be automatically indented
- Indentation will not be triggered when the cursor moves between multiple non-empty lines (except for braces)

## Feedback

If you have any issues or suggestions, please submit an issue in the GitHub repository.

## License

MIT 