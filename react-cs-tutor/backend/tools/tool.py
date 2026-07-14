from abc import ABC, abstractmethod
from typing import Any, Dict, List
from backend.tools.tool_parameter import ToolParameter
class Tool(ABC):
    """工具基类"""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    @abstractmethod
    def run(self, parameters: Dict[str, Any]) -> str:
        """执行工具"""
        pass

    @abstractmethod
    def get_parameters(self) -> List[ToolParameter]:
        """获取工具参数定义"""
        pass

    def to_function_calling_schema(self) -> dict:
        """
        将工具定义转为 OpenAI Function Calling 格式
        """
        properties = {}
        required = []
        for param in self.get_parameters():
            properties[param.name] = {
                "type" : param.type,
                "description" : param.description
            }
            if param.required:
                required.append(param.name)
        
        return {
            "type" : "function",
            "function" : {
                "name" : self.name,
                "description" : self.description,
                "parameters" : {
                    "type" : "object",
                    "properties" : properties,
                    "required" : required
                }
            }
        }