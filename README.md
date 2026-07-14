# 面向网络安全与数据合规领域的智能知识问答系统

> 基于自建 ReAct 智能体框架，不依赖 LangChain，从零构建可追溯的法律知识推理能力。

## 项目简介

本项目是一个面向 **网络安全与数据合规领域** 的智能知识问答系统，底层采用自建的 **ReAct（Reasoning + Acting）范式** 智能体框架。用户以自然语言提问，系统通过自主推理、多步检索法律知识库，生成可追溯、有法条依据的法律知识回答。

知识库规划涵盖 8 部核心法律法规，包括《网络安全法》《数据安全法》《个人信息保护法》及 AI 专项监管规定等，支持企业合规咨询、AI 服务合规自查、个人权益保护咨询等应用场景。

> 📌 **当前阶段**：ReAct 智能体核心框架、Function Calling 工具调度系统已完成开发；法律知识库与检索工具正在构建中。
>
> ⚠️ **免责声明**：本系统提供的回答仅用于法律知识科普和辅助参考，不能替代专业律师的法律意见。涉及具体法律事务请咨询执业律师。

## 系统架构

```
┌─────────────────────────────────────────────────┐
│                  🖥️ Electron 桌面壳 (🔲 规划中)    │
│  ┌───────────────┐  ┌──────────────────────────┐ │
│  │  Main Process  │  │   Renderer (Chromium)    │ │
│  │  窗口管理 +     │  │   TypeScript 前端         │ │
│  │  Python sidecar│  │   React + Vite            │ │
│  └───────────────┘  └──────────────────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │ HTTP + WebSocket (🔲 规划中)
┌──────────────────────┴──────────────────────────┐
│              Python 后端 (✅ 核心已就绪)           │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │          自建 ReAct Agent 核心 ✅             │ │
│  │   Thought → Function Calling → Observation  │ │
│  │   BaseAgent + ReActAgent + ToolRegistry     │ │
│  └──────────────────────┬──────────────────────┘ │
│                         │                         │
│  ┌──────────┬──────────┬──────────┬──────────┐  │
│  │ BM25 检索 │ 向量检索  │ 关键词检索 │ 元数据查询│  │
│  │rank-bm25 │  FAISS   │  jieba   │ 分类过滤  │  │
│  │  🔲      │   🔲     │   🔲     │   🔲     │  │
│  └──────────┴──────────┴──────────┴──────────┘  │
│                         │                         │
│              ┌──────────┴──────────┐              │
│              │   📚 领域法律知识库   │              │
│              │  JSON + 向量索引     │              │
│              │      🔲 构建中       │              │
│              └─────────────────────┘              │
└───────────────────────────────────────────────────┘
```

## 项目结构

```
HelloAgents/
├── .env                              # 环境变量（LLM API Key 等）
├── requirements.txt                  # Python 依赖
├── README.md
├── learning/                         # 📚 学习笔记与实验代码
│   ├── 4.1.3封装基础LLM调用函数.py     #   LLM 调用封装（流式输出）
│   ├── 4.2ReAct智能体的编码实现.py     #   ReAct 文本解析版 + SerpAPI 搜索
│   └── function_calling_demo.py      #   Function Calling 原理演示
└── react-cs-tutor/                   # 🚀 正式项目代码
    ├── backend/                      # Python 后端
    │   ├── core/                     # 核心框架层
    │   │   └── base_agent.py         #   BaseAgent — LLM 调用统一封装
    │   ├── agents/                   # 智能体层
    │   │   └── react_agent.py        #   ReActAgent（Function Calling 版）
    │   ├── tools/                    # 工具系统层
    │   │   ├── tool.py               #   Tool 抽象基类
    │   │   ├── tool_parameter.py     #   ToolParameter 参数定义（Pydantic）
    │   │   ├── tool_registry.py      #   ToolRegistry 工具注册中心
    │   │   └── builtin/              #   内置工具
    │   │       └── calculator_tool.py #   CalculatorTool 示例工具
    │   └── knowledge/                # 知识库层（规划中）
    │       └── data/                 #   法律法规数据目录
    ├── frontend/                     # TypeScript 前端（规划中）
    │   └── src/
    │       ├── api/                  #   后端 API 客户端
    │       └── components/           #   React 组件
    └── electron/                     # Electron 桌面壳（规划中）
```

## 核心特性

