from backend.tools.RAG.vector_store import load_retriever_assets
from backend.tools.RAG.embedding import encode_query

# 相似度阈值：低于该值的结果视为无关噪音直接丢弃
# 实测分布（136 条法规库）：相关 query 得分 0.50~0.67，无关 query 得分 0.07~0.12，0.3 位于中间安全区
SCORE_THRESHOLD = 0.3

_assets = None

def _get_assets():
    """懒加载检索资产"""
    global _assets
    if _assets is None:
        index, _meta, meta_by_faiss = load_retriever_assets()
        _assets = (index, meta_by_faiss)
    return _assets

def vector_search(query: str, top_k: int = 3) -> str:
    """
    在本地法律法规知识库中做语义检索，返回与 query 最相关的条文。
    当用户问题涉及网络安全、数据安全、个人信息保护等法规内容时使用。
    """
    print(f"正在执行[vector_search]知识库检索：{query}")
    try:
        index, meta_by_faiss = _get_assets()
        query_vec = encode_query(query)

        # FAISS检索 top_k, scores 为余弦相似度（归一化向量的内积）
        # 返回二维数组（支持批量查询），本工具只有单条查询，取 [0]
        scores, faiss_ids = index.search(query_vec, top_k)

        hits = []
        for score, faiss_id in zip(scores[0], faiss_ids[0]):
            # faiss_id == -1 是 FAISS 在命中不足 top_k 条时的填充值，必须跳过
            if faiss_id == -1 or score < SCORE_THRESHOLD:
                continue
            # faiss_id 是 numpy 整数，转 int 再查字典更稳妥
            # 存 (score, rec) 二元组，供下方格式化时解包
            hits.append((float(score), meta_by_faiss[int(faiss_id)]))

        # 兜底：一条都不达标时明确告知，防止 LLM 脱离知识库硬编答案
        if not hits:
            return f"未找到与 {query} 相关的内容。"

        # 格式化为 LLM 易读的 Observation 文本，附来源便于答案追溯
        blocks = [
            f"[{i + 1}] (相似度：{score:.2f} | 来源：{rec['source']} | 分类：{rec['category']})\n{rec['content']}"
            for i, (score, rec) in enumerate(hits)
        ]
        return "\n\n".join(blocks)

    except Exception as e:
        # 错误也以字符串返回（而非抛出），保证 ReAct 循环不中断，由 LLM 自行消化
        return f"检索时发生错误：{e}"



        

if __name__ == "__main__":
    # 冒烟测试：相关 query 应命中条文并带来源，无关 query 应触发兜底
    print(vector_search("收集用户手机号需要什么条件"))
    print("---")
    print(vector_search("今天中午吃什么"))
