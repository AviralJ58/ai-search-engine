# from fastapi import APIRouter
# from app.utils.llm import generate_response

# router = APIRouter()

# @router.post("/query")
# async def query_endpoint(payload: dict):
#     """Takes user query and returns LLM-generated output (no retrieval yet)."""
#     user_input = payload.get("query", "")
#     if not user_input:
#         return {"error": "Query text missing"}
    
#     messages = [{"role": "user", "content": user_input}]
#     result = generate_response(messages)
#     return {"response": result}


from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.utils.llm import generate_response
from app.utils.embeddings import embed_texts
from app.utils.vectorstore import qdrant_client

router = APIRouter()

COLLECTION_NAME = "documents_chunks"
TOP_K = 5  # number of chunks to retrieve

class QueryRequest(BaseModel):
    query: str


@router.post("/query")
async def query_endpoint(payload: QueryRequest):
    user_query = payload.query.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Query text missing")

    try:
        # 1️⃣ Embed query
        query_vector = embed_texts([user_query])[0]

        # 2️⃣ Search Qdrant (use query_points for this Qdrant client)
        search_result = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=10,
            with_payload=True,
        )

        if not search_result:
            return {"response": "No relevant documents found.", "sources": []}

        # 3️⃣ Assemble context
        context_texts = []
        sources = []
        for hit in search_result:
            payload = hit.payload
            snippet = payload.get("text_snippet", "")
            url = payload.get("url", "")
            context_texts.append(snippet)
            sources.append(url)

        context = "\n\n".join(context_texts[:3]) # use top 3 chunks 

        # 4️⃣ Create prompt for LLM
        prompt = f"""
            You are an assistant that answers questions using the provided context.
            If the context does not contain enough information, answer based on your general knowledge.
            Context:
            {context}

            Question: {user_query}

            Answer:
            """

        print(prompt)

        # 5️⃣ Call Gemini LLM
        answer = generate_response([{"role": "user", "content": prompt}])

        return {
            "response": answer,
            "sources": list(set(sources))  # unique URLs
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {e}")