- ✅ **自建 ReAct 智能体框架** — 不依赖 LangChain，纯 Python 手写 Thought → Action → Observation 推理循环
- ✅ **Function Calling 工具调度** — 基于 OpenAI 兼容 API，Agent 自主决策调用哪个检索工具、传什么参数
- ✅ **可扩展工具系统** — `Tool` 抽象基类 + `ToolRegistry` 注册机制，检索工具即插即用
- ✅ **DeepSeek API 驱动** — 兼容 OpenAI SDK，成本低、中文法律文本理解能力强
- 🔲 **多路检索工具** — BM25 关键词检索、FAISS 语义向量检索、jieba 分词检索、元数据过滤查询
- 🔲 **推理过程实时可视化** — WebSocket 推送每一步 Thought/Action/Observation，答案可追溯
- 🔲 **Electron 桌面应用** — Python 后端 + TypeScript 前端，双击即用
- 🔲 **法律领域深度适配** — 法条结构化知识库、跨法规交叉引用、强制免责声明

## 知识库内容

系统知识库将涵盖网络安全与数据合规领域 **8 部核心法律法规**：

| 法规名称 | 类型 | 核心内容 |
|----------|------|----------|
| 中华人民共和国网络安全法 | 基础法律 | 网络运行安全、网络信息安全、监测预警与应急处置 |
| 中华人民共和国数据安全法 | 基础法律 | 数据分类分级、安全保护义务、数据出境管理 |
| 中华人民共和国个人信息保护法 | 基础法律 | 个人信息处理规则、个人权利、跨境提供规则 |
| 网络数据安全管理条例 | 配套法规 | 网络数据处理细化规则 |
| 关键信息基础设施安全保护条例 | 配套法规 | 关基认定标准、运营者安全责任义务 |
| 生成式人工智能服务管理暂行办法 | AI 专项 | 生成式 AI 服务提供者合规义务 |
| 互联网信息服务算法推荐管理规定 | AI 专项 | 算法推荐服务规范与备案要求 |
| 互联网信息服务深度合成管理规定 | AI 专项 | 深度合成内容标识与审核管理 |

## 应用场景

| 场景 | 典型问题举例 | 涉及法规 |
|------|-------------|----------|
| 企业数据合规咨询 | "收集用户手机号需要遵守哪些规定？" | 个保法 + 数安法 + 网络数据安全管理条例 |
| AI 服务合规自查 | "上线 AI 产品需要做什么备案？" | 生成式 AI 办法 + 算法推荐规定 + 深度合成规定 |
| 个人权益保护咨询 | "APP 未经同意读取通讯录怎么投诉？" | 个保法 + 网安法 |
| 关键信息基础设施认定 | "我们的系统算不算关键信息基础设施？" | 关基保护条例 + 网安法 |
| 数据出境合规咨询 | "用户数据传到海外需要满足什么条件？" | 个保法 + 数安法 + 网络数据安全管理条例 |

## 技术栈

| 层次 | 技术 | 状态 |
|------|------|------|
| LLM 调用 | OpenAI SDK + DeepSeek API（deepseek-v4-flash） | ✅ |
| 智能体框架 | 自建 ReAct 框架（纯 Python，Function Calling 模式） | ✅ |
| 工具系统 | Pydantic v2 + ABC 抽象基类 + ToolRegistry | ✅ |
| 环境管理 | python-dotenv | ✅ |
| 后端框架 | Python + FastAPI（HTTP + WebSocket） | 🔲 |
| 稀疏检索 | rank-bm25 + jieba 中文分词 | 🔲 |
| 稠密检索 | sentence-transformers + FAISS 向量索引 | 🔲 |
| 前端 | TypeScript + React + Vite | 🔲 |
| 桌面壳 | Electron | 🔲 |

## ReAct 工作原理

系统核心是自建的 ReAct 智能体。当用户提出一个法律合规问题，Agent 自主进行多步推理：

```
用户提问: "开发一个AI聊天机器人上线，需要遵守什么法规？"

Step 1  Thought: 用户想了解AI聊天机器人的合规要求，先用向量检索查找相关法规
        Action: vector_search
        Action Input: {"query": "AI聊天机器人 合规 法规要求"}
        Observation: 检索到《生成式人工智能服务管理暂行办法》相关条文...

Step 2  Thought: 找到了生成式AI的规定，但可能还需要算法推荐和深度合成相关法规
        Action: bm25_search
        Action Input: {"query": "算法推荐 深度合成 服务提供者 义务"}
        Observation: 检索到《算法推荐管理规定》《深度合成管理规定》相关条文...

Step 3  Thought: 已获得足够信息，综合三部法规给出结构化回答
        Final Answer: 开发AI聊天机器人上线需遵守以下法规：
          1.《生成式人工智能服务管理暂行办法》— 需进行安全评估和备案...
          2.《互联网信息服务算法推荐管理规定》— 需备案算法推荐服务...
          3.《互联网信息服务深度合成管理规定》— 需标识AI生成内容...
          📎 参考资料：生成式AI办法第X条 | 算法推荐规定第X条 | 深度合成规定第X条
```

