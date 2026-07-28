import os
from pathlib import Path
import numpy as np
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


def _has_local_cache() -> bool:
    """检查模型是否已缓存到本地 HuggingFace 缓存目录"""
    # 缓存根目录优先级：HF_HUB_CACHE > HF_HOME/hub > 默认 ~/.cache/huggingface/hub
    hub_cache = Path(os.getenv(
        "HF_HUB_CACHE",
        Path(os.getenv("HF_HOME", Path.home() / ".cache" / "huggingface")) / "hub",
    ))
    # 缓存目录命名规则：models--{组织名}--{模型名}/snapshots/{commit哈希}/
    snapshots = hub_cache / f"models--sentence-transformers--{MODEL_NAME}" / "snapshots"
    return snapshots.is_dir() and any(snapshots.iterdir())


# 本地已有缓存时强制离线加载：否则每次启动都会向镜像站发 HEAD 请求检查更新，
# 网络不稳定时（如连接被重置）会直接报错，尽管模型就在本地
# 注意：必须在 import sentence_transformers 之前设置，HF_HUB_OFFLINE 在库导入时读取
if _has_local_cache():
    os.environ["HF_HUB_OFFLINE"] = "1"

_model = None
def get_model():
    """获取模型"""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(MODEL_NAME)
    return _model

def encode_query(query: str) -> np.ndarray:
    """对用户输入进行编码"""
    model = get_model()
    vec = model.encode(
        [query],
        normalize_embeddings = True,
        convert_to_numpy = True
    )
    return vec.astype("float32")

def encode_documents(text: list[dict], batch_size: int = 32):
    """批量编码文件（建库或重建索引时使用）"""
    model = get_model()
    vec = model.encode(
        text,
        batch_size = batch_size,
        normalize_embeddings = True,
        convert_to_numpy = True,
        show_progress_bar = len(text) > 100
    )
    return vec.astype("float32")

if __name__ == "__main__":
    # 冒烟测试：验证模块可用 + 语义检索直觉
    query = encode_query("收集用户手机号需要什么条件")
    docs = encode_documents([
        "处理个人信息应当取得个人的同意",          # 语义相关，相似度应高
        "网络运营者应当制定网络安全事件应急预案",  # 无关，相似度应低
    ])
    scores = (query @ docs.T)[0]  # 归一化向量，内积即余弦相似度
    for text, s in zip(["条文A(相关)", "条文B(无关)"], scores):
        print(f"{text}: {s:.4f}")
    assert scores[0] > scores[1], "语义排序错误！"
    print("embedding 模块自检通过")