"""
FastAPI 应用入口。
当前为最小可运行版本：app 实例 + 健康检查端点；
lifespan（Agent 单例装配 + RAG 预热，T3.1/T3.2）与业务路由（/api/ask，T5.1）后续挂载。
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化、关闭时清理。T3 将在此装配 Agent 单例并预热 RAG 资产。"""
    yield


app = FastAPI(title="HelloAgents API", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict:
    """健康检查：部署探活与前后端代理联调排障共用"""
    return {"status": "ok"}
