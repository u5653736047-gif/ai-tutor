from backend.core.base_agent import BaseAgent
from backend.agents.react_agent import ReActAgent
from backend.tools.tool_registry import ToolRegistry
from backend.tools.RAG.vector_search import vector_search
from backend.tools.RAG.bm25_search import bm25_search

if __name__ == '__main__':
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

    # 组装 ReAct 智能体：LLM 自主决定调用哪个检索工具，并把检索结果整合为回答
    agent = ReActAgent(llm_client=BaseAgent(), tool_registry=tool_registry)
    agent.run("收集用户手机号需要遵守哪些规定？")
