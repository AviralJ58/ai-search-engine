import json
import time
from typing import List
from app.utils.embeddings import embed_texts
from app.utils.vectorstore import qdrant_client
from app.utils.llm import generate_response_stream

# Retrieval tuning
RETRIEVAL_MIN_SCORE = 0.65  # raw vector similarity floor; raise to be more strict
MAX_CITATIONS = 5  # how many citations to include in the prompt/context
# Subscriber wait
SUBSCRIBER_WAIT_SECONDS = 2  # how long orchestrator waits for an SSE subscriber to connect


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
            # Wait briefly for a subscriber to connect (to avoid missed initial events)
            try:
                sub_key = f"conversation:{conversation_id}:subscribed"
                waited = 0.0
                interval = 0.1
                found = False
                while waited < SUBSCRIBER_WAIT_SECONDS:
                    try:
                        if self.redis.get(sub_key):
                            found = True
                            break
                    except Exception:
                        # If Redis check fails, bail out
                        break
                    time.sleep(interval)
                    waited += interval
                if not found:
                    # publish an info event so client knows there was no subscriber at start
                    self.publish(conversation_id, "info", {"message": "No SSE subscriber detected before generation."})
            except Exception:
                pass

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
                    candidates = []

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

                        # obtain score (ScoredPoint has .score; dict may have 'score')
                        raw_score = None
                        if hasattr(hit, "score"):
                            try:
                                raw_score = float(hit.score)
                            except Exception:
                                raw_score = None
                        elif isinstance(hit, dict):
                            raw_score = hit.get("score")
                            try:
                                raw_score = float(raw_score) if raw_score is not None else None
                            except Exception:
                                raw_score = None

                        candidates.append({"hit": hit, "payload": payload, "score": raw_score})

                    # Filter by raw similarity score to reduce noisy results
                    filtered = [c for c in candidates if (c.get("score") is not None and c["score"] >= RETRIEVAL_MIN_SCORE)]

                    # If filtering removed everything, we can be more permissive and keep top results
                    if not filtered and candidates:
                        # sort candidates by score (None -> -inf)
                        candidates.sort(key=lambda x: x.get("score") or -1, reverse=True)
                        # keep top MAX_CITATIONS but still mark they are low confidence
                        filtered = candidates[:MAX_CITATIONS]
                        self.publish(conversation_id, "info", {"message": "Low-confidence results returned (below similarity threshold)"})

                    # Build citation map from filtered candidates (limit to MAX_CITATIONS)
                    citation_map = []
                    for idx, c in enumerate(filtered[:MAX_CITATIONS], start=1):
                        p = c["payload"]
                        excerpt = (p.get("text") or "")
                        # truncate excerpt for prompt
                        excerpt_short = excerpt[:1000]
                        citation_map.append({
                            "id": idx,
                            "doc_id": p.get("doc_id"),
                            "page_number": p.get("page_number"),
                            "start_offset": p.get("start_offset"),
                            "end_offset": p.get("end_offset"),
                            "text_snippet": excerpt_short,
                            "score": c.get("score"),
                        })

                    # Publish citation_map so UI can map markers to source locations
                    if citation_map:
                        self.publish(conversation_id, "citation_map", {"map": citation_map})
                        # also emit individual citation events if desired
                        for cm in citation_map:
                            self.publish(conversation_id, "citation", cm)

                    self.publish(conversation_id, "tool_call_finished", {"tool": "search_documents", "count": len(citation_map)})

            # 3) Tool: generate_answer (we'll call LLM and stream deltas)
            self.publish(conversation_id, "tool_call_started", {"tool": "generate_answer"})

            # Build a prompt using the numbered citation_map snippets and instruct the LLM to cite using bracketed numbers.
            # citation_map is a list of dicts with keys: id, text_snippet, doc_id, page_number, start_offset, end_offset
            context_parts = []
            if 'citation_map' in locals() and citation_map:
                for cm in citation_map[:MAX_CITATIONS]:
                    marker = f"[{cm['id']}]"
                    context_parts.append(f"{marker} {cm['text_snippet']}")
                context = "\n\n".join(context_parts)
                prompt = f"You are an assistant that answers questions using only the provided numbered context snippets. " \
                         f"Cite snippets inline using their bracketed number (for example: [1], [2]). " \
                         f"If the context does not contain enough information to answer, say you don't know and do NOT invent citations.\n\nContext:\n{context}\n\nQuestion: {user_message}\n\nAnswer:"
            else:
                # No snippets available
                prompt = f"You are an assistant. There is no supporting context available. If you cannot answer the question based on general knowledge, say you don't know.\n\nQuestion: {user_message}\n\nAnswer:"

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
