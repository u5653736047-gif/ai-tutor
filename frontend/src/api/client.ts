/* ============================================================
   API 客户端 — 封装与后端 ReAct 智能体的通信
   ============================================================
   - 后端 FastAPI 尚未开发时,使用流式 mock:推理步骤逐步推送,
     完整模拟 ReAct 的 Thought → Action → Observation 节奏,
     便于前端调试"推理过程实时可视化"
   - 后端就绪后,把 USE_MOCK 改成 false 即可切换到 POST /api/ask
   - 所有网络错误统一抛出 ApiError,组件层 catch 即可
   ============================================================ */

import type { AskRequest, AskResponse, ReasoningStep } from './types'

/** 后端 API 基础地址(可通过 .env 中的 VITE_API_BASE 覆盖) */
const BASE_URL = import.meta.env.VITE_API_BASE ?? '/api'

/** 是否使用 mock 模式(后端没启动时保持 true) */
const USE_MOCK = true

/** 自定义错误类,包含 HTTP 状态码 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 流式回调:推理步骤逐步到达时触发 */
export interface AskCallbacks {
  /** 每产生一个推理步骤(Thought/Action/Observation/Final)时调用 */
  onStep?: (step: ReasoningStep) => void
  /** Agent 当前状态文案变化时调用(如"正在调用 vector_search") */
  onStatus?: (label: string) => void
}

/* ============================================================
   Mock 场景库 — 按关键词匹配,返回贴近真实领域的推理剧本
   ============================================================ */

interface MockScenario {
  /** 命中本场景的关键词 */
  keywords: string[]
  steps: Array<Omit<ReasoningStep, 'stepIndex' | 'timestamp'>>
  answer: string
  citations: AskResponse['citations']
}

