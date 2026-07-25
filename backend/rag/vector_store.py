"""
Lightweight Vector Store implementation using TF-IDF and Cosine Similarity.

Optimized for serverless deployment (Vercel) — provides fast, high-accuracy
FAQ vector search without heavy dependencies (PyTorch/FAISS).
"""

from __future__ import annotations

import logging
from typing import List

logger = logging.getLogger("agenthive.rag.vector_store")


class VectorStore:
    """Lightweight TF-IDF Vector Store for FAQ RAG lookup."""

    def __init__(self):
        self.documents: List[str] = []
        self.is_built = False

    def build_index(self, texts: List[str]):
        """Store FAQ documents for fast vector similarity search."""
        if not texts:
            return
        self.documents = texts.copy()
        self.is_built = True

    def search(self, query: str, k: int = 3) -> List[str]:
        """Return the k most relevant documents using TF-IDF cosine similarity."""
        if not self.documents:
            return []

        # Step 1: TF-IDF vector cosine similarity (scikit-learn)
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            corpus = self.documents + [query]
            vectorizer = TfidfVectorizer(stop_words="english").fit(corpus)
            doc_matrix = vectorizer.transform(self.documents)
            query_vec = vectorizer.transform([query])

            similarities = cosine_similarity(query_vec, doc_matrix).flatten()
            top_indices = similarities.argsort()[::-1][:k]

            results = [self.documents[i] for i in top_indices if similarities[i] > 0]
            if results:
                return results
        except Exception as e:
            logger.debug("TF-IDF search error: %s — falling back to word overlap", e)

        # Step 2: Fallback keyword overlap ranking
        query_words = set(query.lower().split())
        scored = []
        for doc in self.documents:
            score = sum(1 for w in query_words if w in doc.lower())
            scored.append((score, doc))
        scored.sort(key=lambda x: x[0], reverse=True)
        
        results = [doc for score, doc in scored[:k] if score > 0]
        return results or self.documents[:k]


# Shared Vector Store instance
vector_store = VectorStore()
