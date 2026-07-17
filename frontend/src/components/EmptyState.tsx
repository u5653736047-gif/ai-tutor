/* ============================================================
   EmptyState 组件 — 空对话时的欢迎引导页
   ============================================================
   - 大标题:负字距 display 排版 + 品牌渐变关键词
   - 能力标签:ReAct 推理可视化 / 8 部法规 / 全程可追溯
   - 示例问题卡片:按场景分组,悬停上浮、按下压缩、
     入场时按顺序弹簧浮现(stagger)
   - 背景:静态环境光斑(无循环动画,尊重前庭敏感)
   ============================================================ */

import { motion } from 'motion/react'
import {
  Scale,
  Brain,
  Library,
  Route,
  Building2,
  Cpu,
  Globe,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react'
import { SUGGESTIONS } from '../lib/laws'
import { springGentle, springMomentum, springSnappy } from '../lib/springs'

interface Props {
  onAsk: (question: string) => void
}

const SUGGESTION_ICON = {
  building: Building2,
  cpu: Cpu,
  globe: Globe,
  'shield-alert': ShieldAlert,
} as const

const FEATURES = [
  { icon: Brain, label: 'ReAct 推理可视化' },
  { icon: Library, label: '8 部核心法规' },
  { icon: Route, label: '答案全程可追溯' },
] as const

/** 入场编排:整体容器 stagger,子元素依次浮现 */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: springGentle },
}

export function EmptyState({ onAsk }: Props) {
  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-10">
      {/* 环境光斑(静态氛围层) */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div
          className="aurora w-[420px] h-[420px] -top-32 -left-24"
          style={{ background: 'var(--aurora-1)' }}
        />
        <div
          className="aurora w-[380px] h-[380px] top-1/3 -right-28"
          style={{ background: 'var(--aurora-2)' }}
        />
        <div
          className="aurora w-[320px] h-[320px] -bottom-28 left-1/4"
          style={{ background: 'var(--aurora-3)' }}
        />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-2xl flex flex-col items-center text-center"
      >
        {/* 徽标 */}
        <motion.div variants={item} className="mb-6">
          <motion.div
            whileHover={{ scale: 1.06, rotate: -3 }}
            transition={springMomentum}
            className="w-16 h-16 rounded-[20px] flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--brand-400), var(--brand-700))' }}
          >
            <Scale size={30} strokeWidth={2} className="text-white" />
          </motion.div>
        </motion.div>

        {/* 主标题 */}
        <motion.h1 variants={item} className="display-hero text-foreground">
          法律合规问题
          <br />
          <span className="text-gradient">问出可追溯的答案</span>
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          variants={item}
          className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground"
        >
          基于自建 ReAct 智能体,多步检索网络安全与数据合规知识库,
          每一次推理、每一条法条依据都清晰可见。
        </motion.p>

        {/* 能力标签 */}
        <motion.div variants={item} className="mt-6 flex flex-wrap justify-center gap-2">
          {FEATURES.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium glass border border-black/5 dark:border-white/8 text-foreground/80"
            >
              <Icon size={13} className="text-primary" />
              {label}
            </span>
          ))}
        </motion.div>

        {/* 示例问题卡片 */}
        <motion.div
          variants={item}
          className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
        >
          {SUGGESTIONS.map(({ icon, tag, question }) => {
            const Icon = SUGGESTION_ICON[icon]
            return (
              <motion.button
                key={question}
                type="button"
                onClick={() => onAsk(question)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={springSnappy}
                className="group relative flex items-start gap-3 p-4 rounded-2xl text-left glass border border-black/5 dark:border-white/8 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <span
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
                >
                  <Icon size={17} className="text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    {tag}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-foreground/90">
                    {question}
                  </span>
                </span>
                <ArrowUpRight
                  size={15}
                  className="shrink-0 mt-0.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                />
              </motion.button>
            )
          })}
        </motion.div>
      </motion.div>
    </div>
  )
}
