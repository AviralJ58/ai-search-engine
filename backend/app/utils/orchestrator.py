import json
import time
from typing import List
from app.utils.embeddings import embed_texts
from app.utils.vectorstore import qdrant_client
from app.utils.llm import generate_response_stream


class Orchestrator:
    """Simple orchestrator that runs tools and publishes events via Redis.

    This is intentionally minimal: tools are executed sequentially and publish
    events to a Redis channel named `conversation:{conversation_id}`.
    """
    def __init__(self, redis_client):
        self.redis = redis_client

    def publish(self, conversation_id: str, event_type: str, data: dict):
        channel = f"conversation:{conversation_id}"
        payload = {"type": event_type, "data": data}
        self.redis.publish(channel, json.dumps(payload, ensure_ascii=False))

    def search_documents(self, query: str, top_k: int = 5) -> List[dict]:
        # Embed and run vector search
        qv = embed_texts([query])[0]
        # use query_points() on this QdrantClient version
        results = qdrant_client.query_points(
            collection_name="documents_chunks",
            query=qv,
            limit=top_k,
            with_payload=True,
        )
        return results or []

    def run(self, conversation_id: str, user_message: str):
        # 1) Typing start
        self.publish(conversation_id, "typing", {"status": "started"})

        # 2) Tool: search_documents
        self.publish(conversation_id, "tool_call_started", {"tool": "search_documents"})
        results = self.search_documents(user_message, top_k=5)

        # Emit citations for results
        citations = []
        for hit in results:
            payload = hit.payload
            citation = {
                "doc_id": payload.get("doc_id"),
                "page_number": payload.get("page_number"),
                "text": payload.get("text"),
                "start_offset": payload.get("start_offset"),
                "end_offset": payload.get("end_offset"),
                "score": hit.score if hasattr(hit, 'score') else None,
            }
            citations.append(citation)
            # publish each citation so the UI can render progressively
            self.publish(conversation_id, "citation", citation)

        self.publish(conversation_id, "tool_call_finished", {"tool": "search_documents", "count": len(citations)})

        # 3) Tool: generate_answer (we'll call LLM and stream deltas)
        self.publish(conversation_id, "tool_call_started", {"tool": "generate_answer"})

        # Build a prompt using top 3 snippets
        context_texts = [c.get("text", "") for c in citations[:3]]
        context = "\n\n".join(context_texts)
        prompt = f"You are an assistant. Use the context to answer the question.\nContext:\n{context}\n\nQuestion: {user_message}\n\nAnswer:"

        # Call LLM with streaming and publish token-level deltas as they arrive
        for delta in generate_response_stream([{"role": "user", "content": prompt}]):
            # delta may be a short token or string fragment
            self.publish(conversation_id, "text_delta", {"delta": delta})
            # small pacing not required when using true streaming, but keep tiny sleep
            time.sleep(0.001)

        # Finish tool
        self.publish(conversation_id, "tool_call_finished", {"tool": "generate_answer"})

        # Store assistant message record (optionally via Supabase in future)

        # Indicate typing ended and done
        self.publish(conversation_id, "typing", {"status": "stopped"})
        self.publish(conversation_id, "done", {"finished": True})
