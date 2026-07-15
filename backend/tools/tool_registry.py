from backend.tools.tool import Tool, FunctionTool
from backend.tools.tool_parameter import ToolParameter
from typing import Any, Callable

class ToolRegistry:
    """Agents工具注册表"""

    def __init__(self):
        self._tools: dict[str, Tool] = {}

    def register_tool(self, tool: Tool):
        """注册Tool对象"""
        if tool.name in self._tools:
            print(f"⚠️ 警告:工具 '{tool.name}' 已存在，将被覆盖。")
        self._tools[tool.name] = tool
        print(f"✅ 工具 '{tool.name}' 已注册。")
        
    def register_function(self, name: str, description: str,
                          func: Callable[..., str],
                          parameters: list[ToolParameter] = None):
        """
        直接注册函数作为工具（简便方式）

        内部将函数包装为 FunctionTool 并归入统一的 _tools 通道，
        确保其能被 to_function_calling_tools() 与 get_tool_map() 正常消费。

        Args:
            name: 工具名称
            description: 工具描述
            func: 工具函数
            parameters: 可选的参数定义；缺省时从函数签名自动推导
        """
        self.register_tool(FunctionTool(name, description, func, parameters))

    def to_function_calling_tools(self) -> list[dict]:
        """
        生成传给 LLM 的 tools 参数列表
        """
        tools = []
        for tool in self._tools.values():
            tools.append(tool.to_function_calling_schema())
        return tools

    def get_tool_map(self) -> dict[str,Callable]:
        """
        返回 工具名 -> 执行函数 的映射，供 Agent 调用工具时使用
        """
        return {name : tool.run for name, tool in self._tools.items()}