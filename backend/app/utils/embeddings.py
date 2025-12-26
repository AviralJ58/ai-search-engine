from sentence_transformers import SentenceTransformer
import numpy as np

# Load once
model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_texts(texts):
    """Return embeddings for a list of text chunks."""
    vectors = model.encode(texts, show_progress_bar=False)
    return vectors.tolist()  # list of lists for Qdrant
