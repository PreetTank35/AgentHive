"""
Vector store implementation supporting FAISS + SentenceTransformer embeddings,
with seamless TF-IDF / Cosine similarity fallback.
"""

from __future__ import annotations

import logging
from typing import List, Optional

logger = logging.getLogger("agenthive.rag.vector_store")

# Attempt loading sentence_transformers and faiss
_HAS_FAISS = False
_embedding_model = None

try:
    from sentence_transformers import SentenceTransformer
    import faiss
    import numpy as np

    _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    _HAS_FAISS = True
    logger.info("FAISS + SentenceTransformer embedding model initialized successfully.")
except Exception as e:
    logger.info("FAISS/SentenceTransformer not available (%s) — using TF-IDF vector similarity engine.", e)


def get_embedding(text: str):
    """Convert text into a vector."""
    if _HAS_FAISS and _embedding_model:
        return _embedding_model.encode(text)
    return [0.0]


class VectorStore:
    def __init__(self):
        self.index = None
        self.documents: List[str] = []
        self.is_built = False

    def build_index(self, texts: List[str]):
        """Build vector index only once."""
        if not texts or self.is_built:
            return

        self.documents = texts.copy()

        if _HAS_FAISS and _embedding_model:
            try:
                embeddings = _embedding_model.encode(texts)
                embeddings = np.array(embeddings).astype("float32")
                dimension = embeddings.shape[1]
                self.index = faiss.IndexFlatL2(dimension)
                self.index.add(embeddings)
                self.is_built = True
                return
            except Exception as e:
                logger.error("FAISS index building failed: %s — falling back to TF-IDF", e)

        self.is_built = True

    def search(self, query: str, k: int = 3) -> List[str]:
        """Return the k most similar texts."""
        if not self.documents:
            return []

        if _HAS_FAISS and self.index is not None and _embedding_model:
            try:
                query_embedding = _embedding_model.encode([query])
                query_embedding = np.array(query_embedding).astype("float32")
                distances, indices = self.index.search(query_embedding, k)
                results = []
                for idx in indices[0]:
                    if 0 <= idx < len(self.documents):
                        results.append(self.documents[idx])
                if results:
                    return results
            except Exception as e:
                logger.error("FAISS vector search failed: %s — falling back", e)

        # Fallback 1: TF-IDF vector cosine similarity
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            corpus = self.documents + [query]
            vectorizer = TfidfVectorizer().fit(corpus)
            doc_matrix = vectorizer.transform(self.documents)
            query_vec = vectorizer.transform([query])

            similarities = cosine_similarity(query_vec, doc_matrix).flatten()
            top_indices = similarities.argsort()[::-1][:k]

            results = [self.documents[i] for i in top_indices if similarities[i] > 0]
            if results:
                return results
        except Exception:
            pass

        # Fallback 2: Keyword overlap
        query_words = set(query.lower().split())
        scored = []
        for doc in self.documents:
            score = sum(1 for w in query_words if w in doc.lower())
            scored.append((score, doc))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for score, doc in scored[:k] if score > 0] or self.documents[:k]


# Shared Vector Store instance
vector_store = VectorStore()
