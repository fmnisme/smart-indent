# VSCode插件发布流程

本文档总结了将VSCode插件发布到VSCode市场的完整流程，供团队成员参考。

## 1. 准备工作

### 1.1 账号和权限
- 创建Microsoft账号
- 创建Azure DevOps组织：https://dev.azure.com/
- 获取Personal Access Token (PAT)：
  - 在Azure DevOps中，点击右上角的用户头像
  - 选择"Personal access tokens"
  - 点击"New Token"
  - 设置名称，例如"VSCode Extension Publishing"
  - 选择组织
  - 设置过期时间
  - 在"Scopes"部分，选择"Custom defined"，然后选择"Marketplace > Manage"
  - 点击"Create"并保存生成的token（这个token只会显示一次）

### 1.2 安装工具
```bash
npm install -g @vscode/vsce
```

## 2. 插件配置

### 2.1 必要的package.json字段
确保package.json中包含以下必要字段：
```json
{
  "name": "插件的唯一标识符",
  "displayName": "在市场中显示的名称",
  "description": "插件描述",
  "version": "版本号（遵循语义化版本规范）",
  "publisher": "发布者ID",
  "repository": {
    "type": "git",
    "url": "代码仓库URL"
  },
  "engines": {
    "vscode": "^1.xx.0"  // 支持的VSCode最低版本
  },
  "categories": [
    "插件分类1",
    "插件分类2"
  ],
  "keywords": [
    "关键词1",
    "关键词2"
  ],
  "icon": "images/icon.png"  // 插件图标路径
}
```

### 2.2 图标和Banner
- 准备一个128x128像素的PNG图标文件
- 可以在package.json中添加galleryBanner配置：
```json
"galleryBanner": {
  "color": "#颜色代码",
  "theme": "dark或light"
}
```

### 2.3 多语言支持
- 创建多语言README文件（如README.md和README_EN.md）
- 在文件之间添加相互引用链接：
  - 在中文README中：`*中文 | [English](README_EN.md)*`
  - 在英文README中：`*[中文文档](README.md) | English*`

## 3. 打包和发布

### 3.1 打包插件
```bash
vsce package
```
这将生成一个.vsix文件，可以手动安装或分享给他人。

### 3.2 登录到VSCode市场
```bash
vsce login <发布者ID>
```
系统会提示输入之前创建的Personal Access Token。

### 3.3 发布插件
```bash
vsce publish
```
或者直接使用token发布：
```bash
vsce publish -p <Personal Access Token>
```

### 3.4 发布特定版本
```bash
vsce publish [版本号]
```
例如：`vsce publish 1.0.1`或`vsce publish minor`

## 4. 更新插件

### 4.1 更新版本号
修改package.json中的version字段，遵循语义化版本规范：
- 主版本号：不兼容的API变更
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

### 4.2 重新发布
```bash
vsce publish
```

## 5. 管理插件

### 5.1 查看和管理
在[VSCode市场管理页面](https://marketplace.visualstudio.com/manage)可以：
- 查看下载统计
- 查看评分和评论
- 更新插件描述、截图等元数据
- 管理插件版本

### 5.2 取消发布
如需取消发布某个版本：
```bash
vsce unpublish (publisher name).(extension name)[@(version)]
```

## 6. 最佳实践

### 6.1 文档和展示
- 提供详细的README，包括功能介绍、安装说明、使用方法
- 添加截图或GIF动画展示插件功能
- 提供示例和使用场景

### 6.2 版本控制
- 使用语义化版本规范
- 维护CHANGELOG.md记录版本变更
- 为重要版本创建GitHub Release

### 6.3 质量保证
- 在发布前充分测试插件
- 收集并响应用户反馈
- 定期更新依赖和兼容性

## 7. 常见问题

### 7.1 发布失败
- 检查Personal Access Token是否有效
- 确认package.json中的publisher与您的发布者ID一致
- 验证版本号是否已更新（不能发布相同版本）

### 7.2 插件不显示
- 发布后可能需要一些时间才能在市场中显示
- 检查是否有任何违反市场政策的内容

### 7.3 更新问题
- 确保更新了package.json中的version字段
- 遵循语义化版本规范

## 相关资源

- [VSCode插件开发文档](https://code.visualstudio.com/api)
- [vsce命令行工具文档](https://github.com/microsoft/vscode-vsce)
- [VSCode市场发布文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [语义化版本规范](https://semver.org/) 