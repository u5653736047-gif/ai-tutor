# HelloAgents — 自建 ReAct 智能体框架

> 从零手写 ReAct（Reasoning + Acting）智能体，不依赖 LangChain，深入理解 AI Agent 核心原理。

## 项目简介

**HelloAgents** 是一个用于学习与实践 AI 智能体（Agent）技术的项目。项目从最基础的 LLM 调用封装开始，逐步构建完整的 ReAct 智能体框架，最终目标为打造一个面向 **网络安全与数据合规领域** 的智能知识问答系统。

当前阶段已完成 **ReAct 智能体核心框架** 的开发，支持 Function Calling 模式下的工具自主调度，使用 DeepSeek API 驱动。

> ⚠️ **免责声明**：本系统在法律场景下提供的回答仅用于知识科普和辅助参考，不能替代专业律师的法律意见。

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

- ✅ **自建 ReAct 智能体框架** — 不依赖 LangChain，纯 Python 手写推理循环
- ✅ **Function Calling 原生支持** — 基于 OpenAI 兼容 API，无需正则解析工具调用
- ✅ **可扩展工具系统** — `Tool` 抽象基类 + `ToolRegistry` 注册机制，轻松添加新工具
- ✅ **DeepSeek API 驱动** — 兼容 OpenAI SDK，成本低、中文能力强
- 🔲 **多工具自主调度** — BM25 检索、向量检索、关键词检索等（规划中）
- 🔲 **推理过程实时可视化** — WebSocket 推送推理步骤（规划中）
- 🔲 **Electron 桌面应用** — 双击即用（规划中）

## 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| LLM 调用 | OpenAI SDK + DeepSeek API | 兼容 OpenAI 接口，使用 deepseek-v4-flash |
| 智能体框架 | 自建 ReAct（纯 Python） | Thought → Action → Observation 循环 |
| 工具系统 | Pydantic v2 + ABC 抽象基类 | 参数校验 + OpenAI Function Calling Schema 转换 |
| 环境管理 | python-dotenv | .env 文件管理 API Key 等配置 |
| HTTP 客户端 | httpx + requests | SSL 证书兼容处理（开发环境） |
| 前端 | TypeScript + React + Vite | 🔲 规划中 |
| 桌面壳 | Electron | 🔲 规划中 |
| 检索技术 | BM25 / FAISS / jieba | 🔲 规划中 |

## ReAct 工作原理

项目实现了两种 ReAct 模式：

### 模式一：文本解析版（`learning/4.2ReAct智能体的编码实现.py`）

```
用户提问 → LLM 按提示词模板输出 Thought/Action 文本
                ↓
         正则解析 Thought 和 Action
                ↓
         执行对应工具 → 结果喂回 LLM
                ↓
         循环直到输出 Finish[最终答案]
```

### 模式二：Function Calling 版（`react-cs-tutor/`）⭐ 当前主力

```
用户提问 → LLM 判断是否需要工具
                ↓ 是                          ↓ 否
         返回结构化 tool_calls           直接返回文本回答
         (函数名 + JSON 参数)
                ↓
         ToolRegistry 调度执行工具
                ↓
         工具结果作为 tool 消息发回 LLM
                ↓
         模型综合结果生成最终回答
```

**Function Calling 优势**：不依赖正则解析，API 层面保证工具调用参数结构正确，更稳定可靠。

## 核心模块说明

### `BaseAgent`（`backend/core/base_agent.py`）

LLM 调用统一封装，支持：
- `thinking()` — 非流式调用，支持 Function Calling（tools 参数）
- 自动从 `.env` 读取配置，也可通过构造函数参数传入

### `ReActAgent`（`backend/agents/react_agent.py`）

Function Calling 版 ReAct 智能体，核心流程：
1. 接收用户问题，构造 `[system, user]` messages
2. 将 `ToolRegistry` 中的工具转为 OpenAI Function Calling tools schema
3. 循环调用 LLM：有 `tool_calls` 则执行工具并把结果追加到 messages，无则返回最终答案
4. `max_steps` 控制最大推理步数，防止无限循环

### Tool 工具系统

```
Tool (ABC)                         # 抽象基类
├── run(parameters) → str         #   执行工具
├── get_parameters() → list       #   参数定义
└── to_function_calling_schema()  #   转为 OpenAI Function 格式

ToolParameter (Pydantic)           # 参数定义
├── name / type / description
├── required / default

ToolRegistry                       # 工具注册中心
├── register_tool(Tool)           #   注册 Tool 对象
├── register_function(...)        #   快速注册普通函数
├── to_function_calling_tools()   #   生成 LLM tools 参数
└── get_tool_map()                #   获取 名称→执行函数 映射
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

## 知识库规划（目标场景）

系统最终将面向 **网络安全与数据合规领域**，涵盖 8 部核心法律法规：

| 法规名称 | 类型 |
|----------|------|
| 中华人民共和国网络安全法 | 基础法律 |
| 中华人民共和国数据安全法 | 基础法律 |
| 中华人民共和国个人信息保护法 | 基础法律 |
| 网络数据安全管理条例 | 配套法规 |
| 关键信息基础设施安全保护条例 | 配套法规 |
| 生成式人工智能服务管理暂行办法 | AI 专项 |
| 互联网信息服务算法推荐管理规定 | AI 专项 |
| 互联网信息服务深度合成管理规定 | AI 专项 |

## 开发计划

- [x] LLM 调用封装（`BaseAgent` — 非流式 + Function Calling 支持）
- [x] Function Calling 原理学习与演示
- [x] ReAct 智能体 — 文本解析版（`learning/`）
- [x] ReAct 智能体 — Function Calling 版（`react-cs-tutor/`）
- [x] 可扩展工具系统（`Tool` 基类 + `ToolRegistry`）
- [x] CalculatorTool 示例工具
- [ ] 知识库构建（8 部法律法规结构化数据）
- [ ] 检索工具开发（BM25 / 向量 / 关键词 / 元数据查询）
- [ ] FastAPI 后端接口（HTTP + WebSocket）
- [ ] TypeScript 前端（React + Vite）
- [ ] Electron 桌面壳
- [ ] 系统集成联调与测试

## License

MIT License
