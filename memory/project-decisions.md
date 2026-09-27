# 项目决策

- 项目使用静态多页结构；每个小游戏或工具放在自己的目录中，由根目录 `index.html` 提供入口。
- 轻量工具继续使用独立的 HTML、CSS 和 JavaScript。需要 3D 且不需要构建链时，通过 import map 从 CDN 加载固定版本的 Three.js；核心库与 addons 使用同一版本。本地预览使用 HTTP 服务器，生产页面使用 HTTPS。
- 页面文案和说明沿用简体中文，代码标识符保持简洁 English。
