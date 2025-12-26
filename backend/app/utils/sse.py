import json

def format_sse(event_type: str, data: dict) -> str:
    """Return an SSE-formatted string for given event type and data."""
    return f"event: {event_type}\n" + "data: " + json.dumps(data, ensure_ascii=False) + "\n\n"
