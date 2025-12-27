from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uuid
import json
from app.utils.supabase_client import supabase
from app.config import redis_client
from app.utils.orchestrator import Orchestrator
from app.utils.llm import generate_response

router = APIRouter()


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str


@router.post("/chat")
async def start_chat(payload: ChatRequest, background_tasks: BackgroundTasks):
    message_text = payload.message.strip()
    if not message_text:
        raise HTTPException(status_code=400, detail="Message text missing")

    # Create conversation if needed
    if payload.conversation_id:
        conversation_id = payload.conversation_id
    else:
        conversation_id = str(uuid.uuid4())
        # Generate a short AI-based title for the conversation using the first message
        title_prompt = f"Generate a short, 3-4 word title for this conversation based on the following user message. Do not use quotes or punctuation.\nMessage: {message_text}\nTitle:"
        try:
            ai_title = generate_response([{"role": "user", "content": title_prompt}])
            ai_title = ai_title.strip().split("\n")[0][:48]
        except Exception:
            ai_title = message_text[:32]
        supabase.table("conversations").insert({
            "conversation_id": conversation_id,
            "title": ai_title
        }).execute()

    # Insert user message
    message_id = str(uuid.uuid4())
    supabase.table("messages").insert({
        "message_id": message_id,
        "conversation_id": conversation_id,
        "role": "user",
        "content": message_text,
        "metadata": {}
    }).execute()

    # Kick off orchestrator in background to generate streaming response
    orchestrator = Orchestrator(redis_client)
    background_tasks.add_task(orchestrator.run, conversation_id, message_text)

    return {"conversation_id": conversation_id, "message_id": message_id}


@router.get("/chat/{conversation_id}/stream")
async def stream_chat(conversation_id: str):
    """SSE endpoint that streams events published to Redis channel for the conversation.

    Events are expected to be JSON objects with keys: type, data.
    """
    from fastapi.responses import StreamingResponse
    import time

    pubsub = redis_client.pubsub()
    channel = f"conversation:{conversation_id}"
    pubsub.subscribe(channel)
    # Mark subscriber flag so orchestrator can detect a connected client
    sub_flag_key = f"conversation:{conversation_id}:subscribed"
    try:
        redis_client.set(sub_flag_key, "1", ex=30)
    except Exception:
        pass

    def event_generator():
        try:
            for message in pubsub.listen():
                # message is a dict with 'type' and 'data'
                if not message:
                    continue
                if message.get("type") == "message":
                    raw = message.get("data")
                    if isinstance(raw, bytes):
                        raw = raw.decode("utf-8")
                    # Each published payload should be a JSON string
                    try:
                        payload = json.loads(raw)
                    except Exception:
                        payload = {"type": "unknown", "data": raw}

                    # Format as SSE: event: <type>\ndata: <json>\n\n
                    event_type = payload.get("type", "message")
                    data = payload.get("data", {})
                    s = f"event: {event_type}\n"
                    s += "data: " + json.dumps(data, ensure_ascii=False) + "\n\n"
                    yield s

                    # Stop streaming if done event is received
                    if event_type == "done":
                        break
                time.sleep(0.01)
        finally:
            try:
                # Unset subscriber flag and cleanup
                try:
                    redis_client.delete(sub_flag_key)
                except Exception:
                    pass
                pubsub.unsubscribe(channel)
                pubsub.close()
            except Exception:
                pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")
