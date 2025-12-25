from celery import shared_task
from sentence_transformers import SentenceTransformer
from django.db import transaction
from .models import DocEmbedding

# We will import models inside tasks when needed to avoid import-time issues

@shared_task
def upsert_embedding(module: str, record_id: int, title: str, text: str):
    model_name = 'sentence-transformers/all-MiniLM-L6-v2'
    model = SentenceTransformer(model_name)
    chunks = _chunk_text(text)
    vecs = model.encode(chunks, convert_to_numpy=True).tolist()
    with transaction.atomic():
        # remove old
        DocEmbedding.objects.filter(module=module, record_id=record_id).delete()
        # insert new
        for ch, emb in zip(chunks, vecs):
            DocEmbedding.objects.create(module=module, record_id=record_id, title=title, chunk=ch, embedding=emb)

@shared_task
def delete_embedding(module: str, record_id: int):
    """Delete embeddings for a specific module and record"""
    try:
        with transaction.atomic():
            DocEmbedding.objects.filter(module=module, record_id=record_id).delete()
    except Exception:
        # If there's any issue with embedding deletion, don't block the main operation
        pass

def delete_embedding_sync(module: str, record_id: int):
    """Synchronous version of delete_embedding for when Celery is not available"""
    try:
        with transaction.atomic():
            DocEmbedding.objects.filter(module=module, record_id=record_id).delete()
    except Exception:
        # If there's any issue with embedding deletion, don't block the main operation
        pass

def _chunk_text(text: str, max_tokens: int = 256):
    words = text.split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= max_tokens:
            chunks.append(' '.join(cur))
            cur = []
    if cur:
        chunks.append(' '.join(cur))
    return chunks

