"""
领域问答智能体装配入口。
build_domain_agent() 是唯一的装配函数：FastAPI 后端、测试脚本、命令行入口统一复用，
避免工具注册逻辑多处复制后漂移不一致。
"""
import sys

from backend.core.base_agent import BaseAgent
from backend.agents.react_agent import ReActAgent
from backend.tools.tool_registry import ToolRegistry
from backend.tools.RAG.vector_search import vector_search
from backend.tools.RAG.bm25_search import bm25_search


def build_domain_agent() -> ReActAgent:
    """组装领域问答智能体：注册双检索工具，返回就绪的 Agent"""
    tool_registry = ToolRegistry()  # 实例化工具注册表

    # 注册语义检索工具：description 是 LLM 做工具路由的唯一依据，需写清适用场景
    tool_registry.register_function(
        name="vector_search",
        description="在本地法律法规知识库中做语义检索，当用户问题涉及网络安全、数据安全、个人信息保护等法规内容时使用",
        func=vector_search,
    )

    # 注册关键词检索工具：与 vector_search 互补，负责法律术语/条文号的字面精确匹配
    tool_registry.register_function(
        name="bm25_search",
        description="在本地法律法规知识库中按关键词精确检索条文，当用户问题包含具体法律术语、法规名称、条文号（如\"第五十二条\"）时使用",
        func=bm25_search,
    )

    # 组装 ReAct 智能体：LLM 自主决定调用哪个检索工具、检索几轮，信息足够后才输出答案
    return ReActAgent(llm_client=BaseAgent(), tool_registry=tool_registry)


if __name__ == '__main__':
    # 命令行入口：python -m backend.core.agent_run "你的问题"（不带参数则进入交互式问答）
    agent = build_domain_agent()

    if len(sys.argv) > 1:
        agent.run(" ".join(sys.argv[1:]))
    else:
        print("网络安全与数据合规问答助手（输入 exit 退出）")
        while True:
            question = input("\n请输入问题：").strip()
            if question.lower() in ("exit", "quit", "退出"):
                break
            if question:
                agent.run(question)
