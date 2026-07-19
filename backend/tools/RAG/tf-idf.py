"""
TF-IDF 稀疏检索器 — 纯 Python 实现，零外部依赖

原理概要：
  TF-IDF = TF(词频) × IDF(逆文档频率)
  - TF：某个词在当前文档中出现的频率，衡量"这个词对本文有多重要"
  - IDF：log(总文档数 / 包含该词的文档数)，衡量"这个词的区分度有多高"
  两者相乘 => 一个词对某篇文档既高频、又在全局稀有，则权重最大

检索流程：
  分词 → 统计 TF/DF → 构建 TF-IDF 向量 → 余弦相似度排序 → 返回 top-k
"""

import math
from collections import Counter


# ======================== 第一层：分词 ========================

def tokenize(text: str) -> list[str]:
    """
    中文分词，jieba 优先，缺失时退化为字符 bigram
    bigram 原理：把 "数据安全" 切成 ["数据", "据安", "安全"]，粗暴但能兜底
    """
    try:
        import jieba
        return [w for w in jieba.cut(text) if w.strip()]
    except ImportError:
        return [text[i:i + 2] for i in range(len(text) - 1)]


# ======================== 第二层：统计 ========================

def compute_tf(tokens: list[str]) -> dict[str, float]:
    """
    计算词频 TF = 该词出现次数 / 文档总词数
    归一化到 [0,1]，消除长短文档的计数偏差
    """
    counter = Counter(tokens) # Counter函数传入一个可迭代对象，自动统计每个元素出现了多少次
    total = len(tokens)
    return {word: count / total for word, count in counter.items()} # .item()函数返回一个(key, value)元组


def compute_df(corpus_tokens: list[list[str]]) -> dict[str, int]:
    """
    计算文档频率 DF = 包含该词的文档篇数
    DF 越高 => 该词越"大众化"，区分度越低（如"的""是"）
    """
    df = Counter()
    for tokens in corpus_tokens:
        df.update(set(tokens))  # set 去重：一篇文档中同词只计一次
    return df


def compute_idf(df: dict[str, int], n_docs: int) -> dict[str, float]:
    """
    计算逆文档频率 IDF = log(总文档数 / DF)
    +1 平滑：防止 DF=0 时除零（实际不会出现，但防御性编程）
    """
    return {word: math.log(n_docs / (freq + 1)) for word, freq in df.items()}


# ======================== 第三层：向量化 ========================

def build_tfidf_vector(tf: dict[str, float], idf: dict[str, float]) -> dict[str, float]:
    """
    生成单篇文档的 TF-IDF 稀疏向量（用 dict 表示，只存非零项）
    权重 = TF × IDF：高频且稀有的词获得最大权重
    """
    return {word: tf_val * idf.get(word, 0.0) for word, tf_val in tf.items()}


def cosine_similarity(vec_a: dict[str, float], vec_b: dict[str, float]) -> float:
    """
    余弦相似度 = A·B / (|A| × |B|)
    值域 [0,1]（TF-IDF 权重非负），越接近 1 表示语义越相近
    """
    # 点积：只遍历较短的向量，减少无效计算
    if len(vec_a) > len(vec_b):
        vec_a, vec_b = vec_b, vec_a
    dot = sum(vec_a[w] * vec_b[w] for w in vec_a if w in vec_b)

    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))

    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


# ======================== 第四层：检索器 ========================

class TfidfRetriever:
    """
    TF-IDF 检索器：传入文档列表，构建索引后支持 query 检索
    documents 格式：[{"content": "条文内容", ...其他元数据}, ...]
    """

    def __init__(self, documents: list[dict]):
        self.documents = documents
        self.n_docs = len(documents)

        # 对所有文档分词（只执行一次，后续检索复用）
        self.corpus_tokens = [tokenize(doc["content"]) for doc in documents]

        # 全局统计量：DF 和 IDF 在语料确定后就不变了
        self.df = compute_df(self.corpus_tokens)
        self.idf = compute_idf(self.df, self.n_docs)

        # 预计算每篇文档的 TF-IDF 向量和模长（避免检索时重复计算）
        self.doc_vectors = []
        self.doc_norms = []
        for tokens in self.corpus_tokens:
            tf = compute_tf(tokens)
            vec = build_tfidf_vector(tf, self.idf)
            self.doc_vectors.append(vec)
            self.doc_norms.append(math.sqrt(sum(v * v for v in vec.values())))

    def search(self, query: str, top_k: int = 3) -> list[tuple[float, int]]:
        """
        检索与 query 最相关的 top_k 篇文档
        返回：[(相似度分数, 文档索引), ...] 按分数降序
        """
        # 把 query 也走同一套 TF-IDF 向量化流程
        query_tokens = tokenize(query)
        query_tf = compute_tf(query_tokens)
        query_vec = build_tfidf_vector(query_tf, self.idf)

        # 逐一计算 query 向量与每篇文档向量的余弦相似度
        scores = []
        for idx, doc_vec in enumerate(self.doc_vectors):
            sim = cosine_similarity(query_vec, doc_vec)
            scores.append((sim, idx))

        # 按相似度降序，取前 top_k 个
        scores.sort(key=lambda x: x[0], reverse=True)
        return scores[:top_k]


# ======================== 使用示例 ========================

if __name__ == "__main__":
    # 模拟法律条文语料
    docs = [
        {"content": "处理个人信息应当取得个人同意，并在充分知情的前提下自愿作出"},
        {"content": "个人信息处理者不得以个人不同意处理其个人信息为由拒绝提供产品或者服务"},
        {"content": "处理个人信息应当遵循合法、正当、必要和诚信原则"},
        {"content": "国家建立数据分类分级保护制度，根据数据在经济社会发展中的重要程度实行保护"},
        {"content": "网络运营者应当制定网络安全事件应急预案，及时处置系统漏洞等安全风险"},
    ]

    retriever = TfidfRetriever(docs)

    # 检索测试
    results = retriever.search("收集个人信息需要同意吗", top_k=3)
    print("查询：收集个人信息需要同意吗")
    for score, idx in results:
        print(f"  [{score:.4f}] {docs[idx]['content']}")
