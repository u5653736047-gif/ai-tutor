import json
from backend.core.base_agent import BaseAgent
from backend.tools.tool_registry import ToolRegistry

SYSTEM_AGENT_PROMPT = """
你是一个具有调用外部工具能力的智能问答助手。当用户询问问题时，你需要调用外部工具来检索相关内容，并将检索的内容整合后返回给用户。
"""

class ReActAgent:
    """定义ReAct智能体类"""
    def __init__(self,llm_client : BaseAgent, tool_registry : ToolRegistry, max_steps : int = 20):
        self.llm_client = llm_client
        self.tool_registry = tool_registry
        self.max_steps = max_steps
        self.history = []


    def run(self,question : str):
        """
        运行 ReAct 智能体来回答问题
        """ 

        messages = [
            {"role" : "system", "content" : SYSTEM_AGENT_PROMPT},
            {"role" : "user", "content" : question}
        ]
        
        tools = self.tool_registry.to_function_calling_tools()
        tool_map = self.tool_registry.get_tool_map()

        for step in range(self.max_steps):
            print(f"\n---当前是第 {step + 1} 轮思考---")

            message = self.llm_client.thinking(messages, tools, "auto", 0.1)
            if not message:
                print("LLM 未能返回有效输出")
                return None

            # 将 LLM 输出追加到 message 列表当中
            messages.append(message)

            # 没有工具调用（tool_calls）则返回最终答案
            if not message.tool_calls:
                print(f"最终答案：{message.content}")
                return message.content

            for tool_call in message.tool_calls:
                function_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                print(f"调用工具：{function_name} ({arguments})\n")

                if function_name not in tool_map:
                    result = f"工具 \"{function_name}\" 未找到"
                else:
                    result = tool_map[function_name](arguments)

                print(f"工具返回结果：{result}")

                messages.append({
                    "role" : "tool",
                    "tool_call_id" : tool_call.id,
                    "content" : str(result)
                })
