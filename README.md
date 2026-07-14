[中文](https://github.com/houm01/siyuan-theme-stillmark/blob/main/README.zh-CN.md)

# Stillmark

Stillmark is a calm and adaptable theme for [SiYuan](https://github.com/siyuan-note/siyuan). It is currently in early development; the final visual direction has not been fixed yet.

## Current baseline

- Light and dark mode metadata
- A restrained neutral accent palette
- Pure CSS implementation for SiYuan 3.7.0 or later
- No deprecated `theme.js`

The current icon and preview are temporary assets inherited from the official theme sample and will be replaced before the first release.

## Local development

Clone the repository and make it available under the SiYuan theme directory:

```bash
git clone https://github.com/houm01/siyuan-theme-stillmark.git
ln -s /path/to/siyuan-theme-stillmark \
  /path/to/SiYuan/conf/appearance/themes/siyuan-theme-stillmark
```

Then select **Stillmark** under **Settings → Appearance → Theme**. Switch themes once or restart SiYuan after editing `theme.css` if the change is not reloaded immediately.

## Files

- `theme.json`: marketplace metadata and supported modes
- `theme.css`: theme variables and component styles
- `icon.png`: 160×160 marketplace icon
- `preview.png`: 1024×768 marketplace preview
- `CHANGELOG.md`: release history

## Status

Stillmark has not been released to the SiYuan community marketplace yet.

## License

[MIT](LICENSE)
