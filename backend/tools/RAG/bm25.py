"""
BM25 稀疏检索器 — 纯 Python 实现，零外部依赖

原理概要：
  BM25 是 TF-IDF 的改进版，解决了两个问题：
  1. TF 饱和：词频增长有天花板，出现 100 次不会比 10 次重要 10 倍
  2. 文档长度归一化：长文档天然词频高，需要惩罚以公平竞争

  得分公式（对 query 中每个词求和后累加）：
  score = IDF(q) × [ tf × (k1+1) ] / [ tf + k1 × (1 - b + b × |D|/avgdl) ]
                         ↑ TF饱和项              ↑ 长度归一化项

  参数含义：
  - k1（默认1.5）：控制 TF 饱和速度，越大则高词频的额外收益越明显
  - b （默认0.75）：控制长度惩罚力度，0=不惩罚，1=完全按比例惩罚

检索流程：
  分词 → 预计算 IDF → 逐文档算 BM25 得分 → 排序 → 返回 top-k
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

def compute_idf(df: dict[str, int], n_docs: int) -> dict[str, float]:
    """
    BM25 的 IDF 公式：log((N - df + 0.5) / (df + 0.5))
    与 TF-IDF 的 log(N/df) 不同，+0.5 是拉普拉斯平滑，避免极端值
    当 df 接近 N 时 IDF 趋近 0（常见词无区分度），df 小时 IDF 大（稀有词区分度高）
    max(..., 0) 兜底：小语料下 df > N/2 会导致负值，截断为 0 防止常见词反向拉低得分
    """
    return {
        word: max(math.log((n_docs - freq + 0.5) / (freq + 0.5)), 0.0)
        for word, freq in df.items()
    }


# ======================== 第三层：BM25 检索器 ========================

class BM25Retriever:
    """
    BM25 检索器：传入文档列表，构建索引后支持 query 检索
    documents 格式：[{"content": "条文内容", ...其他元数据}, ...]
    """

    def __init__(self, documents: list[dict], k1: float = 1.5, b: float = 0.75):
        self.documents = documents
        self.n_docs = len(documents)
        self.k1 = k1  # TF饱和系数
        self.b = b    # 长度归一化系数

        # 对所有文档分词（只执行一次，后续检索复用）
        self.corpus_tokens = [tokenize(doc["content"]) for doc in documents]

        # 每篇文档的长度（词数），用于长度归一化
        self.doc_lens = [len(tokens) for tokens in self.corpus_tokens]
        # 全语料平均文档长度，是长度归一化的基准线
        self.avgdl = sum(self.doc_lens) / self.n_docs

        # 预计算 DF：每个词出现在多少篇文档中
        self.df = Counter()
        for tokens in self.corpus_tokens:
            self.df.update(set(tokens))  # set 去重：一篇文档中同词只计一次

        # 预计算 IDF：语料确定后就不变了
        self.idf = compute_idf(self.df, self.n_docs)

        # 预计算每篇文档的词频表（避免检索时重复统计）
        self.doc_tf_maps = [Counter(tokens) for tokens in self.corpus_tokens]

    def _score_doc(self, query_tokens: list[str], doc_idx: int) -> float:
        """
        计算单篇文档对 query 的 BM25 得分
        核心逻辑：对 query 中每个词，算出 IDF × TF饱和项，累加得到总分
        """
        tf_map = self.doc_tf_maps[doc_idx]
        doc_len = self.doc_lens[doc_idx]

        score = 0.0
        for word in query_tokens:
            if word not in tf_map:
                continue  # 该词不在文档中，贡献为 0

            tf = tf_map[word]
            idf = self.idf.get(word, 0.0)

            # BM25 核心公式的 TF 饱和部分：
            # 分子 tf*(k1+1)：词频的"有效贡献"，k1+1 是归一化常数
            # 分母 tf + k1*(...)：当 tf 很大时，分子/分母 ≈ (k1+1)，增长趋于平坦
            numerator = tf * (self.k1 + 1)
            # 长度归一化：doc_len/avgdl > 1 说明文档偏长，分母变大 → 得分被压低
            denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl)

            score += idf * (numerator / denominator)

        return score

    def search(self, query: str, top_k: int = 3) -> list[tuple[float, int]]:
        """
        检索与 query 最相关的 top_k 篇文档
        返回：[(BM25得分, 文档索引), ...] 按得分降序
        """
        query_tokens = tokenize(query)

        # 对每篇文档计算 BM25 得分
        scores = [
            (self._score_doc(query_tokens, idx), idx)
            for idx in range(self.n_docs)
        ]

        # 按得分降序，取前 top_k 个
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

    retriever = BM25Retriever(docs)

    # 检索测试
    results = retriever.search("收集个人信息需要同意吗", top_k=3)
    print("查询：收集个人信息需要同意吗")
    for score, idx in results:
        print(f"  [{score:.4f}] {docs[idx]['content']}")