const SCENARIOS: MockScenario[] = [
  {
    keywords: ['手机号', '收集', '个人信息', '通讯录', '隐私'],
    steps: [
      {
        kind: 'thought',
        title: '分析问题',
        content:
          '用户询问收集个人信息的合规要求。手机号属于个人信息,核心依据是《个人信息保护法》,先用语义检索定位处理规则相关条文。',
      },
      {
        kind: 'action',
        title: '调用 vector_search',
        content: '语义检索:个人信息处理的告知与同意规则',
        toolCall: {
          id: 'call_v1',
          type: 'function',
          function: {
            name: 'vector_search',
            arguments: JSON.stringify({ query: '收集 手机号码 个人信息 告知 同意', top_k: 5 }),
          },
        },
      },
      {
        kind: 'observation',
        title: '检索结果',
        content:
          '命中《个人信息保护法》第 13、14、17 条:处理个人信息应取得同意,并以显著方式告知处理目的、方式和范围。',
      },
      {
        kind: 'thought',
        title: '补充检索',
        content:
          '已覆盖"告知同意",但收集环节还涉及最小必要原则与安全管理义务,用关键词检索补充数据安全层面的要求。',
      },
      {
        kind: 'action',
        title: '调用 bm25_search',
        content: '关键词检索:最小必要原则与安全管理制度',
        toolCall: {
          id: 'call_b1',
          type: 'function',
          function: {
            name: 'bm25_search',
            arguments: JSON.stringify({ query: '最小必要 数据安全 管理制度', top_k: 3 }),
          },
        },
      },
      {
        kind: 'observation',
        title: '检索结果',
        content:
          '命中《个人信息保护法》第 6 条(最小必要、不得过度收集)与《数据安全法》第 27 条(全流程数据安全管理制度)。',
      },
      {
        kind: 'final',
        title: '生成回答',
        content: '信息充分,综合两部法律给出结构化合规建议。',
      },
    ],
    answer: `收集用户手机号码属于个人信息处理活动,需要遵守以下核心规定:

1. 取得同意并充分告知(《个人信息保护法》第 13、14 条)
处理个人信息应当取得个人在充分知情前提下自愿、明确的同意;处理目的、方式发生变化的,应当重新取得同意。

2. 明示处理规则(第 17 条)
以显著方式、清晰易懂的语言,真实、准确、完整地告知处理目的、处理方式、信息种类、保存期限以及个人行使权利的方式。

3. 遵循最小必要原则(第 6 条)
收集范围应限于实现处理目的的最小范围,不得过度收集;不得因为用户不同意提供非必要信息而拒绝提供基本业务功能。

4. 建立安全管理制度(《数据安全法》第 27 条)
采取加密、去标识化等安全技术措施,建立全流程数据安全管理制度,防止信息泄露、篡改、丢失。

💡 实务建议:上线前开展一次个人信息保护影响评估(PIA),并同步完善隐私政策文本。`,
    citations: [
      { lawName: '个人信息保护法', articleNo: '第13条' },
      { lawName: '个人信息保护法', articleNo: '第17条' },
      { lawName: '个人信息保护法', articleNo: '第6条' },
      { lawName: '数据安全法', articleNo: '第27条' },
    ],
  },
  {
    keywords: ['AI', 'ai', '人工智能', '算法', '机器人', '备案', '深度合成', '生成式'],
    steps: [
      {
        kind: 'thought',
        title: '分析问题',
        content:
          '用户想了解 AI 产品上线的合规要求,涉及生成式 AI、算法推荐、深度合成三部专项法规,先做语义检索确定适用范围。',
      },
      {
        kind: 'action',
        title: '调用 vector_search',
        content: '语义检索:生成式 AI 服务的备案与安全评估义务',
        toolCall: {
          id: 'call_v1',
          type: 'function',
          function: {
            name: 'vector_search',
            arguments: JSON.stringify({ query: '生成式人工智能 上线 备案 安全评估', top_k: 5 }),
          },
        },
      },
      {
        kind: 'observation',
        title: '检索结果',
        content:
          '命中《生成式人工智能服务管理暂行办法》第 17 条:提供具有舆论属性或社会动员能力的生成式 AI 服务,应开展安全评估并履行算法备案。',
      },
      {
        kind: 'thought',
        title: '补充检索',
        content:
          '聊天机器人通常同时涉及算法推荐与深度合成标识义务,需确认另外两部规定的触发条件。',
      },
      {
        kind: 'action',
        title: '调用 bm25_search',
        content: '关键词检索:算法推荐备案与深度合成标识',
        toolCall: {
          id: 'call_b1',
          type: 'function',
          function: {
            name: 'bm25_search',
            arguments: JSON.stringify({ query: '算法推荐 备案 深度合成 标识', top_k: 3 }),
          },
        },
      },
      {
        kind: 'observation',
        title: '检索结果',
        content:
          '命中《算法推荐管理规定》第 24 条(算法备案)与《深度合成管理规定》第 16 条(显著标识 AI 生成内容)。',
      },
      {
        kind: 'final',
        title: '生成回答',
        content: '综合三部专项法规,按"评估—备案—标识"给出上线清单。',
      },
    ],
    answer: `开发 AI 聊天机器人上线,需要重点履行以下三类合规义务:

1. 安全评估 + 算法备案(《生成式人工智能服务管理暂行办法》第 17 条)
提供具有舆论属性或社会动员能力的生成式 AI 服务,应当按照国家有关规定开展安全评估,并履行算法备案手续。

2. 算法推荐备案(《互联网信息服务算法推荐管理规定》第 24 条)
具有舆论属性或社会动员能力的算法推荐服务提供者,应在提供服务之日起十个工作日内通过互联网信息服务算法备案系统填报备案信息。

3. 生成内容标识(《互联网信息服务深度合成管理规定》第 16 条)
对可能导致公众混淆或误认的 AI 生成内容,应当在合理位置进行显著标识,提示内容由人工智能生成。

⚠️ 同时注意:训练数据若包含个人信息,还需满足《个人信息保护法》关于数据来源合法性的要求。

💡 实务建议:按"上线前安全评估 → 算法备案 → 生成内容标识"的顺序推进,留存评估与备案凭证。`,
    citations: [
      { lawName: '生成式AI办法', articleNo: '第17条' },
      { lawName: '算法推荐规定', articleNo: '第24条' },
      { lawName: '深度合成规定', articleNo: '第16条' },
      { lawName: '个人信息保护法', articleNo: '第13条' },
    ],
  },
  {
    keywords: ['出境', '海外', '跨境', '境外', '传输'],
    steps: [
      {
        kind: 'thought',
        title: '分析问题',
        content:
          '用户询问数据出境的合规条件,这是《个人信息保护法》与《数据安全法》的交叉领域,先检索个人信息出境的三条路径。',
      },
      {
        kind: 'action',
        title: '调用 vector_search',
        content: '语义检索:个人信息出境的合法路径',
        toolCall: {
          id: 'call_v1',
          type: 'function',
          function: {
            name: 'vector_search',
            arguments: JSON.stringify({ query: '个人信息 出境 安全评估 标准合同 认证', top_k: 5 }),
          },
        },
      },
      {
        kind: 'observation',
        title: '检索结果',
        content:
          '命中《个人信息保护法》第 38 条:出境须满足安全评估、专业机构认证、标准合同或其他法定条件之一。',
      },
      {
        kind: 'thought',
        title: '补充检索',
        content: '还需确认本地化存储义务与重要数据出境的特殊规则,用关键词检索补充。',
      },
      {
        kind: 'action',
        title: '调用 bm25_search',
        content: '关键词检索:本地化存储与重要数据出境',
        toolCall: {
          id: 'call_b1',
          type: 'function',
          function: {
            name: 'bm25_search',
            arguments: JSON.stringify({ query: '关键信息基础设施 本地化 重要数据 出境', top_k: 3 }),
          },
        },
      },
      {
        kind: 'observation',
        title: '检索结果',
        content:
          '命中《个人信息保护法》第 40 条(CIIO 与达量处理者本地化)与《数据安全法》第 31 条(重要数据出境安全管理)。',
      },
      {
        kind: 'final',
        title: '生成回答',
        content: '综合出境路径、本地化义务与重要数据规则,给出决策顺序。',
      },
    ],
    answer: `用户数据传输到境外,需要按以下顺序判断并履行义务:

1. 先判断是否触发本地化存储(《个人信息保护法》第 40 条)
关键信息基础设施运营者,以及处理个人信息达到国家网信部门规定数量的处理者,应当将在境内收集和产生的个人信息存储在境内;确需出境的,须通过安全评估。

2. 选择出境合法路径(第 38 条)
满足以下四项条件之一即可:
· 通过国家网信部门组织的安全评估
· 经专业机构进行个人信息保护认证
· 与境外接收方订立标准合同
· 法律、行政法规规定的其他条件

3. 涉及重要数据的额外要求(《数据安全法》第 31 条)
重要数据出境适用安全评估管理;其他数据处理者在境内运营中收集产生的重要数据出境,同样适用。

4. 配套动作
向个人告知境外接收方信息并取得单独同意,事前开展个人信息保护影响评估。

💡 实务建议:先盘点数据类型与量级,确定是否构成"重要数据"或达到出境评估门槛,再选择评估 / 认证 / 标准合同路径。`,
    citations: [
      { lawName: '个人信息保护法', articleNo: '第38条' },
      { lawName: '个人信息保护法', articleNo: '第40条' },
      { lawName: '数据安全法', articleNo: '第31条' },
      { lawName: '网络数据安全管理条例', articleNo: '第35条' },
    ],
  },
  {
    keywords: ['投诉', '举报', '维权', '泄露', '赔偿'],
    steps: [
      {
        kind: 'thought',
        title: '分析问题',
        content:
          '用户想就 APP 违规收集个人信息进行投诉维权,需要梳理个人权利条款与投诉举报渠道,先检索个人权利相关规定。',
      },
      {
        kind: 'action',
        title: '调用 vector_search',
        content: '语义检索:个人在个人信息处理活动中的权利',
        toolCall: {
          id: 'call_v1',
          type: 'function',
          function: {
            name: 'vector_search',
            arguments: JSON.stringify({ query: '个人权利 拒绝 删除 投诉 举报 个人信息', top_k: 5 }),
          },
        },
      },
      {
        kind: 'observation',
        title: '检索结果',
        content:
          '命中《个人信息保护法》第 44—47 条:个人享有知情、决定、限制、拒绝、查阅、复制、删除等权利。',
      },
      {
        kind: 'thought',
        title: '补充检索',
        content: '明确了个人权利,再检索监管部门的投诉举报职责,给出具体维权路径。',
      },
      {
        kind: 'action',
        title: '调用 bm25_search',
        content: '关键词检索:监管部门投诉举报职责',
        toolCall: {
          id: 'call_b1',
          type: 'function',
          function: {
            name: 'bm25_search',
            arguments: JSON.stringify({ query: '投诉 举报 网信部门 职责', top_k: 3 }),
          },
        },
      },
      {
        kind: 'observation',
        title: '检索结果',
        content:
          '命中《个人信息保护法》第 60、65 条:网信部门统筹协调,有关部门接收处理投诉举报;另命中《网络安全法》第 41 条(收集使用规则)。',
      },
      {
        kind: 'final',
        title: '生成回答',
        content: '按"固定证据—APP 内投诉—监管举报—司法救济"给出维权路径。',
      },
    ],
    answer: `APP 未经同意读取通讯录属于典型的违规收集个人信息行为,可以按以下路径维权:

1. 你的法律依据
· 《个人信息保护法》第 44—47 条:你享有知情、决定、拒绝、删除等权利
· 《网络安全法》第 41 条:网络运营者收集使用个人信息应公开规则、明示目的并取得同意
· 通讯录信息一旦涉及行踪、社交关系,可能构成敏感个人信息,保护标准更高

2. 第一步:固定证据
截图权限申请弹窗、手机系统的权限调用记录、隐私政策文本,保存时间点与版本号。

3. 第二步:APP 内投诉
《个人信息保护法》第 50 条要求处理者建立便捷的个人权利申请受理机制,先通过 App 内"设置—隐私—投诉"渠道要求删除并停止处理。

4. 第三步:向监管部门举报(第 60、65 条)
· 网信办违法和不良信息举报中心:12377
· 工信部电信用户申诉受理中心:12321
· 应用商店投诉渠道:要求下架违规 App

5. 第四步:司法救济
造成损害的,可依据《个人信息保护法》第 69 条主张侵权损害赔偿(过错推定,由处理者自证无过错)。

💡 提示:向监管举报时附上 App 名称、版本、证据截图与时间线,处理效率会明显提高。`,
    citations: [
      { lawName: '个人信息保护法', articleNo: '第44条' },
      { lawName: '个人信息保护法', articleNo: '第50条' },
      { lawName: '个人信息保护法', articleNo: '第65条' },
      { lawName: '网络安全法', articleNo: '第41条' },
    ],
  },
]

