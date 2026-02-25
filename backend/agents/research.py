import asyncio
import logging
from typing import List, Dict, Any
from tavily import TavilyClient
from config import TAVILY_API_KEY

logger = logging.getLogger(__name__)


class ResearchAgent:
    """
    Executes 3 waves of Tavily searches, each wave building on entities
    extracted from the previous wave.
    """

    def __init__(self):
        self.client = TavilyClient(api_key=TAVILY_API_KEY)
        self.seen_urls: set = set()

    def _search(self, query: str, topic: str = "general") -> List[Dict[str, Any]]:
        """Run a single Tavily search and return deduplicated results."""
        try:
            response = self.client.search(
                query=query,
                search_depth="advanced",
                include_answer=True,
                include_raw_content=False,
                max_results=5,
                topic=topic,
            )
            results = []
            for r in response.get("results", []):
                url = r.get("url", "")
                if url not in self.seen_urls:
                    self.seen_urls.add(url)
                    results.append(r)
            # Include the synthesized answer too
            answer = response.get("answer", "")
            if answer:
                results.insert(0, {"url": f"tavily_answer_{query[:30]}", "content": answer, "title": "Tavily Answer"})
            return results
        except Exception as e:
            logger.warning(f"Tavily search failed for '{query}': {e}")
            return []

    async def _parallel_search(self, queries: List[tuple]) -> List[Dict[str, Any]]:
        """
        Run multiple searches in parallel using a thread pool.
        queries: list of (query_string, topic) tuples
        """
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(None, self._search, q, topic)
            for q, topic in queries
        ]
        results_list = await asyncio.gather(*tasks, return_exceptions=True)
        combined = []
        for results in results_list:
            if isinstance(results, list):
                combined.extend(results)
        return combined

    async def wave_1(self, company: str) -> List[Dict[str, Any]]:
        """Broad company intelligence — 4 parallel searches."""
        queries = [
            (f"{company} company overview funding investors", "general"),
            (f"{company} founders executives leadership team", "general"),
            (f"{company} competitors market landscape", "general"),
            (f"{company} revenue traction customers growth", "general"),
        ]
        logger.info(f"Wave 1: {len(queries)} searches for '{company}'")
        return await self._parallel_search(queries)

    async def wave_2(
        self,
        company: str,
        sector: str,
        competitors: List[str],
    ) -> List[Dict[str, Any]]:
        """Sector + M&A deep-dive using extracted entities from wave 1."""
        current_year = "2025"
        queries = [
            (f"M&A acquisitions {sector} {current_year}", "general"),
            (f"{sector} market size TAM growth rate", "general"),
            (f"companies acquired in {sector} deal size valuation", "general"),
        ]
        # Add targeted competitor queries (up to 3)
        for comp in competitors[:3]:
            queries.append((f"{comp} funding investors valuation", "general"))

        logger.info(f"Wave 2: {len(queries)} searches for sector '{sector}'")
        return await self._parallel_search(queries)

    async def wave_3(
        self,
        company: str,
        sector: str,
        top_acquirers: List[str],
    ) -> List[Dict[str, Any]]:
        """Risk signals + exit intelligence using extracted acquirer names."""
        queries = [
            (f"{company} layoffs controversy risks problems", "news"),
            (f"{company} partnerships strategic deals", "general"),
            (f"{sector} IPO SPAC exit 2024 2025", "general"),
        ]
        # Acquirer intelligence
        for acquirer in top_acquirers[:2]:
            queries.append((f"{acquirer} acquisition strategy M&A history", "general"))

        logger.info(f"Wave 3: {len(queries)} searches for signals")
        return await self._parallel_search(queries)

    def format_for_extraction(self, results: List[Dict[str, Any]]) -> str:
        """Convert raw Tavily results into a clean text blob for the LLM."""
        parts = []
        for i, r in enumerate(results[:40], 1):  # Cap at 40 sources to stay within token limits
            title = r.get("title", "")
            url = r.get("url", "")
            content = r.get("content", "")
            if content:
                parts.append(f"[Source {i}] {title}\n{url}\n{content}\n")
        return "\n---\n".join(parts)
