/* ============================================================
   ChatPage 组件 — 聊天主页面(三栏工作台布局)
   ============================================================
   ┌────────────────────────────────────────────────────┐
   │ Header  半透明悬浮通栏                              │
   ├────────┬──────────────────────────────┬────────────┤
   │ 左栏    │  对话区(滚动内容穿过通栏)     │ 右栏        │
   │ 法规库  │  消息流 + 悬浮输入舱           │ 推理时间线  │
   └────────┴──────────────────────────────┴────────────┘
   - 发送后,推理步骤通过流式回调逐步到达,实时渲染在右栏
   - 移动端:左右两栏均为可拖动关闭的抽屉
   ============================================================ */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { EmptyState } from '../components/EmptyState'
import { ChatMessage } from '../components/ChatMessage'
import { ChatInput } from '../components/ChatInput'
import { ReasoningPanel } from '../components/ReasoningPanel'
import { askAgent } from '../api/client'
import type { ChatMessage as ChatMessageType, ReasoningStep } from '../api/types'
import type { LawItem } from '../lib/laws'

/** 简单的 UUID 生成器 */
function genId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
}

/** 主题初始化:本地存储优先,否则跟随系统 */
function initTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('ha-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ChatPage() {
  /* === 数据状态 === */
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [loading, setLoading] = useState(false)
  /** Agent 当前状态文案("正在调用检索工具…") */
  const [status, setStatus] = useState<string | null>(null)
  /** 本次回答已到达的推理步骤(实时) */
  const [activeSteps, setActiveSteps] = useState<ReasoningStep[]>([])
  /** 当前在右栏展示的消息 id */
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /** 本次推理开始时间 */
  const [startedAt, setStartedAt] = useState<number | null>(null)

  /* === 界面状态 === */
  const [theme, setTheme] = useState<'light' | 'dark'>(initTheme)
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(
    () => window.matchMedia('(min-width: 1280px)').matches,
  )

  /* === 主题应用到 <html> 并持久化 === */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('ha-theme', theme)
  }, [theme])

  /* === 滚动管理:用户接近底部时才跟随滚动 === */
  const scrollRef = useRef<HTMLDivElement>(null)
  const nearBottomRef = useRef(true)
  const stickToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  useEffect(() => {
    if (nearBottomRef.current) stickToBottom()
  }, [messages, activeSteps, loading, stickToBottom])

  /* === 发送消息 === */
  const handleSend = async (text: string) => {
    const userMsg: ChatMessageType = {
      id: genId(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    setStatus('正在分析问题…')
    setActiveSteps([])
    setSelectedId(null)
    setStartedAt(Date.now())
    nearBottomRef.current = true
    stickToBottom()

    const start = Date.now()
    // 步骤在本地数组里累积,避免依赖异步 state
    const collected: ReasoningStep[] = []

    try {
      const response = await askAgent(text, {
        onStep: (step) => {
          collected.push(step)
          setActiveSteps([...collected])
        },
        onStatus: setStatus,
      })

      const aiMsg: ChatMessageType = {
        id: genId(),
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        steps: collected,
        elapsedMs: Date.now() - start,
        createdAt: Date.now(),
      }
      setMessages((prev) => [...prev, aiMsg])
      setSelectedId(aiMsg.id)
    } catch (err) {
      const errMsg: ChatMessageType = {
        id: genId(),
        role: 'assistant',
        content: `请求出错:${(err as Error).message}\n\n请确认后端服务是否已启动。`,
        createdAt: Date.now(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
      setStatus(null)
    }
  }

  /* === 侧栏交互 === */
  const handleNewChat = () => {
    if (loading) return
    setMessages([])
    setActiveSteps([])
    setSelectedId(null)
    setStatus(null)
  }

  /** 点击法规:把预置问题填入输入框并聚焦 */
  const handlePickLaw = (law: LawItem) => {
    setDraft(law.prompt)
    document.getElementById('composer')?.focus()
  }

  /** 点击历史记录:平滑滚动到对应消息 */
  const handleSelectHistory = (id: string) => {
    const el = document.querySelector(`[data-message-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  /** 点击消息上的"N 步推理":打开右栏并展示该消息的推理 */
  const handleShowSteps = (msg: ChatMessageType) => {
    setSelectedId(msg.id)
    setPanelOpen(true)
  }

  /* === 右栏数据:加载中显示实时步骤,否则显示选中的消息 === */
  const selectedMsg = messages.find((m) => m.id === selectedId) ?? null

  /** 找到某条 AI 消息对应的用户提问(即它前面最近一条用户消息) */
  const questionOf = (msg: ChatMessageType | null): string | null => {
    if (!msg) return null
    const idx = messages.indexOf(msg)
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content
    }
    return null
  }

  const panelSteps = loading ? activeSteps : (selectedMsg?.steps ?? [])
  const panelQuestion = loading
    ? messages.filter((m) => m.role === 'user').pop()?.content
    : questionOf(selectedMsg)

  const isEmpty = messages.length === 0 && !loading

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        onToggleSidebar={() => setSidebarOpen(true)}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />

      <div className="flex-1 flex min-h-0 relative">
        {/* 左栏:法规库导航 */}
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          history={messages.filter((m) => m.role === 'user')}
          onSelectHistory={handleSelectHistory}
          onNewChat={handleNewChat}
          onPickLaw={handlePickLaw}
        />

        {/* 中栏:对话区 */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          {isEmpty ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <EmptyState onAsk={handleSend} />
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 overflow-y-auto mask-fade-y"
            >
              <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-6 flex flex-col gap-5">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} onShowSteps={handleShowSteps} />
                ))}
                {loading && (
                  <ChatMessage
                    message={{ id: 'loading', role: 'assistant', content: '', createdAt: Date.now() }}
                    loading
                    status={status}
                  />
                )}
              </div>
            </div>
          )}

          <ChatInput value={draft} onChange={setDraft} onSend={handleSend} disabled={loading} />
        </main>

        {/* 右栏:推理时间线 */}
        <ReasoningPanel
          steps={panelSteps}
          loading={loading}
          status={status}
          startedAt={startedAt}
          elapsedMs={selectedMsg?.elapsedMs ?? null}
          question={panelQuestion ?? null}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
        />
      </div>
    </div>
  )
}