/** 兜底场景:通用法律问答 */
const FALLBACK: MockScenario = {
  keywords: [],
  steps: [
    {
      kind: 'thought',
      title: '分析问题',
      content: '识别用户问题的法律领域与涉及的主体义务,先通过语义检索定位相关法规条文。',
    },
    {
      kind: 'action',
      title: '调用 vector_search',
      content: '语义检索:与问题相关的法规条文',
      toolCall: {
        id: 'call_v1',
        type: 'function',
        function: {
          name: 'vector_search',
          arguments: JSON.stringify({ query: '法律 合规 要求', top_k: 5 }),
        },
      },
    },
    {
      kind: 'observation',
      title: '检索结果',
      content: '命中《个人信息保护法》《数据安全法》《网络安全法》中与问题相关的若干条文。',
    },
    {
      kind: 'final',
      title: '生成回答',
      content: '已具备足够的条文依据,综合给出结构化回答。',
    },
  ],
  answer: `这是一个涉及网络安全与数据合规的问题,结合知识库中的核心法规,可以从以下层面理解:

1. 《个人信息保护法》
处理个人信息应遵循合法、正当、必要和诚信原则,取得个人同意并明示处理规则。

2. 《数据安全法》
数据处理者应建立全流程数据安全管理制度,落实分类分级保护,防范数据安全风险。

3. 《网络安全法》
网络运营者应履行安全保护义务,保障网络免受干扰、破坏或未经授权的访问。

由于当前知识库仍在建设中,以上回答基于通用条文。建议补充更多背景信息(行业、数据类型、业务环节),我可以给出更精确的法条定位。`,
  citations: [
    { lawName: '个人信息保护法', articleNo: '第13条' },
    { lawName: '数据安全法', articleNo: '第27条' },
    { lawName: '网络安全法', articleNo: '第21条' },
  ],
}

