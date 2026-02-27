import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Use explicit absolute path so reload workers always find the .env
_here = Path(__file__).resolve().parent
_env_path = _here / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=True)
else:
    # Fallback: walk up directories
    load_dotenv(find_dotenv(usecwd=True), override=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

NEO4J_URI = os.getenv("NEO4J_URI", "")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

# Whether Neo4j is available — agent degrades gracefully if not
NEO4J_ENABLED = bool(NEO4J_URI and NEO4J_PASSWORD)

DATABASE_URL = os.getenv("DATABASE_URL", "")
