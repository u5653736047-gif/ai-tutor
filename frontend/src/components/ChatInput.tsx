/* ============================================================
   ChatInput 组件 — 底部悬浮输入舱
   ============================================================
   - 悬浮式半透明胶囊,聚焦时浮起品牌色光环
   - 文本域随内容自动长高(上限 5 行)
   - Enter 发送 / Shift+Enter 换行
   - 发送按钮在有内容时弹簧弹出,按下即刻压缩反馈
   ============================================================ */

import { useRef, type FormEvent, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUp } from 'lucide-react'
import { springMomentum, springSnappy } from '../lib/springs'

interface Props {
  /** 受控输入文本(由父组件持有,便于"填入预置问题") */
  value: string
  onChange: (text: string) => void
  onSend: (text: string) => void
  /** 是否正在等待 AI 回答(期间禁止发送) */
  disabled?: boolean
}

export function ChatInput({ value, onChange, onSend, disabled = false }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim().length > 0 && !disabled

  /** 自动长高:先复位再按内容高度撑开,封顶 150px */
  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`
  }

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    onChange('')
    // 复位高度
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="shrink-0 px-4 sm:px-6 pb-4 pt-1 z-20">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        {/* 悬浮胶囊 */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springSnappy}
          className="flex items-end gap-2 pl-5 pr-2 py-2 rounded-[26px] glass-strong border border-black/8 dark:border-white/10 shadow-lg transition-shadow focus-within:shadow-glow focus-within:border-[rgba(0,122,255,0.35)]"
        >
          <textarea
            id="composer"
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              autoResize()
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入你的法律合规问题…"
            aria-label="输入你的法律问题"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none resize-none text-[15px] leading-relaxed py-1.5 max-h-[150px] placeholder:text-muted-foreground/70"
          />

          {/* 发送按钮:有内容时弹簧弹出 */}
          <AnimatePresence>
            {canSend && (
              <motion.button
                key="send"
                type="submit"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.88 }}
                transition={springMomentum}
                aria-label="发送"
                className="w-9 h-9 mb-0.5 rounded-full flex items-center justify-center shrink-0 text-white shadow-glow cursor-pointer"
                style={{ background: 'linear-gradient(135deg, var(--brand-400), var(--brand-600))' }}
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 底部说明 */}
        <p className="mt-2 text-center text-[11px] text-muted-foreground/80">
          Enter 发送 · Shift+Enter 换行 · 本系统回答仅供法律知识参考,不构成法律意见
        </p>
      </form>
    </div>
  )
}
