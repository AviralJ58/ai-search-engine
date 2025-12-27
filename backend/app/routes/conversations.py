from fastapi import APIRouter, HTTPException
from app.utils.supabase_client import supabase

router = APIRouter()


@router.get("/conversations")
async def list_conversations():
    """Return a list of conversations (id, title, created_at)."""
    try:
        res = supabase.table("conversations").select("conversation_id, title, created_at").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase query failed: {e}")

    data = res.data or []
    return {"conversations": data}


@router.get("/conversations/{conversation_id}/history")
async def get_conversation_history(conversation_id: str):
    """Return ordered messages for a conversation.

    Messages are returned oldest-first. Each message contains: message_id, role, content, metadata, created_at
    """
    try:
        # supabase-py/Postgrest order() expects the second parameter as a keyword (ascending=True)
        res = supabase.table("messages").select("message_id,role,content,metadata,created_at").eq("conversation_id", conversation_id).order("created_at").execute()
    except Exception as e:
        print(f"Supabase query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Supabase query failed: {e}")

    data = res.data or []
    return {"conversation_id": conversation_id, "messages": data}
