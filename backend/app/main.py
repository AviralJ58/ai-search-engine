from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.routes import ingest, query, chat, conversations
from app.config import redis_client, qdrant_client

app = FastAPI(title="Scalable Web-Aware RAG Engine (Prototype)")

# CORS: allow ALL origins. Note: allowing credentials with a wildcard origin is
# not allowed by browsers; this configuration permits all origins but disables
# credentialed requests. If you need cookies/credentials with many origins,
# configure FRONTEND_ORIGINS explicitly instead.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Verify Redis and Qdrant connections."""
    try:
        redis_ok = redis_client.ping()
    except Exception:
        redis_ok = False

    try:
        qdrant_info = qdrant_client.get_collections()
        qdrant_ok = True
    except Exception:
        qdrant_ok = False

    return {
        "status": "ok" if (redis_ok and qdrant_ok) else "partial",
        "redis": redis_ok,
        "qdrant": qdrant_ok
    }

# Include routes
app.include_router(query.router)
app.include_router(ingest.router)
app.include_router(chat.router)
app.include_router(conversations.router)