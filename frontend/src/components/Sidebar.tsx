/* ============================================================
   Sidebar 组件 — 左侧导航栏
   ============================================================
   内容:新对话按钮 / 对话记录 / 法规知识库导航(8 部法规)
   移动端:以抽屉形式从左侧滑出,可拖动关闭(动量投影);
   桌面端:固定栏,半透明材质。
   ============================================================ */

import { motion, AnimatePresence } from 'motion/react'
import {
  Plus,
  MessageSquare,
  Landmark,
  ScrollText,
  Cpu,
  X,
  Library,
} from 'lucide-react'
import { LAWS, LAW_CATEGORIES, type LawItem } from '../lib/laws'
import type { ChatMessage } from '../api/types'
import { springSnappy, springSheet } from '../lib/springs'

interface Props {
  /** 移动端抽屉是否打开(桌面端始终显示) */
  open: boolean
  onClose: () => void
  /** 历史对话(取用户消息作为记录) */
  history: ChatMessage[]
  /** 点击历史记录(滚动定位到对应消息) */
  onSelectHistory: (id: string) => void
  /** 新对话 */
  onNewChat: () => void
  /** 点击法规:把预置问题填入输入框 */
  onPickLaw: (law: LawItem) => void
}

const CATEGORY_ICON = {
  基础法律: Landmark,
  配套法规: ScrollText,
  'AI 专项': Cpu,
} as const

function SidebarContent({
  history,
  onSelectHistory,
  onNewChat,
  onPickLaw,
  onClose,
  isMobile = false,
}: Omit<Props, 'open'> & { isMobile?: boolean }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 顶部:新对话 */}
      <div className="p-3 pb-2 flex items-center gap-2">
        <motion.button
          type="button"
          onClick={() => {
            onNewChat()
            onClose()
          }}
          whileTap={{ scale: 0.97 }}
          transition={springSnappy}
          className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-white shadow-sm cursor-pointer"
          style={{ background: 'linear-gradient(135deg, var(--brand-400), var(--brand-600))' }}
        >
          <Plus size={16} strokeWidth={2.5} />
          新对话
        </motion.button>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent/60 transition-colors cursor-pointer"
            aria-label="关闭导航"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 滚动区域:对话记录 + 法规库 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
        {/* 对话记录 */}
        {history.length > 0 && (
          <div className="mb-4">
            <div className="px-2 pt-2 pb-1.5 text-[11px] font-medium text-muted-foreground tracking-wide">
              对话记录
            </div>
            <ul className="flex flex-col gap-0.5">
              {history.map((msg) => (
                <li key={msg.id}>
                  <motion.button
                    type="button"
                    onClick={() => {
                      onSelectHistory(msg.id)
                      onClose()
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={springSnappy}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] text-foreground/80 hover:bg-accent/70 transition-colors cursor-pointer"
                  >
                    <MessageSquare size={14} className="shrink-0 text-muted-foreground" />
                    <span className="truncate">{msg.content}</span>
                  </motion.button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 法规知识库 */}
        <div className="px-2 pt-2 pb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground tracking-wide">
          <Library size={12} />
          法规知识库 · {LAWS.length} 部
        </div>

        {LAW_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICON[cat]
          const items = LAWS.filter((l) => l.category === cat)
          return (
            <div key={cat} className="mb-3">
              <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                <Icon size={12} />
                {cat}
              </div>
              <ul className="flex flex-col gap-0.5">
                {items.map((law) => (
                  <li key={law.id}>
                    <motion.button
                      type="button"
                      onClick={() => {
                        onPickLaw(law)
                        onClose()
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={springSnappy}
                      className="w-full group px-2.5 py-2 rounded-lg text-left hover:bg-accent/70 transition-colors cursor-pointer"
                      title={law.summary}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-foreground/90 truncate group-hover:text-primary transition-colors">
                          {law.shortName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {law.articles}条
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                        {law.summary}
                      </div>
                    </motion.button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* 底部版本信息 */}
      <div className="shrink-0 px-5 py-3 border-t border-black/5 dark:border-white/5">
        <p className="text-[11px] text-muted-foreground">
          HelloAgents v0.1 · ReAct 智能体框架
        </p>
      </div>
    </div>
  )
}

export function Sidebar(props: Props) {
  const { open, onClose } = props
  return (
    <>
      {/* 桌面端:固定侧栏 */}
      <aside className="hidden lg:block w-[264px] shrink-0 border-r border-black/5 dark:border-white/5 bg-sidebar/60">
        <SidebarContent {...props} />
      </aside>

      {/* 移动端:抽屉 + 遮罩;拖动抽屉向左关闭,松手按速度/位移决定去向 */}
      <AnimatePresence>
        {open && (
          <div className="lg:hidden fixed inset-0 z-40">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={springSheet}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.6, right: 0 }}
              onDragEnd={(_, info) => {
                // 用速度方向而非位置决定去留:向左快速一甩即关闭
                if (info.velocity.x < -500 || info.offset.x < -120) onClose()
              }}
              className="absolute left-0 top-0 bottom-0 w-[280px] glass-strong shadow-xl"
            >
              <SidebarContent {...props} isMobile />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
