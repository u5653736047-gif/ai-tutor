"""
任务8：Agent 健壮性测试（无网络，不依赖真实 LLM）
用按脚本返回的 FakeLLM 伪造异常工具调用，验证参数解析各分支不再崩溃、llm_error 有用户话术。
"""

import sys
from types import SimpleNamespace

# Windows 控制台默认 GBK，避免输出中文/emoji 报错（与 base_agent.py 同款处理）
sys.stdout.reconfigure(encoding="utf-8")

from backend.agents.react_agent import ReActAgent
from backend.tools.tool_registry import ToolRegistry


def echo(query: str = "") -> str:
    """测试用回显工具：参数有默认值，空参数调用也能成功"""
    return f"echo: {query}"


def _fake_message(content=None, tool_calls=None):
    """伪造 LLM 返回的 message 对象（ReActAgent 只读 content / tool_calls 两个属性）"""
    return SimpleNamespace(content=content, tool_calls=tool_calls)


def _fake_tool_call(name: str, arguments):
    """伪造一次工具调用，arguments 原样传入以模拟 LLM 的各种异常输出"""
    return SimpleNamespace(id="call_1", function=SimpleNamespace(name=name, arguments=arguments))


class FakeLLM:
    """按脚本依次返回伪造输出，脚本耗尽前每次 thinking 弹一条"""
    def __init__(self, script: list):
        self.script = script

    def thinking(self, messages, tools, tool_choice, temperature):
        return self.script.pop(0)


def _build_agent(script: list) -> ReActAgent:
    registry = ToolRegistry()
    registry.register_function("echo", "测试用回显工具", echo)
    return ReActAgent(llm_client=FakeLLM(script), tool_registry=registry, max_steps=10)


def test_bad_arguments_no_crash():
    """
    参数解析三分支：非法 JSON → 参数解析失败；非对象 JSON → 参数格式错误；空串 → 归一化为 {}。
    旧代码在空串/None 时 json.loads(dict) 抛 TypeError 未捕获，整个 run() 崩溃。
    """
    agent = _build_agent([
        _fake_message(tool_calls=[_fake_tool_call("echo", "{invalid json")]),   # 非法 JSON
        _fake_message(tool_calls=[_fake_tool_call("echo", "[1,2]")]),           # 合法但非对象
        _fake_message(tool_calls=[_fake_tool_call("echo", "")]),                # 空串 → {}
        _fake_message(content="完成", tool_calls=None),                          # 收尾轮
    ])
    result = agent.run("任意问题")

    assert result["status"] == "success", f"异常路径不应影响最终作答，实际 {result['status']}"
    all_obs = [obs for s in result["steps"] for obs in s["observations"]]
    assert any("参数解析失败" in o for o in all_obs), "非法 JSON 未进入解析失败分支"
    assert any("参数格式错误" in o for o in all_obs), "非对象 JSON 未进入格式错误分支"
    print("✅ 参数解析异常各分支均不崩溃，错误作为 Observation 喂回 LLM")


def test_llm_error_has_fallback():
    """LLM 故障（thinking 返回 None）：status=llm_error 且 answer 必须有用户可读话术"""
    agent = _build_agent([None])
    result = agent.run("任意问题")

    assert result["status"] == "llm_error", f"状态应为 llm_error，实际 {result['status']}"
    assert result["answer"], "llm_error 的 answer 不应为空（用户需要可读提示）"
    print(f"✅ llm_error 兜底话术：{result['answer']}")


if __name__ == "__main__":
    test_bad_arguments_no_crash()
    test_llm_error_has_fallback()
    print("\n🎉 Agent 健壮性测试全部通过。")
