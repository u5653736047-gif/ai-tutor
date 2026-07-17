/* ============================================================
   ReasoningPanel 组件 — 右侧 ReAct 推理时间线
   ============================================================
   把 Agent 的 Thought → Action → Observation → Final
   渲染成一条垂直时间线:
   - 每种步骤有专属角色色与图标(思考蓝 / 工具橙 / 观察青 / 结论绿)
   - 步骤按到达顺序弹簧入场;进行中的节点有脉冲光环
   - 工具调用展示函数名 + 参数(等宽字体)
   - 桌面端:固定栏;移动端:右侧抽屉,可拖动关闭(速度决定去向)
   ============================================================ */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Brain,
  Zap,
  FileSearch,
  CircleCheck,
  Route,
  X,
  Clock,
} from 'lucide-react'
import type { ReasoningStep, StepKind } from '../api/types'
import { springGentle, springSheet } from '../lib/springs'

interface Props {
  /** 当前展示的推理步骤 */
  steps: ReasoningStep[]
  /** 是否正在实时接收步骤 */
  loading: boolean
  /** 加载中的状态文案 */
  status?: string | null
  /** 本次推理开始时间(用于实时耗时) */
  startedAt?: number | null
  /** 已完成回答的最终耗时 */
  elapsedMs?: number | null
  /** 面板对应的用户问题 */
  question?: string | null
  /** 移动端抽屉开关 */
  open: boolean
  onClose: () => void
}

/* === 步骤种类 → 图标 / 文案 / 颜色 === */
const KIND_META: Record<
  StepKind,
  { icon: typeof Brain; label: string; colorVar: string; chipClass: string }
> = {
  thought: { icon: Brain, label: '思考', colorVar: 'var(--step-thought)', chipClass: 'chip-thought' },
  action: { icon: Zap, label: '工具调用', colorVar: 'var(--step-action)', chipClass: 'chip-action' },
  observation: { icon: FileSearch, label: '观察', colorVar: 'var(--step-observation)', chipClass: 'chip-observation' },
  final: { icon: CircleCheck, label: '结论', colorVar: 'var(--step-final)', chipClass: 'chip-final' },
}

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}

/** 格式化工具参数:JSON 字符串 → 逐行 key: value */
function formatArgs(raw: string): string {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('\n')
  } catch {
    return raw
  }
}

/* === 单个步骤卡片 === */
function StepCard({ step, active }: { step: ReasoningStep; active: boolean }) {
  const meta = KIND_META[step.kind]
  const Icon = meta.icon
  return (
    <motion.li
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springGentle}
      className="relative flex gap-3"
    >
      {/* 节点圆点(含图标);进行中节点带脉冲光环 */}
      <div
        className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white shadow-sm ${active ? 'pulse-ring' : ''}`}
        style={{ background: meta.colorVar }}
      >
        <Icon size={14} strokeWidth={2.2} />
      </div>

      {/* 卡片内容 */}
      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.chipClass}`}
          >
            {meta.label}
          </span>
          <span className="text-[13px] font-medium text-foreground">{step.title}</span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {formatClock(step.timestamp)}
          </span>
        </div>

        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {step.content}
        </p>

        {/* 工具调用详情 */}
        {step.toolCall && (
          <div className="mt-2 rounded-lg bg-muted/70 dark:bg-white/5 border border-black/5 dark:border-white/8 px-3 py-2 overflow-x-auto">
            <div className="font-mono text-[11px] font-semibold text-step-action">
              ƒ {step.toolCall.function.name}
            </div>
            <pre className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
              {formatArgs(step.toolCall.function.arguments)}
            </pre>
          </div>
        )}
      </div>
    </motion.li>
  )
}

/* === 面板主体(桌面与移动共用) === */
function PanelBody(props: Props & { isMobile?: boolean }) {
  const { steps, loading, status, startedAt, elapsedMs, question, onClose, isMobile } = props
  const scrollRef = useRef<HTMLDivElement>(null)

  // 实时耗时:加载中每 100ms 刷新一次
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [loading])

  // 新步骤到达时,时间线自动滚到底部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [steps.length])

  const displayElapsed =
    elapsedMs != null
      ? (elapsedMs / 1000).toFixed(1)
      : loading && startedAt
        ? ((now - startedAt) / 1000).toFixed(1)
        : null

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 面板头 */}
      <div className="shrink-0 px-4 h-14 flex items-center gap-2.5 border-b border-black/5 dark:border-white/5">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
        >
          <Route size={15} className="text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold tracking-tight">推理过程</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {loading ? (status ?? 'Agent 正在推理…') : 'ReAct · 思考 → 行动 → 观察'}
          </div>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent/60 transition-colors cursor-pointer"
            aria-label="关闭推理面板"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 问题上下文 */}
      {question && (
        <div className="shrink-0 px-4 py-2.5 border-b border-black/5 dark:border-white/5">
          <div className="text-[10px] font-medium text-muted-foreground mb-0.5">当前问题</div>
          <div className="text-[12px] leading-snug text-foreground/85 line-clamp-2">{question}</div>
        </div>
      )}

      {/* 时间线 */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {steps.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
            >
              <Brain size={22} className="text-primary" />
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              发送问题后,这里会实时展示 Agent 的每一步推理、检索与观察
            </p>
          </div>
        ) : (
          <ol className="relative">
            {/* 贯穿时间线的竖线(渐变淡化) */}
            <div
              aria-hidden
              className="absolute left-[13px] top-3 bottom-6 w-px"
              style={{
                background:
                  'linear-gradient(to bottom, var(--step-thought), var(--step-observation), transparent)',
                opacity: 0.35,
              }}
            />
            {steps.map((step, i) => (
              <StepCard
                key={`${step.stepIndex}-${step.kind}`}
                step={step}
                active={loading && i === steps.length - 1}
              />
            ))}
          </ol>
        )}
      </div>

      {/* 面板脚:耗时与步数 */}
      {(steps.length > 0 || loading) && (
        <div className="shrink-0 px-4 py-2.5 flex items-center gap-2 border-t border-black/5 dark:border-white/5 text-[11px] text-muted-foreground">
          <Clock size={12} />
          <span>
            {loading
              ? `已进行 ${steps.length} 步 · ${displayElapsed ?? '0.0'}s`
              : `共 ${steps.length} 步${displayElapsed ? ` · 耗时 ${displayElapsed}s` : ''}`}
          </span>
          {loading && (
            <span className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-step-thought animate-pulse" />
              实时
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function ReasoningPanel(props: Props) {
  const { open, onClose } = props
  return (
    <>
      {/* 桌面端:固定右栏,宽度弹簧收放 */}
      <motion.aside
        initial={false}
        animate={{ width: open ? 320 : 0, opacity: open ? 1 : 0 }}
        transition={springGentle}
        className="hidden xl:block shrink-0 overflow-hidden"
      >
        <div className="w-[320px] h-full border-l border-black/5 dark:border-white/5 glass">
          <PanelBody {...props} />
        </div>
      </motion.aside>

      {/* 移动端:右侧抽屉,可拖动关闭(松手时按速度方向决定去向) */}
      <AnimatePresence>
        {open && (
          <div className="xl:hidden fixed inset-0 z-40">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={springSheet}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.6 }}
              onDragEnd={(_, info) => {
                // 向右快速一甩或拖过阈值即关闭
                if (info.velocity.x > 500 || info.offset.x > 120) onClose()
              }}
              className="absolute right-0 top-0 bottom-0 w-[320px] max-w-[88vw] glass-strong shadow-xl"
            >
              <PanelBody {...props} isMobile />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
