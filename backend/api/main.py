"""
FastAPI 应用入口。
lifespan 负责 Agent 单例装配（T3.1）与 RAG 资产预热（T3.2）；
业务路由（/api/ask，T5.1）后续挂载。
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.core.agent_run import build_domain_agent
from backend.tools.RAG.vector_store import load_retriever_assets
from backend.tools.RAG.vector_search import vector_search
from backend.tools.RAG.bm25_search import bm25_search

# API 层新代码统一用 logging（uvicorn 默认不给应用 logger 配 handler，这里显式配置）
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时装配 Agent 单例并预热 RAG 资产，关闭时无需清理（资源随进程释放）"""
    # T3.1 单例装配：Agent 全服务共用一个实例，存 app.state 而非模块全局变量，
    # 便于测试时注入 FakeLLM 版 agent；run() 的 messages 是局部变量、无可变共享状态，
    # 预热后检索资产只读，多请求线程共用同一实例是安全的
    app.state.agent = build_domain_agent()
    logger.info("Agent 单例装配完成")

    # T3.2 第一步 fail-fast 判活：直接调用资产加载（内部 assert 校验文件存在/维度/对齐），
    # 索引缺失或损坏时异常上抛、启动直接失败，杜绝带病启动。
    # 不能靠检索工具函数判活：vector_search/bm25_search 为保 ReAct 循环不中断，
    # 内部会把加载失败吞成错误字符串返回，造成"预热成功"的假象
    index, _, _ = load_retriever_assets()
    logger.info("RAG 资产校验通过：%d 条向量", index.ntotal)

    # T3.2 第二步 哑调用预热：触发 embedding 模型与 BM25 索引的懒加载，
    # 消除首次请求 10~30 秒的冷启动延迟；启动时同步加载完，运行期只读、无懒加载竞态
    vector_search("预热", top_k=1)
    bm25_search("预热", top_k=1)
    logger.info("RAG 预热完成，服务就绪")

    yield
    # 无需清理：FAISS 索引与 embedding 模型随进程退出释放


app = FastAPI(title="HelloAgents API", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict:
    """健康检查：部署探活与前后端代理联调排障共用"""
    return {"status": "ok"}
