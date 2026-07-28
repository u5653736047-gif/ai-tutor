"""
任务7：ReAct 智能体领域端到端测试
验证完整闭环：领域问题 → Agent 自主多步检索 → 带来源回答；库外问题 → 拒答兜底。
与任务5工具测试的分工：任务5测"工具检索得对不对"，本测试测"Agent 用工具用得好不好"。
"""

import sys

# Windows 控制台默认 GBK，避免输出中文/emoji 报错（与 base_agent.py 同款处理）
sys.stdout.reconfigure(encoding="utf-8")

from backend.core.agent_run import build_domain_agent

DISCLAIMER_KEYWORDS = ("律师",)  # 约束4：免责声明必须出现
# 模型可能改述措辞（"不能替代专业律师" / "不构成专业律师意见"），
# 故断言"律师"+"免责声明/仅供"共现，而非死匹配固定话术
def _has_disclaimer(answer: str) -> bool:
    return "律师" in answer and ("免责声明" in answer or "仅供" in answer)


def test_in_domain_question(agent):
    """
    库内多法规问题：答案分散在多部法规中，单次检索覆盖不全，
    需要 Agent 多步检索后综合——ReAct"知道自己还不知道什么"的核心能力。
    断言写宽松（命中任一关键法规名即可），避免模型措辞变化导致测试不稳定。
    """
    answer = agent.run("开发AI聊天机器人上线需要遵守什么法规？")
    assert answer, "Agent 未返回答案"
    hit = any(kw in answer for kw in ("生成式人工智能", "算法推荐", "深度合成"))
    assert hit, "答案未引用任何 AI 专项法规，检索可能未生效"
    assert _has_disclaimer(answer), "答案缺少免责声明"


def test_out_of_domain_question(agent):
    """库外问题（劳动法不在知识库覆盖范围）：应明确拒答而非编造"""
    answer = agent.run("劳动法规定的加班工资怎么算？")
    assert answer, "Agent 未返回答案"
    assert "无法确定" in answer, "库外问题未按约束拒答"
    assert _has_disclaimer(answer), "答案缺少免责声明"


if __name__ == "__main__":
    agent = build_domain_agent()

    print("===== 库内问题 =====")
    test_in_domain_question(agent)
    print("\n" + "=" * 50 + "\n")
    print("===== 库外问题 =====")
    test_out_of_domain_question(agent)
    print("\n🎉 ReAct 领域端到端测试全部通过。")
