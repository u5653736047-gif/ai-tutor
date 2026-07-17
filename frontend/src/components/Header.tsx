/* ============================================================
   Header 组件 — 顶部悬浮通栏
   ============================================================
   Apple 材质设计:半透明 + backdrop-filter 模糊,
   对话内容在其下方滚动穿过,而不是被一条死板的边线切断。
   左:侧栏开关 + 品牌标识  右:免责声明 + 主题 + 推理面板开关
   ============================================================ */

import { motion } from 'motion/react'
import { Scale, PanelLeft, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { springSnappy, springGentle } from '../lib/springs'

interface Props {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  /** 移动端侧栏开关 */
  onToggleSidebar: () => void
  /** 推理面板开关状态与切换 */
  panelOpen: boolean
  onTogglePanel: () => void
}

export function Header({ theme, onToggleTheme, onToggleSidebar, panelOpen, onTogglePanel }: Props) {
  return (
    <motion.header
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={springGentle}
      className="h-14 shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 z-30 glass border-b border-black/5 dark:border-white/5"
    >
      {/* 左侧:侧栏开关(移动端)+ 品牌标识 */}
      <div className="flex items-center gap-2.5 min-w-0">
        <motion.button
          type="button"
          onClick={onToggleSidebar}
          whileTap={{ scale: 0.85 }}
          transition={springSnappy}
          className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
          aria-label="打开导航"
        >
          <PanelLeft size={18} />
        </motion.button>

        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo:品牌渐变圆角方块 + 天平图标(法律意象) */}
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--brand-400), var(--brand-600))' }}
          >
            <Scale size={17} strokeWidth={2.2} className="text-white" />
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-semibold text-[15px] tracking-tight truncate">HelloAgents</span>
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">
              网络安全与数据合规 · 智能问答
            </span>
          </div>
        </div>
      </div>

      {/* 右侧:免责声明 + 主题切换 + 推理面板开关 */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap bg-accent/70 text-muted-foreground">
          仅供参考 · 不构成法律意见
        </span>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        <motion.button
          type="button"
          onClick={onTogglePanel}
          whileTap={{ scale: 0.85 }}
          transition={springSnappy}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            panelOpen
              ? 'text-primary bg-[rgba(0,122,255,0.1)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          }`}
          aria-label={panelOpen ? '关闭推理面板' : '打开推理面板'}
        >
          {panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </motion.button>
      </div>
    </motion.header>
  )
}
