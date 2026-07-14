# Electron 桌面客户端

本目录用于存放基于 Electron 的桌面客户端应用代码。

## 职责

- 将前端 Web 应用打包为跨平台桌面程序（Windows / macOS / Linux）
- 提供系统级能力（文件访问、系统通知、本地存储等）
- 作为前端与后端之间的桌面壳层

## 目录规划

```
electron/
├── main.js          # Electron 主进程入口
├── preload.js       # 预加载脚本（安全地向渲染进程暴露 API）
├── package.json     # Electron 项目依赖与配置
└── ...
```
