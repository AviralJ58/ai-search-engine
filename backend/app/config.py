import os
from dotenv import load_dotenv
from redis import Redis
from qdrant_client import QdrantClient

load_dotenv()

# Environment Variables
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")

# Initialize Clients
redis_client = Redis.from_url(REDIS_URL, decode_responses=True)

qdrant_client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
)

print(qdrant_client.get_collections())
