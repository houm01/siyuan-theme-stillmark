[English](https://github.com/houm01/siyuan-theme-stillmark/blob/main/README.md)

# Stillmark / 静痕

静痕是一款安静、克制的[思源笔记](https://github.com/siyuan-note/siyuan)主题，以干净的白色编辑区和清晰的长文阅读体验为核心。

![静痕主题预览](preview.png)

## 主要特性

- 亮色模式以纯白编辑区和低饱和中性色界面为主
- 提供与亮色模式一致的暗色模式
- 紧凑的暗莓红行内代码，不改变正文行高
- 代码块支持行号、工具栏、折叠及 Highlight.js 语法高亮
- 内容引用保持石墨色正文，以克制的红色跳转标记提示引用关系
- 引用块使用低饱和暗莓红竖线和正体暖灰正文
- 文档标签使用紧凑的焦点蓝元数据样式；无题头图和文档图标时，标签与添加入口在同一行紧凑换行
- 外部链接默认显示中性地球图标，安装可选的“静痕工作台”插件后显示源网站图标
- 安装可选的“静痕工作台”插件后，为重名书签显示父级路径
- 集市主题包保持纯 CSS，最低支持思源笔记 3.7.0

## 安装

在“设置 → 集市 → 主题”中安装，再到“设置 → 外观 → 主题”选择 **Stillmark / 静痕**。

克隆仓库，并将它链接到思源主题目录：

```bash
git clone https://github.com/houm01/siyuan-theme-stillmark.git
ln -s /path/to/siyuan-theme-stillmark \
  /path/to/SiYuan/conf/appearance/themes/siyuan-theme-stillmark
```

修改 `theme.css` 后若未立即生效，可以切换一次主题或重启思源。若亮暗模式都要使用静痕，需要分别为亮色主题和暗色主题选择一次。

## 文件结构

- `theme.json`：集市元数据和支持模式
- `theme.css`：主题变量及组件样式
- `icon.png`：160×160 集市图标
- `preview.png`：1024×768 集市预览图
- `CHANGELOG.md`：版本记录

运行 `./scripts/build-package.sh` 生成集市使用的 `package.zip`。构建脚本只会收录文档中列出的主题资源，并会拒绝包含 JavaScript 的归档。

## 许可证

[MIT](LICENSE)
