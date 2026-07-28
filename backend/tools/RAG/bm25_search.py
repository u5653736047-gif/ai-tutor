"""
bm25_search 工具：在本地法规知识库中做关键词稀疏检索。
与 vector_search（语义向量检索）互补：
  向量检索管"意思相近"，BM25 管"字面精确"——对法律术语、条文号等精确匹配更可靠。
复用 RAG/bm25.py 的 BM25Retriever（TF 饱和 + IDF 区分度 + 长度归一化）。
"""
from backend.tools.RAG.vector_store import load_meta
from backend.tools.RAG.bm25 import BM25Retriever

_retriever = None
_meta = None


def _get_retriever():
    """懒加载 BM25 检索器：首次调用时读取 meta 并构建索引（分词/IDF 只算一次）"""
    global _retriever, _meta
    if _retriever is None:
        _meta = load_meta()
        _retriever = BM25Retriever(documents=_meta)
    return _retriever, _meta


def bm25_search(query: str, top_k: int = 3) -> str:
    """
    在本地法律法规知识库中按关键词精确检索条文。
    当用户问题包含具体法律术语、法规名称、条文号（如"第五十二条"）时使用。
    """
    print(f"正在执行[bm25_search]关键词检索：{query}")
    try:
        retriever, meta = _get_retriever()

        # BM25 得分无固定值域（非 0~1），无法用绝对阈值过滤；
        # 但得分为 0 表示与 query 没有任何共同词项，是必然无关的噪音，直接丢弃
        results = [(score, idx) for score, idx in retriever.search(query, top_k) if score > 0]

        # 兜底：一条正分都没有时明确告知，防止 LLM 脱离知识库硬编答案
        if not results:
            return f"未找到与 {query} 相关的内容。"

        # 格式化为 LLM 易读的 Observation 文本，输出结构与 vector_search 对齐
        blocks = [
            f"[{i + 1}] (BM25得分：{score:.2f} | 来源：{meta[idx]['source']} | 分类：{meta[idx]['category']})\n{meta[idx]['content']}"
            for i, (score, idx) in enumerate(results)
        ]
        return "\n\n".join(blocks)

    except Exception as e:
        # 错误也以字符串返回（而非抛出），保证 ReAct 循环不中断，由 LLM 自行消化
        return f"检索时发生错误：{e}"


if __name__ == "__main__":
    # 冒烟测试：含精确术语的 query 应命中条文，无关 query 应触发兜底
    print(bm25_search("个人信息保护负责人"))
    print("---")
    print(bm25_search("今天中午吃什么"))
