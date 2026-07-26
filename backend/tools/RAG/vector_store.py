from pathlib import Path
import json
import faiss

DATA_DIR = Path(__file__).resolve().parents[1]
INDEX_PATH = DATA_DIR / "vector_index.index"
META_PATH = DATA_DIR / "vector_index_meta.json"

def check_index_exist():
    """路径定义与文件存在性检查"""
    # 两个文件必须存在且非空，否则后续加载无意义
    for p in (INDEX_PATH, META_PATH):
        # assert 语法：assert 条件, 错误信息
        # 当条件为 False 时，抛出 AssertionError 并显示错误信息；为 True 则继续执行
        # 这里检查文件路径 p 是否存在，不存在则抛出异常并提示缺少的文件路径
        assert p.exists(), f"缺少文件：{p}"
        assert p.stat().st_size > 0, f"文件为空：{p}"

REQUIRED_FIELDS = {"id", "content", "source", "category", "faiss_index"}

def load_meta():
    """加载并校验meta.json文件"""
    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    assert isinstance(meta, list), "meta.json 顶层应为数组"
    for i, rec in enumerate(meta):
        missing = REQUIRED_FIELDS - rec.keys()
        assert not missing, f"第{i}条缺失字段：{missing}"
        assert rec["content"].strip(), f"第{i}条 content 为空"
    return meta

EXPECTED_DIM = 384
def load_index():
    """加载并校验FAISS索引"""
    index = faiss.read_index(str(INDEX_PATH))
    assert index.d == EXPECTED_DIM, f"索引维度{index.d} != {EXPECTED_DIM}"
    assert index.ntotal > 0, "索引中没有向量"
    assert index.metric_type == faiss.METRIC_INNER_PRODUCT, "索引度量应为内积"
    assert index.is_trained, "IndexFlat 应始终处于已训练状态"
    return index

def check_alignment(meta : list[dict], index) -> None:
    """校验两文件的对齐关系"""
    assert len(meta) == index.ntotal, f"meta {len(meta)} 条 != 索引 {index.ntotal} 行"
    ids = sorted(rec["faiss_index"] for rec in meta)
    assert ids == list(range(index.ntotal)), "faiss_index 不连续、有重复或缺号"

def build_mapping(meta: list[dict]) -> dict[int, dict]:
    """构建 faiss_index -> record 的映射"""
    return {rec["faiss_index"]: rec for rec in meta}

def load_retriever_assets():
    """加载并校验向量检索资产，返回 (index, meta_list, meta_by_faiss)"""
    check_index_exist()
    meta = load_meta()
    index = load_index()
    check_alignment(meta, index)
    meta_by_faiss = build_mapping(meta)
    print(f"资产加载完成：{index.ntotal} 条向量，维度 {index.d}")
    return index, meta, meta_by_faiss

def check_sources_in_docs(meta: list[dict], docs_dir : Path) -> None:
    """索引 <--> 原始材料溯源校验"""
    available = {p.name for p in docs_dir.iterdir() if p.is_file()}
    missing = {rec["source"] for rec in meta } - available
    assert not missing, f"docs/ 缺少原始材料: {missing}"