/* ============================================================
   流式 Mock — 逐步推送推理步骤,模拟真实 ReAct 节奏
   ============================================================ */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const KIND_STATUS: Record<string, string> = {
  thought: '正在思考…',
  action: '正在调用检索工具…',
  observation: '正在阅读检索结果…',
  final: '正在组织回答…',
}

function mockAskStream(question: string, callbacks?: AskCallbacks): Promise<AskResponse> {
  const scenario =
    SCENARIOS.find((s) => s.keywords.some((k) => question.includes(k))) ?? FALLBACK

  return (async () => {
    const steps: ReasoningStep[] = []
    callbacks?.onStatus?.('正在分析问题…')
    await sleep(500)

    for (let i = 0; i < scenario.steps.length; i++) {
      const raw = scenario.steps[i]
      const step: ReasoningStep = {
        ...raw,
        stepIndex: i + 1,
        timestamp: Date.now(),
      }
      steps.push(step)
      callbacks?.onStep?.(step)
      callbacks?.onStatus?.(KIND_STATUS[step.kind] ?? '正在推理…')
      // 推理步骤之间的自然停顿:动作稍长,模拟工具执行耗时
      await sleep(step.kind === 'action' ? 850 : 620)
    }

    callbacks?.onStatus?.('正在生成回答…')
    await sleep(450)

    return {
      answer: scenario.answer,
      steps,
      citations: scenario.citations,
    }
  })()
}

/**
 * 发送法律问题给后端 ReAct 智能体,获取回答
 *
 * @param question 用户的问题
 * @param callbacks 流式回调(onStep:推理步骤逐步到达;onStatus:状态文案)
 * @returns 包含 answer、推理步骤 steps、引用 citations 的响应
 * @throws ApiError 当后端返回非 200 状态码时
 */
export async function askAgent(
  question: string,
  callbacks?: AskCallbacks,
): Promise<AskResponse> {
  // mock 模式:流式返回假数据
  if (USE_MOCK) {
    return mockAskStream(question, callbacks)
  }

  // 正式模式:调用后端 FastAPI 的 POST /api/ask
  const res = await fetch(`${BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question } satisfies AskRequest),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(res.status, text || `请求失败: ${res.statusText}`)
  }

  return res.json() as Promise<AskResponse>
}
