from google import genai
from google.genai.types import HttpOptions
import os
from dotenv import load_dotenv

load_dotenv()

USE_VERTEXAI = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "True").lower() == "true"
API_KEY = os.getenv("GOOGLE_GENAI_API_KEY")

# Initialize once to reuse (avoid reloading model on every query)
client = genai.Client(http_options=HttpOptions(api_version="v1"), api_key=API_KEY, vertexai=USE_VERTEXAI)

def generate_response(messages):
    """Call the local transformer model with messages."""
    try:
        # Extract text content from OpenAI-style messages
        prompt_text = "\n".join([m["content"] for m in messages if "content" in m])

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt_text,  # pass a string instead of list of dicts
        )
        return response.text if response else "No response"
    except Exception as e:
        return f"LLM error: {e}"


def generate_response_stream(messages):
    """Stream response tokens from the LLM using generate_content_stream.

    Yields decoded string deltas as they arrive. This wrapper is intentionally
    small: it converts the SDK stream events into a simple generator of text
    pieces suitable for publishing as incremental `text_delta` events.
    """
    try:
        prompt_text = "\n".join([m.get("content", "") for m in messages])

        # The GenAI Python SDK exposes a streaming interface called
        # `generate_content_stream` which yields incremental response events.
        # Each event may contain a `.text` or `.delta` attribute depending on
        # SDK version; handle commonly seen shapes.
        stream = client.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=prompt_text,
        )

        for event in stream:
            # Event shapes vary; attempt to extract text from common fields.
            text = None
            if hasattr(event, "text") and event.text:
                text = event.text
            elif hasattr(event, "delta") and event.delta:
                # delta may be a dict with 'content' or similar
                if isinstance(event.delta, dict):
                    text = event.delta.get("content") or event.delta.get("text")
                else:
                    text = str(event.delta)
            elif isinstance(event, str):
                text = event

            if text:
                yield text

        # end of stream
        return

    except Exception as e:
        # On error, yield an error token so orchestrator can publish it
        yield f"LLM stream error: {e}"
