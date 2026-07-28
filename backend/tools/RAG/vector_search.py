from backend.tools.RAG.vector_store import load_retriever_assets
from backend.tools.RAG.embedding import encode_query

SCORE_THRESHOLD = 0.3

_assets = None

def _get_assets():
    """懒加载检索资产"""
    global _assets
    if _assets is None:
        index, _meta, meta_by_faiss = load_retriever_assets()
        _assets = (index, meta_by_faiss)
    return _assets

def vector_search(query: str, top_k: int = 3):
    print(f"正在执行[vector_search]知识库检索：{query}")
    try:
        index, meta_by_faiss = _get_assets()
        query_vec = encode_query(query)
        
        # FAISS检索 top_k, scores 为余弦相似度
        scores, faiss_ids = index.search(query_vec, top_k)

        hits = []
        for score, faiss_id in zip(scores[0],faiss_ids[0]):
            if faiss_id == -1 or score < SCORE_THRESHOLD:
                continue
            rec = meta_by_faiss[faiss_id]
            hits.append(rec)

        if not hits:
            return f"未找到与 {query} 相关的内容。"
        
        bolcks = [
            f"[{i + 1}] (相似度：{score:.2f} | 来源：{rec['source']} | 分类：{rec['category']})\n{rec['content']}"
            for i, (score, rec) in enumerate(hits)
        ]
        return "\n\n".join(bolcks)

    except Exception as e:
        return f"检索时发生错误：{e}"



        