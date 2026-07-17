/* ============================================================
   App 组件 — 根组件
   ============================================================
   MotionConfig reducedMotion="user":
   跟随系统"减弱动态效果"设置 — 开启后所有弹簧位移
   自动降级为短暂的不透明度交叉淡入淡出。
   ============================================================ */

import { MotionConfig } from 'motion/react'
import ChatPage from './pages/ChatPage'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ChatPage />
    </MotionConfig>
  )
}
