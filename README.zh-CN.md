[English](https://github.com/houm01/siyuan-theme-stillmark/blob/main/README.md)

# Stillmark / 静痕

静痕是一款安静、克制且可持续演进的[思源笔记](https://github.com/siyuan-note/siyuan)主题。目前处于早期开发阶段，最终视觉风格尚未确定。

## 当前基础

- 支持亮色与暗色模式的主题元数据
- 使用克制、中性的基础强调色
- 纯 CSS 实现，最低支持思源笔记 3.7.0
- 不使用已经废弃的 `theme.js`

当前图标和预览图暂时沿用官方主题示例素材，首次发布前会替换。

## 本地开发

克隆仓库，并将它链接到思源主题目录：

```bash
git clone https://github.com/houm01/siyuan-theme-stillmark.git
ln -s /path/to/siyuan-theme-stillmark \
  /path/to/SiYuan/conf/appearance/themes/siyuan-theme-stillmark
```

然后在“设置 → 外观 → 主题”中选择 **Stillmark / 静痕**。修改 `theme.css` 后若未立即生效，可以切换一次主题或重启思源。

## 文件结构

- `theme.json`：集市元数据和支持模式
- `theme.css`：主题变量及组件样式
- `icon.png`：160×160 集市图标
- `preview.png`：1024×768 集市预览图
- `CHANGELOG.md`：版本记录

## 当前状态

静痕尚未发布到思源社区集市。

## 许可证

[MIT](LICENSE)
