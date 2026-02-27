import json
import logging
from config import DATABASE_URL

logger = logging.getLogger(__name__)

pool = None

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS analyses (
    id           SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    sector       TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    result_json  JSONB NOT NULL
);
"""


async def init_pool():
    global pool
    if not DATABASE_URL:
        logger.info("DATABASE_URL not set — history persistence disabled")
        return
    try:
        import asyncpg
        # Render provides postgres:// — asyncpg accepts both schemes
        url = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        pool = await asyncpg.create_pool(url, min_size=1, max_size=5)
        async with pool.acquire() as conn:
            await conn.execute(_CREATE_TABLE)
        logger.info("Database pool initialised")
    except Exception as e:
        logger.warning(f"Database init failed — history disabled: {e}")
        pool = None


async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None


async def save_analysis(company_name: str, sector: str, result: dict) -> dict | None:
    if not pool:
        return None
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO analyses (company_name, sector, result_json)
                VALUES ($1, $2, $3)
                RETURNING id, created_at
                """,
                company_name,
                sector or "",
                json.dumps(result),
            )
            return {"id": row["id"], "created_at": row["created_at"].isoformat()}
    except Exception as e:
        logger.warning(f"save_analysis failed: {e}")
        return None


async def get_analyses(limit: int = 20) -> list[dict]:
    if not pool:
        return []
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, company_name, sector, created_at
                FROM analyses
                ORDER BY created_at DESC
                LIMIT $1
                """,
                limit,
            )
            return [
                {
                    "id": r["id"],
                    "company_name": r["company_name"],
                    "sector": r["sector"],
                    "created_at": r["created_at"].isoformat(),
                }
                for r in rows
            ]
    except Exception as e:
        logger.warning(f"get_analyses failed: {e}")
        return []


async def get_analysis(id: int) -> dict | None:
    if not pool:
        return None
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, company_name, sector, created_at, result_json
                FROM analyses
                WHERE id = $1
                """,
                id,
            )
            if not row:
                return None
            return {
                "id": row["id"],
                "company_name": row["company_name"],
                "sector": row["sector"],
                "created_at": row["created_at"].isoformat(),
                "result": json.loads(row["result_json"]),
            }
    except Exception as e:
        logger.warning(f"get_analysis failed: {e}")
        return None


async def delete_analysis(id: int) -> bool:
    if not pool:
        return False
    try:
        async with pool.acquire() as conn:
            result = await conn.execute("DELETE FROM analyses WHERE id = $1", id)
            return result == "DELETE 1"
    except Exception as e:
        logger.warning(f"delete_analysis failed: {e}")
        return False
