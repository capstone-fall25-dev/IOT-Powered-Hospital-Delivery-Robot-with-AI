# app/dataset_manager.py
from typing import List, Dict, Any, Optional
import os, json, csv
from pathlib import Path
from langchain.text_splitter import CharacterTextSplitter

DATA_DIR = os.environ.get("DATA_DIR", "/data")
os.makedirs(DATA_DIR, exist_ok=True)

def read_jsonl(path: str) -> List[Dict[str, Any]]:
    items = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            items.append(json.loads(line))
    return items

def read_csv(path: str, question_col: Optional[str] = None, answer_col: Optional[str] = None) -> List[Dict[str, str]]:
    items = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if question_col and answer_col and question_col in row and answer_col in row:
                items.append({"input": row[question_col], "output": row[answer_col]})
            else:
                keys = list(row.keys())
                if len(keys) >= 2:
                    items.append({"input": row[keys[0]], "output": row[keys[1]]})
    return items

def read_txt(path: str) -> List[Dict[str, str]]:
    items = []
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    for p in paragraphs:
        lines = p.splitlines()
        if len(lines) == 1:
            items.append({"input": lines[0], "output": lines[0]})
        else:
            items.append({"input": lines[0], "output": "\n".join(lines[1:])})
    return items

def normalize_item(item: Dict[str, Any]) -> Dict[str, str]:
    if "input" in item and "output" in item:
        return {"input": str(item["input"]).strip(), "output": str(item["output"]).strip()}
    for k_in in ("q","question","prompt"):
        for k_out in ("a","answer","response"):
            if k_in in item and k_out in item:
                return {"input": str(item[k_in]).strip(), "output": str(item[k_out]).strip()}
    keys = list(item.keys())
    if len(keys) >= 2:
        return {"input": str(item[keys[0]]).strip(), "output": str(item[keys[1]]).strip()}
    raise ValueError(f"Cannot normalize item: {item}")

def convert_to_finetune_jsonl(items: List[Dict[str, Any]], out_path: str) -> str:
    out_path = os.path.abspath(out_path)
    with open(out_path, "w", encoding="utf-8") as f:
        for item in items:
            norm = normalize_item(item)
            f.write(json.dumps(norm, ensure_ascii=False) + "\n")
    return out_path

def chunk_documents_for_rag(items: List[Dict[str, Any]], chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
    splitter = CharacterTextSplitter(separator="\n", chunk_size=chunk_size, chunk_overlap=overlap, length_function=len)
    docs = []
    for item in items:
        text = item.get("output") or item.get("text") or ""
        if not text:
            continue
        chunks = splitter.split_text(text)
        for c in chunks:
            docs.append({"text": c, "metadata": {"source": item.get("source","local")}})
    return docs

def load_dataset_file(path: str, csv_q_col: Optional[str]=None, csv_a_col: Optional[str]=None) -> List[Dict[str, Any]]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(path)
    if p.suffix.lower() in (".jsonl", ".json"):
        return read_jsonl(str(p))
    if p.suffix.lower() == ".csv":
        return read_csv(str(p), csv_q_col, csv_a_col)
    if p.suffix.lower() in (".txt", ".md"):
        return read_txt(str(p))
    raise ValueError(f"Unsupported file type: {p.suffix}")
