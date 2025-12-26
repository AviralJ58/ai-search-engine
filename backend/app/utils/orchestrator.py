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
        # Some qdrant-client versions expect the vector as a positional
        # argument rather than a keyword named `query_vector`. Pass the
        # collection name first and the vector second to be maximally
        # compatible across client versions.
        try:
            results = qdrant_client.query_points(
                "documents_chunks",
                qv,
                limit=top_k,
                with_payload=True,
            )
        except TypeError:
            # Fallback: try older/newer signature variations
            try:
                results = qdrant_client.query_points(
                    collection_name="documents_chunks",
                    query=qv,
                    limit=top_k,
                    with_payload=True,
                )
            except Exception as e:
                # Final fallback: re-raise to be handled by caller
                raise

        # qdrant-client may return different shapes depending on version:
        # - QueryResponse object with .points list
        # - an object with attributes 'result' or 'hits'
        # - a tuple like ("points", [ScoredPoint, ...])
        # - a dict/wrapper containing the list
        # - directly a list of ScoredPoint
        # Normalize to a list of hits (ScoredPoint-like objects)
        hits = None

        # QueryResponse-like
        if hasattr(results, "points") and isinstance(results.points, list):
            hits = results.points
        elif hasattr(results, "result") and isinstance(results.result, list):
            hits = results.result
        elif hasattr(results, "hits") and isinstance(results.hits, list):
            hits = results.hits

        # Tuple shape: ("points", [...])
        elif isinstance(results, tuple) and len(results) >= 2 and isinstance(results[1], list):
            hits = results[1]

        # Dict-like wrapper
        elif isinstance(results, dict):
            for k in ("result", "points", "hits"):
                if k in results and isinstance(results[k], list):
                    hits = results[k]
                    break

        # Direct list
        elif isinstance(results, list):
            hits = results

        if hits is None:
            # Fallback: log the type and available attributes to help debugging
            attrs = [a for a in dir(results) if not a.startswith("_")][:50]
            print(f"[Orchestrator] Unrecognized qdrant query result shape: {type(results)} -> available attrs: {attrs}")
            return []

        return hits

    def run(self, conversation_id: str, user_message: str):
        # Wrap orchestration in try/except so we always publish a terminal event
        try:
            # 1) Typing start
            self.publish(conversation_id, "typing", {"status": "started"})

            # 2) Tool: search_documents
            self.publish(conversation_id, "tool_call_started", {"tool": "search_documents"})
            results = self.search_documents(user_message, top_k=5)

            # Emit citations for results
            citations = []
            if not results:
                # No hits found
                self.publish(conversation_id, "tool_call_finished", {"tool": "search_documents", "count": 0})
                self.publish(conversation_id, "info", {"message": "No relevant documents found"})
            else:
                for hit in results:
                    # hit may be a ScoredPoint-like object or a dict
                    payload = None
                    if hasattr(hit, "payload"):
                        payload = hit.payload
                    elif isinstance(hit, dict) and "payload" in hit:
                        payload = hit["payload"]

                    if not payload:
                        # skip malformed hit
                        continue

                    citation = {
                        "doc_id": payload.get("doc_id"),
                        "page_number": payload.get("page_number"),
                        "text": payload.get("text"),
                        "start_offset": payload.get("start_offset"),
                        "end_offset": payload.get("end_offset"),
                        "score": getattr(hit, "score", None) if not isinstance(hit, dict) else hit.get("score"),
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

            # Finish tool
            self.publish(conversation_id, "tool_call_finished", {"tool": "generate_answer"})

        except Exception as e:
            # Publish error so clients can stop waiting
            err_msg = str(e)
            print(f"[Orchestrator] Error during run: {err_msg}")
            self.publish(conversation_id, "error", {"error": err_msg})

        finally:
            # Ensure typing stopped and done event always published
            self.publish(conversation_id, "typing", {"status": "stopped"})
            self.publish(conversation_id, "done", {"finished": True})
