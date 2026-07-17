/* ============================================================
   ThemeToggle 组件 — 深浅色切换
   ============================================================
   按下瞬间反馈(pointer-down 缩放),图标以弹簧旋转更替;
   颜色本身的过渡由 body 的 transition 平滑完成。
   ============================================================ */

import { motion, AnimatePresence } from 'motion/react'
import { Sun, Moon } from 'lucide-react'
import { springMomentum } from '../lib/springs'

interface Props {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: Props) {
  const isDark = theme === 'dark'
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.85 }}
      transition={springMomentum}
      className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={springMomentum}
          className="flex items-center justify-center"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
