from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, HttpUrl
import uuid
import json
import os
from pathlib import Path
import urllib.parse
import urllib.request
from app.config import redis_client
from app.utils.supabase_client import supabase

router = APIRouter()


class IngestURLRequest(BaseModel):
    url: HttpUrl
    source: str = "web"


@router.post("/ingest-url", status_code=202)
async def ingest_url(payload: IngestURLRequest):
    """Accept a URL, create a job, and enqueue it for ingestion."""

    # Check if URL is already ingested
    try:
        existing = supabase.table("documents").select("doc_id", "status").eq("url", str(payload.url)).execute()
        if existing.data and len(existing.data) > 0:
            doc = existing.data[0]
            if doc["status"] == "completed":
                return {"message": "URL already ingested", "doc_id": doc["doc_id"]}
            elif doc["status"] == "processing":
                return {"message": "URL ingestion already in progress", "doc_id": doc["doc_id"]}
            elif doc["status"] == "queued":
                return {"message": "URL ingestion already queued", "doc_id": doc["doc_id"]}

            doc_id = doc["doc_id"]
        else:
            # URL is not ingested, create a new job
            doc_id = str(uuid.uuid4())

            supabase.table("documents").insert({
                "doc_id": doc_id,
                "url": str(payload.url),
                "source": payload.source,
                "status": "pending"
            }).execute()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase query failed: {e}")

    # Create ingestion job payload
    job_id = str(uuid.uuid4())
    job_payload = {
        "job_id": job_id,
        "doc_id": doc_id,
        "url": str(payload.url)
    }

    # Push to Redis queue
    try:
        redis_client.rpush("ingest:jobs", json.dumps(job_payload))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Redis enqueue failed: {e}")

    # Update document status to 'queued'
    try:
        supabase.table("documents").update({"status": "queued"}).eq("doc_id", doc_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase update failed: {e}")

    return {"message": "Ingestion job queued", "job_id": job_id, "doc_id": doc_id}



@router.post("/upload", status_code=202)
async def upload_pdf(file: UploadFile = File(...)):
    """Accept a PDF upload and queue it for page-aware ingestion.

    Saves file to ./data/uploads/{doc_id}.pdf and enqueues a job with file_path.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    # Create upload directory
    base_dir = Path.cwd() / "data" / "uploads"
    base_dir.mkdir(parents=True, exist_ok=True)

    doc_id = str(uuid.uuid4())
    dest_path = base_dir / f"{doc_id}.pdf"

    try:
        with open(dest_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    # Insert document record
    try:
        supabase.table("documents").insert({
            "doc_id": doc_id,
            "url": dest_path.as_uri(),
            "source": "upload",
            "status": "queued",
            "file_name": file.filename
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase insert failed: {e}")

    # Enqueue ingestion job with file path
    job_id = str(uuid.uuid4())
    job_payload = {
        "job_id": job_id,
        "doc_id": doc_id,
        "file_path": str(dest_path)
    }

    try:
        redis_client.rpush("ingest:jobs", json.dumps(job_payload))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Redis enqueue failed: {e}")

    return {"message": "Upload queued for ingestion", "job_id": job_id, "doc_id": doc_id, "url": dest_path.as_uri()}


@router.get("/documents/{doc_id}/pdf")
async def get_document_pdf(doc_id: str):
    """Return the original PDF for a given doc_id.

    Priority order:
    1. Local uploads directory: ./data/uploads/{doc_id}.pdf
    2. Supabase `documents` table `url` field when it points to a local file (file://) or an absolute path
    3. If `url` is http(s) return a redirect so frontend can download the file
    """
    # 1) Check local uploads directory first
    local_path = Path.cwd() / "data" / "uploads" / f"{doc_id}.pdf"
    if local_path.exists():
        return FileResponse(path=str(local_path), media_type="application/pdf", filename=f"{doc_id}.pdf")

    # 2) Query Supabase for the document record
    try:
        res = supabase.table("documents").select("url", "file_name").eq("doc_id", doc_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase query failed: {e}")

    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = res.data[0]
    url = doc.get("url")
    file_name = doc.get("file_name") or f"{doc_id}.pdf"

    if not url:
        raise HTTPException(status_code=404, detail="No file url available for this document")

    # If the URL is a file:// URI, convert to local path and serve
    if isinstance(url, str) and url.startswith("file://"):
        try:
            parsed = urllib.parse.urlparse(url)
            # Convert URL path to OS-native path (handles Windows drive letters)
            local_file_path = Path(urllib.request.url2pathname(parsed.path))
            if local_file_path.exists():
                return FileResponse(path=str(local_file_path), media_type="application/pdf", filename=file_name)
            else:
                raise HTTPException(status_code=404, detail="Local file referenced by document record not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to resolve local file URL: {e}")

    # If the URL is an http(s) link, redirect the client to it so the frontend can fetch
    if isinstance(url, str) and (url.startswith("http://") or url.startswith("https://")):
        return RedirectResponse(url)

    # As a last resort, if url is a plain filesystem path
    try:
        fallback_path = Path(url)
        if fallback_path.exists():
            return FileResponse(path=str(fallback_path), media_type="application/pdf", filename=file_name)
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Document file not found")
