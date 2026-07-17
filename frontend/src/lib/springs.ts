/* ============================================================
   弹簧预设 — Apple《Designing Fluid Interfaces》参数翻译
   ============================================================
   Motion 的 bounce + duration 弹簧 API 与 Apple 的
   damping + response 一一对应:
   - bounce: 0   ⇔ damping 1.0(临界阻尼,无过冲)— 默认 UI
   - bounce: 0.2 ⇔ damping ~0.8(轻微回弹)— 仅用于带动量的交互
   - duration    ⇔ response(到达目标的快慢,不是"时长")
   ============================================================ */

import type { Transition } from 'motion/react'

/** 默认 UI 弹簧:临界阻尼,优雅收敛(大多数元素入场/移动) */
export const springGentle: Transition = { type: 'spring', bounce: 0, duration: 0.4 }

/** 更敏捷的临界阻尼:小元素、按钮、开关 */
export const springSnappy: Transition = { type: 'spring', bounce: 0, duration: 0.28 }

/** 抽屉 / 面板:临界阻尼 + 稍慢的 response,移动得更"有质量" */
export const springSheet: Transition = { type: 'spring', bounce: 0, duration: 0.5 }

/** 带动量的元素(发送按钮弹出、标签入场):允许一点点回弹 */
export const springMomentum: Transition = { type: 'spring', bounce: 0.25, duration: 0.45 }

/** 消息入场统一配置 */
export const messageEnter = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: springGentle,
} as const
