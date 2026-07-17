/* ============================================================
   ChatMessage 组件 — 单条聊天消息(用户或 AI)
   ============================================================
   - 用户消息:右对齐品牌蓝气泡,弹簧入场
   - AI 消息:卡片式,含正文排版 / 法条引用胶囊 / 推理入口 / 免责声明
   - 加载中:Apple 信息风格三点跳动 + 当前推理状态文案
   - 正文做了轻量排版:编号行加粗、要点缩进、提示行高亮
   ============================================================ */

import { motion } from 'motion/react'
import { TriangleAlert, Brain, ChevronRight, BookOpen, Scale } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '../api/types'
import { messageEnter, springSnappy } from '../lib/springs'

interface Props {
  message: ChatMessageType
  /** 是否正在等待 AI 回答 */
  loading?: boolean
  /** 加载中的实时状态文案(如"正在调用检索工具…") */
  status?: string | null
  /** 点击"查看推理过程" */
  onShowSteps?: (message: ChatMessageType) => void
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/** 轻量正文排版:编号行 / 要点行 / 提示行 */
function MessageBody({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="text-sm leading-[1.75] text-foreground/90">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-2.5" />

        // 提示行:💡 / ⚠️ 开头 → 高亮提示框
        if (/^(💡|⚠️)/.test(trimmed)) {
          return (
            <div
              key={i}
              className="my-2 px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed bg-[rgba(0,122,255,0.06)] dark:bg-[rgba(10,132,255,0.12)] border border-[rgba(0,122,255,0.14)] dark:border-[rgba(10,132,255,0.2)]"
            >
              {trimmed}
            </div>
          )
        }
        // 编号行:1. 2. … → 小节标题
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <p key={i} className="mt-2.5 mb-0.5 font-semibold text-foreground">
              {trimmed}
            </p>
          )
        }
        // 要点行:· 开头 → 缩进列表
        if (/^·\s?/.test(trimmed)) {
          return (
            <p key={i} className="pl-4 relative">
              <span className="absolute left-1 top-[0.72em] w-1 h-1 rounded-full bg-muted-foreground/60" />
              {trimmed.slice(1).trim()}
            </p>
          )
        }
        return <p key={i}>{trimmed}</p>
      })}
    </div>
  )
}

export function ChatMessage({ message, loading = false, status, onShowSteps }: Props) {
  // === 用户消息:右对齐气泡 ===
  if (message.role === 'user') {
    return (
      <motion.div
        layout="position"
        {...messageEnter}
        className="flex justify-end"
        data-message-id={message.id}
      >
        <div
          className="max-w-[80%] sm:max-w-[70%] px-4 py-2.5 text-[15px] leading-relaxed rounded-[20px] rounded-br-[6px] text-white shadow-sm"
          style={{ background: 'linear-gradient(135deg, var(--brand-400), var(--brand-600))' }}
        >
          {message.content}
        </div>
      </motion.div>
    )
  }

  // === AI 消息:左对齐卡片 ===
  const stepCount = message.steps?.length ?? 0
  const elapsed = message.elapsedMs != null ? (message.elapsedMs / 1000).toFixed(1) : null

  return (
    <motion.div layout="position" {...messageEnter} className="flex justify-start" data-message-id={message.id}>
      <article className="w-full max-w-full sm:max-w-[88%] rounded-[20px] rounded-bl-[6px] border border-black/5 dark:border-white/8 bg-card shadow-sm overflow-hidden">
        {/* 头部:名称 + 状态 */}
        <div className="flex items-center gap-2.5 px-5 pt-4">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand-400), var(--brand-600))' }}
          >
            <Scale size={13} strokeWidth={2.2} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">HelloAgents</span>
          <span className="text-[11px] text-muted-foreground">
            {loading ? '推理中' : formatTime(message.createdAt)}
          </span>
        </div>

        {/* 正文 / 加载态 */}
        <div className="px-5 py-3">
          {loading ? (
            <div className="flex items-center gap-3 py-1">
              <div className="flex items-center gap-1.5">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
              </div>
              <span className="text-[13px] text-muted-foreground">
                {status ?? '正在思考…'}
              </span>
            </div>
          ) : (
            <MessageBody content={message.content} />
          )}
        </div>

        {/* 引用法条胶囊 */}
        {!loading && message.citations && message.citations.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {message.citations.map((cite, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springSnappy, delay: 0.15 + i * 0.05 }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[11px] whitespace-nowrap cursor-default bg-[rgba(0,122,255,0.07)] dark:bg-[rgba(10,132,255,0.14)] text-primary"
                title="法条引用"
              >
                <BookOpen size={11} />
                {cite.lawName} {cite.articleNo}
              </motion.span>
            ))}
          </div>
        )}

        {/* 底部:推理入口 + 免责声明 */}
        {!loading && (
          <div className="px-5 py-2.5 flex items-center justify-between gap-3 border-t border-black/5 dark:border-white/5">
            {stepCount > 0 ? (
              <motion.button
                type="button"
                onClick={() => onShowSteps?.(message)}
                whileTap={{ scale: 0.96 }}
                transition={springSnappy}
                className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-primary cursor-pointer"
              >
                <Brain size={13} />
                {stepCount} 步推理{elapsed ? ` · ${elapsed}s` : ''}
                <ChevronRight
                  size={13}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </motion.button>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <TriangleAlert size={12} />
              仅供法律知识参考,不构成法律意见
            </span>
          </div>
        )}
      </article>
    </motion.div>
  )
}
