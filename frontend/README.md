# Frontend 前端应用

本目录用于存放基于 React 的前端 Web 应用代码。

## 职责

- 提供用户交互界面（聊天窗口、问答展示等）
- 通过 API 与后端 Agent 服务通信
- 展示 LLM 回答及工具调用结果

## 目录规划

```
frontend/
├── public/          # 静态资源
├── src/
│   ├── api/         # 后端 API 请求封装
│   ├── components/  # React 组件
│   ├── App.jsx      # 根组件
│   └── main.jsx     # 应用入口
├── package.json     # 前端项目依赖与配置
└── ...
```