**技术实现**：底层采用 Function Calling 模式，LLM 返回结构化的工具调用指令（函数名 + JSON 参数），`ToolRegistry` 自动调度执行对应检索工具，整个过程无需正则解析，稳定可靠。

## 核心模块说明

### `BaseAgent`（`backend/core/base_agent.py`）

LLM 调用统一封装，负责与 DeepSeek API 交互：
- `thinking()` — 非流式调用，支持 Function Calling（传递 tools schema 给 LLM）
- 自动从 `.env` 读取配置，也可通过构造函数参数灵活指定

### `ReActAgent`（`backend/agents/react_agent.py`）

Function Calling 版 ReAct 智能体，核心流程：
1. 接收用户问题，构造 `[system, user]` messages
2. 将 `ToolRegistry` 中的工具转为 OpenAI Function Calling tools schema
3. 循环调用 LLM：有 `tool_calls` 则执行工具并把结果追加到 messages，无则返回最终答案
4. `max_steps` 控制最大推理步数，防止无限循环

### Tool 工具系统（检索工具基座）

```
Tool (ABC)                         # 抽象基类 — 所有检索工具的统一接口
├── run(parameters) → str         #   执行工具（如 BM25 检索、向量检索）
├── get_parameters() → list       #   参数定义（如 query、top_k）
└── to_function_calling_schema()  #   自动转为 OpenAI Function Calling JSON Schema

ToolParameter (Pydantic)           # 参数定义，类型安全
├── name / type / description
├── required / default

ToolRegistry                       # 工具注册中心
├── register_tool(Tool)           #   注册 Tool 对象（如 Bm25Tool、VectorTool）
├── register_function(...)        #   快速注册普通函数为工具
├── to_function_calling_tools()   #   生成传给 LLM 的 tools 参数列表
└── get_tool_map()                #   获取 工具名→执行函数 映射，供 Agent 调度
```

### 内置工具

| 工具 | 文件 | 说明 |
|------|------|------|
| `calculator` | `builtin/calculator_tool.py` | 基础数学运算（加减乘除），示例工具 |

## 快速开始

### 环境要求

- Python 3.10+

### 安装与运行

```bash
# 1. 进入项目目录
cd HelloAgents

# 2. 创建虚拟环境
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS / Linux

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量（编辑项目根目录 .env 文件）
# LLM_BASE_URL = "https://api.deepseek.com"
# LLM_API_KEY = "your_api_key_here"
# LLM_MODEL = "deepseek-v4-flash"

```

### 配置说明

项目根目录 `.env` 文件：

```env
LLM_BASE_URL = "https://api.deepseek.com"
LLM_API_KEY = "your_api_key_here"
LLM_MODEL = "deepseek-v4-flash"
LLM_TIMEOUT = 50
SERPAPI_API_KEY = "your_serpapi_key_here"   # 可选，用于搜索工具
```

## 开发计划

- [x] LLM 调用封装（`BaseAgent` — Function Calling 支持）
- [x] Function Calling 原理学习与演示
- [x] ReAct 智能体 — 文本解析版（`learning/`）
- [x] ReAct 智能体 — Function Calling 版（`react-cs-tutor/`）
- [x] 可扩展工具系统（`Tool` 基类 + `ToolRegistry` + `ToolParameter`）
- [x] CalculatorTool 示例工具
- [ ] 法律知识库构建（8 部法律法规结构化 JSON 数据）
- [ ] 检索工具开发 — BM25 关键词检索（rank-bm25 + jieba）
- [ ] 检索工具开发 — FAISS 语义向量检索（sentence-transformers）
- [ ] 检索工具开发 — 关键词检索 + 元数据过滤查询
- [ ] FastAPI 后端接口（`POST /ask` + WebSocket `/stream`）
- [ ] TypeScript 前端（React + Vite，含推理过程可视化）
- [ ] Electron 桌面壳（Python sidecar 自动拉起）
- [ ] 系统集成联调与测试

## License

MIT License
