import requests
from bs4 import BeautifulSoup
import pdfplumber
from typing import List, Dict

def fetch_url(url, timeout=10):
    """Fetch raw HTML from a URL."""
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.text

def extract_main_text(html):
    """Extract main textual content from HTML."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove scripts, styles, and irrelevant tags
    for tag in soup(["script", "style", "header", "footer", "nav"]):
        tag.decompose()

    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)

def chunk_text(text, chunk_size=400, overlap=50):
    """Split text into chunks with some overlap (token-based or approx by words)."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap  # overlap words
    return chunks


def extract_text_from_pdf(file_path: str) -> List[str]:
    """Return a list of page texts for the given PDF file path."""
    pages = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            try:
                txt = page.extract_text() or ""
            except Exception:
                txt = ""
            pages.append(txt)
    return pages


def chunk_page_text_with_offsets(page_text: str, chunk_size_chars: int = 2000, overlap_chars: int = 200) -> List[Dict]:
    """Chunk a single page's text into chunks and return list of dicts with offsets.

    Offsets are character offsets within the page.
    """
    if not page_text:
        return []

    chunks = []
    start = 0
    text_len = len(page_text)
    while start < text_len:
        end = min(start + chunk_size_chars, text_len)
        chunk_text = page_text[start:end]
        chunks.append({
            "text": chunk_text,
            "start_offset": start,
            "end_offset": end
        })
        if end == text_len:
            break
        start = max(0, end - overlap_chars)

    return chunks
