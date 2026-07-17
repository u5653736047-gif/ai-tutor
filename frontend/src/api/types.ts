/* ============================================================
   API 类型定义 — 后端数据结构的 TypeScript 镜像
   ============================================================
   这些类型必须严格对齐 backend/agents/react_agent.py 的实际产出。
   后端 ReAct Agent 的 tool_calls 结构、消息格式都在这里定义。
   ============================================================ */

/** 消息角色 */
export type MessageRole = 'user' | 'assistant'

/**
 * 一条对话消息
 * - 用户消息只有 content
 * - AI 消息还可能包含推理步骤 steps 和引用标签 citations
 */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  /** AI 回答引用的法规条文(对应设计稿中的胶囊标签) */
  citations?: Citation[]
  /** AI 回答的推理步骤(对应右栏时间线) */
  steps?: ReasoningStep[]
  /** AI 完成本次回答的耗时(毫秒) */
  elapsedMs?: number
  createdAt: number
}

/**
 * 单条推理步骤 — 对应 ReAct 的 Thought / Action / Observation / Final
 * 与 react_agent.py 中的循环每一步对应
 */
export type StepKind = 'thought' | 'action' | 'observation' | 'final'

export interface ReasoningStep {
  /** 步骤序号,从 1 开始 */
  stepIndex: number
  kind: StepKind
  /** 步骤标题(如"检索相关法规") */
  title: string
  /** 步骤内容(思考文本/工具名+参数/检索结果) */
  content: string
  /** 仅 action 步骤:工具调用详情 */
  toolCall?: ToolCall
  timestamp: number
}

/**
 * 工具调用 — 对应 react_agent.py 第 46-67 行的 tool_call 结构
 * 注意:function.arguments 是 JSON 字符串,不是对象
 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** 法规引用标签(如"生成式AI办法 第7条") */
export interface Citation {
  lawName: string
  articleNo: string
}

/** POST /api/ask 请求体 */
export interface AskRequest {
  question: string
}

/** POST /api/ask 响应体 */
export interface AskResponse {
  answer: string
  steps: ReasoningStep[]
  citations: Citation[]
}
