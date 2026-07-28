import json
from typing import Any, Optional, TypedDict
from backend.core.base_agent import BaseAgent
from backend.tools.tool_registry import ToolRegistry

SYSTEM_AGENT_PROMPT = """
你是网络安全与数据合规领域的智能问答助手，可调用检索工具查询本地法规知识库。必须遵守：
1. 只依据检索到的资料回答，不得脱离资料随意生成；
2. 分点作答，标注来源（法规名 + 条号）；
3. 资料不足时明确回答"根据当前知识库无法确定"，不得编造；
4. 回答末尾附免责声明：内容仅供法律知识科普参考，不能替代专业律师意见。
"""


class ToolAction(TypedDict):
    """一次工具调用：工具名 + LLM 给出的参数"""
    tool: str
    arguments: dict[str, Any]


class Step(TypedDict):
    """
    一轮 ReAct 推理的结构化记录：
    thought 为 LLM 本轮思考（Function Calling 模式下常为空，属正常）；
    actions 与 observations 一一对应；末轮（直接作答）actions 为空列表。
    """
    step: int
    thought: Optional[str]
    actions: list[ToolAction]
    observations: list[str]


class AgentResult(TypedDict):
    """
    run() 的结构化返回：推理过程从"日志"变成"数据"，供前端/后端直接消费。
    全部为可 JSON 序列化的基本类型，WebSocket 可逐 step 推送。
    status: success（正常作答）/ max_steps_reached（步数耗尽）/ llm_error（LLM 故障）
    """
    question: str
    answer: Optional[str]
    status: str
    steps: list[Step]


class ReActAgent:
    """定义ReAct智能体类"""
    def __init__(self,llm_client : BaseAgent, tool_registry : ToolRegistry, max_steps : int = 20):
        self.llm_client = llm_client
        self.tool_registry = tool_registry
        self.max_steps = max_steps


    def run(self,question : str) -> AgentResult:
        """
        运行 ReAct 智能体来回答问题，返回 AgentResult（结构化推理过程 + 最终答案）
        """

        messages = [
            {"role" : "system", "content" : SYSTEM_AGENT_PROMPT},
            {"role" : "user", "content" : question}
        ]

        tools = self.tool_registry.to_function_calling_tools()
        tool_map = self.tool_registry.get_tool_map()
        steps: list[Step] = []  # 推理链记录，与 print 日志同一份真相

        for step in range(self.max_steps):
            print(f"\n---当前是第 {step + 1} 轮思考---")

            message = self.llm_client.thinking(messages, tools, "auto", 0.1)
            if not message:
                print("LLM 未能返回有效输出")
                return {"question": question, "answer": None, "status": "llm_error", "steps": steps}

            # 将 LLM 输出追加到 message 列表当中
            messages.append(message)

            # 没有工具调用（tool_calls）则是最终答案轮：记一条收尾 step 后返回
            if not message.tool_calls:
                print(f"最终答案：{message.content}")
                steps.append({"step": step + 1, "thought": message.content,
                              "actions": [], "observations": []})
                return {"question": question, "answer": message.content,
                        "status": "success", "steps": steps}

            actions: list[ToolAction] = []
            observations: list[str] = []
            for tool_call in message.tool_calls:
                function_name = tool_call.function.name # 工具调用中返回的工具名称
                raw_arguments = tool_call.function.arguments or {}

                try:
                    arguments = json.loads(raw_arguments)
                except json.JSONDecodeError as e:
                    arguments = {}
                    result = f"参数解析失败：{e}，请检查参数 arguments 是否未合法JSON。原始输入：{raw_arguments}"
                    print(result)

                else:
                    print(f"调用工具：{function_name}({arguments})\n")

                    if function_name not in tool_map:
                        result = f"工具 \"{function_name}\" 未找到"
                    else:
                        try:
                            result = tool_map[function_name](arguments)
                        except Exception as e:
                            result = f"工具 \"{function_name}\" 执行出错：{type(e).__name__}:{e}，请检查参数或换一种方式"
                            print(f"工具 {function_name} 执行异常：{e}")

                print(f"工具返回结果：{result}")
                actions.append({"tool": function_name, "arguments": arguments})
                observations.append(str(result))
                messages.append({
                    "role" : "tool",
                    "tool_call_id" : tool_call.id,
                    "content" : str(result)
                })

            steps.append({"step": step + 1, "thought": message.content,
                          "actions": actions, "observations": observations})

        # 步数耗尽属于失败态：answer 给兜底话术，但 status 显式标记，调用方不应按正常答案展示
        print(f"以达到最大推理步数 {self.max_steps} ，未能给出最终答案")
        return {"question": question,
                "answer": f"抱歉，经过最大推理步数 {self.max_steps} ，未能给出最终答案",
                "status": "max_steps_reached", "steps": steps}
