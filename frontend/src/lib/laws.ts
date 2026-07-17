/* ============================================================
   法规知识库数据 — 侧栏导航与空状态的静态数据源
   ============================================================
   与 README「知识库内容」一节对齐:8 部核心法律法规。
   后端知识库就绪后,这里可以替换为接口数据。
   ============================================================ */

/** 法规分类 */
export type LawCategory = '基础法律' | '配套法规' | 'AI 专项'

export interface LawItem {
  id: string
  /** 全称 */
  name: string
  /** 简称(胶囊标签等紧凑场景用) */
  shortName: string
  category: LawCategory
  /** 条文总数 */
  articles: number
  /** 一句话定位 */
  summary: string
  /** 点击后填入输入框的预置问题 */
  prompt: string
}

export const LAW_CATEGORIES: LawCategory[] = ['基础法律', '配套法规', 'AI 专项']

export const LAWS: LawItem[] = [
  {
    id: 'csl',
    name: '中华人民共和国网络安全法',
    shortName: '网络安全法',
    category: '基础法律',
    articles: 79,
    summary: '网络运行安全、网络信息安全、监测预警与应急处置',
    prompt: '《网络安全法》对网络运营者规定了哪些核心安全义务?',
  },
  {
    id: 'dsl',
    name: '中华人民共和国数据安全法',
    shortName: '数据安全法',
    category: '基础法律',
    articles: 55,
    summary: '数据分类分级、安全保护义务、数据出境管理',
    prompt: '《数据安全法》的数据分类分级制度是怎么要求的?',
  },
  {
    id: 'pipl',
    name: '中华人民共和国个人信息保护法',
    shortName: '个人信息保护法',
    category: '基础法律',
    articles: 74,
    summary: '个人信息处理规则、个人权利、跨境提供规则',
    prompt: '《个人信息保护法》对企业收集个人信息有哪些核心要求?',
  },
  {
    id: 'ndsr',
    name: '网络数据安全管理条例',
    shortName: '网络数据安全管理条例',
    category: '配套法规',
    articles: 64,
    summary: '网络数据处理的细化规则与监督管理',
    prompt: '《网络数据安全管理条例》在三大法基础上细化了哪些要求?',
  },
  {
    id: 'ciio',
    name: '关键信息基础设施安全保护条例',
    shortName: '关基保护条例',
    category: '配套法规',
    articles: 52,
    summary: '关基认定标准、运营者安全责任义务',
    prompt: '什么样的系统会被认定为关键信息基础设施?',
  },
  {
    id: 'genai',
    name: '生成式人工智能服务管理暂行办法',
    shortName: '生成式AI办法',
    category: 'AI 专项',
    articles: 24,
    summary: '生成式 AI 服务提供者的合规义务',
    prompt: '上线生成式 AI 服务需要履行哪些备案和评估义务?',
  },
  {
    id: 'algo',
    name: '互联网信息服务算法推荐管理规定',
    shortName: '算法推荐规定',
    category: 'AI 专项',
    articles: 35,
    summary: '算法推荐服务规范与备案要求',
    prompt: '算法推荐服务的备案流程和要求是什么?',
  },
  {
    id: 'deep',
    name: '互联网信息服务深度合成管理规定',
    shortName: '深度合成规定',
    category: 'AI 专项',
    articles: 25,
    summary: '深度合成内容标识与审核管理',
    prompt: '深度合成内容的标识义务具体有哪些?',
  },
]

/** 空状态的示例问题卡片 */
export interface Suggestion {
  icon: 'building' | 'cpu' | 'globe' | 'shield-alert'
  tag: string
  question: string
}

export const SUGGESTIONS: Suggestion[] = [
  {
    icon: 'building',
    tag: '企业合规',
    question: '收集用户手机号需要遵守哪些规定?',
  },
  {
    icon: 'cpu',
    tag: 'AI 合规',
    question: '上线 AI 聊天产品需要做什么备案?',
  },
  {
    icon: 'globe',
    tag: '数据出境',
    question: '用户数据传到海外需要满足什么条件?',
  },
  {
    icon: 'shield-alert',
    tag: '个人权益',
    question: 'APP 未经同意读取通讯录怎么投诉?',
  },
]
