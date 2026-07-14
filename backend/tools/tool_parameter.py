from pydantic import BaseModel # 让参数定义更安全
from typing import Any

class ToolParameter(BaseModel):
    """工具参数定义"""
    name: str
    type: str
    description: str
    required: bool = True
    default: Any = None