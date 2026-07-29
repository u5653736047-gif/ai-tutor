"""
Pydantic 数据模型：前后端契约的后端侧单一真相源，严格镜像 frontend/src/api/types.ts。
字段名直接用驼峰与前端逐字对齐（比蛇形 + alias 方案简单且不易错）。
FastAPI 的"类型即契约"机制：请求模型触发自动反序列化 + 校验（失败自动返回 422），
response_model 触发自动序列化 + OpenAPI 文档生成 + 多余字段过滤。
"""
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ==================== 请求模型（T2.1 / T2.3） ====================

class AskRequest(BaseModel):
    """POST /api/ask 请求体，对应 types.ts 的 AskRequest"""
    # 语法级校验（T2.1）：min_length 拦空串、max_length 拦超长——
    # 法律问题无需更长，且超长输入会撑大 LLM 上下文；无效请求在进入计费调用前就被拒
    question: str = Field(min_length=1, max_length=2000, description="用户的法律合规问题")

    @field_validator("question")
    @classmethod
    def question_not_blank(cls, v: str) -> str:
        # 语义级校验（T2.3）：纯空白串（如 "   "）能通过 min_length 但无意义，
        # strip 后判空则抛 ValueError，Pydantic 自动转为 422 响应
        if not v.strip():
            raise ValueError("问题不能为空白字符")
        return v


# ==================== 响应模型（T2.2） ====================

class ToolCallFunction(BaseModel):
    """工具调用的函数部分，对应 types.ts 的 ToolCall.function"""
    name: str = Field(description="工具名称，如 vector_search")
    # 注意：arguments 是 JSON 字符串而非对象（types.ts 明确约定，前端 formatArgs 会再 parse）
    arguments: str = Field(description="工具参数，JSON 字符串")


class ToolCall(BaseModel):
    """一次工具调用，对应 types.ts 的 ToolCall"""
    id: str = Field(description="调用标识，前端仅作 key 用")
    type: Literal["function"] = Field(default="function", description="调用类型，固定为 function")
    function: ToolCallFunction


class ReasoningStep(BaseModel):
    """单个推理时间线节点，对应 types.ts 的 ReasoningStep"""
    stepIndex: int = Field(description="节点序号，从 1 连续递增")
    kind: Literal["thought", "action", "observation", "final"] = Field(description="节点类型")
    title: str = Field(description="节点标题，如\"调用 vector_search\"")
    content: str = Field(description="节点内容：思考文本 / 工具说明 / 检索结果摘要")
    toolCall: Optional[ToolCall] = Field(default=None, description="仅 action 节点携带的工具调用详情")
    # JS Date.now() 毫秒语义，生成时用 int(time.time() * 1000)
    timestamp: int = Field(description="节点产生时刻，毫秒时间戳")


class Citation(BaseModel):
    """法规条文引用，对应 types.ts 的 Citation"""
    lawName: str = Field(description="法规简称，如\"个人信息保护法\"")
    articleNo: str = Field(description="条号，如\"第五十二条\"")


class AskResponse(BaseModel):
    """POST /api/ask 响应体，对应 types.ts 的 AskResponse"""
    answer: str = Field(description="最终答案（失败态时为兜底话术）")
    steps: list[ReasoningStep] = Field(description="推理时间线节点列表")
    citations: list[Citation] = Field(description="答案引用的法规条文，已去重")
    # 契约增强：types.ts 暂无此字段（T9.2 同步补充）。
    # 透传 Agent 三态（success / max_steps_reached / llm_error），
    # 业务失败态走 HTTP 200 + status 标记，由前端决定展示样式，不用 5xx 表达
    status: str = Field(default="success", description="业务状态：success / max_steps_reached / llm_error")
