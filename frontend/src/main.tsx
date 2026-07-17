/* ============================================================
   应用入口 — 挂载 React 到 DOM
   ============================================================
   createRoot 是 React 18 的 API,把 <App /> 渲染到 index.html 的 #root
   StrictMode 是开发模式辅助:会多渲染一次帮发现副作用问题
   ============================================================ */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/globals.css'  // 引入全局样式(tokens + Tailwind)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
