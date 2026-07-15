import inspect
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List
from backend.tools.tool_parameter import ToolParameter

# Python 类型注解到 JSON Schema 类型的映射
_PY_TYPE_TO_JSON = {
    str: "string",
    int: "integer",
    float: "number",
    bool: "boolean",
    list: "array",
    dict: "object",
}

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


class FunctionTool(Tool):
    """
    将普通函数适配为 Tool 对象，使其能统一注册到 ToolRegistry 并参与 Function Calling
    """

    def __init__(self, name: str, description: str,
                 func: Callable[..., str],  # 这里的 ... (Ellipsis) 表示该可调用对象可以接受任意数量和类型的参数，并返回 str 类型
                 parameters: List[ToolParameter] = None):
        super().__init__(name, description)
        self._func = func  # 保存被包装的原始函数，供 run() 调用
        # 未显式提供参数定义时，从函数签名自动推导
        self._parameters = parameters if parameters is not None else self._infer_parameters(func)

    @staticmethod
    def _infer_parameters(func: Callable[..., str]) -> List[ToolParameter]:
        """
        读取函数签名，把每个形参转成一条 ToolParameter 定义
        """
        params = []
        for pname, p in inspect.signature(func).parameters.items():
            # 跳过 *args / **kwargs，它们无法映射为固定参数
            if p.kind in (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD):
                continue
            # 把 Python 类型注解映射为 JSON Schema 类型，无注解则默认 string
            ptype = _PY_TYPE_TO_JSON.get(p.annotation, "string")
            # 没有默认值的形参视为必填
            required = p.default is inspect.Parameter.empty
            params.append(ToolParameter(
                name=pname,
                type=ptype,
                description=f"参数 {pname}",
                required=required,
                default=None if required else p.default,  # 必填参数无默认值
            ))
        return params

    def get_parameters(self) -> List[ToolParameter]:
        # 返回参数定义，供基类 to_function_calling_schema() 生成 schema
        return self._parameters

    def run(self, parameters: Dict[str, Any]) -> str:
        # LLM 传回的 arguments 为 dict，解包为关键字参数调用原函数
        return self._func(**parameters)