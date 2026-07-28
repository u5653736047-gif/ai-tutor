"""
任务3：bm25_search 工具冒烟测试
验证关键词检索端到端行为：精确术语命中并带来源、无关 query 触发兜底、top_k 参数生效。
"""

import sys

# Windows 控制台默认 GBK，避免输出中文/emoji 报错（与 base_agent.py 同款处理）
sys.stdout.reconfigure(encoding="utf-8")

from backend.tools.RAG.bm25_search import bm25_search


def test_relevant_query():
    """含精确法律术语的 query 应命中对应条文，且结果携带来源信息（答案可追溯的要求）"""
    result = bm25_search("个人信息保护负责人")
    print(result)
    assert "未找到" not in result and "错误" not in result, "相关 query 未命中"
    assert "来源" in result and "第五十二条" in result, "未命中《个保法》第五十二条"


def test_irrelevant_query():
    """无关 query 与语料没有共同词项（得分全为 0），应触发兜底而不是返回噪音条文"""
    result = bm25_search("今天中午吃什么")
    print(result)
    assert "未找到" in result, "无关 query 未触发兜底"


def test_top_k_limit():
    """top_k 参数应限制返回条数"""
    result = bm25_search("个人信息", top_k=2)
    print(result)
    assert result.count("[") <= 2 or "未找到" in result, "返回条数超过 top_k"


if __name__ == "__main__":
    test_relevant_query()
    print("\n" + "=" * 50 + "\n")
    test_irrelevant_query()
    print("\n" + "=" * 50 + "\n")
    test_top_k_limit()
    print("\n🎉 bm25_search 冒烟测试全部通过。")
