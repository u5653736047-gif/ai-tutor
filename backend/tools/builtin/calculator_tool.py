from backend.tools.tool import Tool
from backend.tools.tool_parameter import ToolParameter
from typing import Any, Dict

class CalculatorTool(Tool):
    def __init__(self):
        super().__init__(
            name="calculator",
            description="执行基础数学运算，支持加减乘除"
        )

    def get_parameters(self) -> list[ToolParameter]:
        return [
            ToolParameter(name="expression", type="string",
                          description="数学表达式，如 '2 + 3 * 4'")
        ]

    def run(self, parameters: dict[str, Any]) -> str:
        expression = parameters["expression"]
        try:
            result = eval(expression)  # 生产环境应用更安全的解析
            return str(result)
        except Exception as e:
            return f"计算出错: {e}"