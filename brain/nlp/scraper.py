import asyncio
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import aiohttp
from bs4 import BeautifulSoup


class ZeltaNewsScraper:
    """
    Nigerian financial news scraper for QUELO.

    Two-layer approach:
    - Layer 1: Direct web scraping of Nigerian news sites
    - Layer 2: NewsAPI fallback (reliable, structured JSON)

    Purpose: Feed clean headlines to nlp/scorer.py
    Do NOT score sentiment here. Only collect and normalise.
    """

    def __init__(
        self,
        session: aiohttp.ClientSession,
        max_items_per_site: int = 10,
        news_api_key: Optional[str] = None,
    ):
        self.session = session
        self.max_items_per_site = max_items_per_site
        self.news_api_key = news_api_key or os.getenv("NEWS_API_KEY", "")

        # ── Scraping targets ──────────────────────────────────────────────────
        # Selectors tuned for article titles only — not nav/footer/ads
        self.site_map = {
            "nairametrics": {
                "url": "https://nairametrics.com/category/financial-news/",
                "item_selector": "article, div.td_module_wrap",
                "title_selector": "h3.entry-title a, h2.entry-title a, h3 a, h2 a",
                "link_selector": "h3.entry-title a, h2.entry-title a, h3 a",
            },
            "businessday": {
                "url": "https://businessday.ng/category/news/economy/",
                "item_selector": "article",
                "title_selector": "h3.post-title a, h2.post-title a, h3 a, h2 a",
                "link_selector": "h3.post-title a, h2.post-title a, h3 a",
            },
            "punch": {
                "url": "https://punchng.com/topics/business/",
                "item_selector": "article, div.post-content",
                "title_selector": "h3.entry-title a, h2.entry-title a, h3 a",
                "link_selector": "h3.entry-title a, h2.entry-title a",
            },
        }

        # ── NewsAPI keywords for Nigerian financial context ────────────────────
        # These are the same terms that drive QUELO's stress signal
        self.newsapi_queries = [
            "naira exchange rate",
            "CBN Nigeria",
            "Nigeria inflation",
            "ASUU strike Nigeria",
            "Nigeria economy 2026",
        ]

        # ── Relevance filter — keeps NLP scorer focused ───────────────────────
        self.relevant_keywords = {
            # Macro
            "naira", "usd", "dollar", "fx", "inflation", "cbn",
            "interest rate", "economy", "recession", "policy",
            "exchange rate", "devalue", "economics", "bank",
            "market", "prices", "forex", "mpc", "monetary",
            # Campus amplifiers — OAU student specific
            "asuu", "strike", "tuition", "hostel", "oau",
            "student", "cost of living", "university", "fee",
        }

        # Deduplication across all sources
        self.seen_titles: set = set()

    # ── HELPERS ───────────────────────────────────────────────────────────────

    def _normalize(self, title: str) -> str:
        return " ".join(title.lower().split()).strip()

    def _is_relevant(self, title: str) -> bool:
        """
        Lightweight keyword filter before NLP.
        Keeps scorer.py fast by removing off-topic headlines.
        """
        t = title.lower()
        return any(kw in t for kw in self.relevant_keywords)

    def _build_url(self, base: str, link: str) -> str:
        if not link:
            return base
        return urljoin(base, link)

    def _make_item(
        self,
        source: str,
        title: str,
        url: str,
    ) -> Dict[str, Any]:
        return {
            "source": source,
            "title": title,
            "url": url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ── LAYER 1: WEB SCRAPING ─────────────────────────────────────────────────

    async def _fetch_html(self, url: str) -> Optional[str]:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }
        try:
            async with self.session.get(
                url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=20),
            ) as resp:
                if resp.status != 200:
                    return None
                return await resp.text()
        except Exception:
            return None

    def _extract_items(
        self,
        html: str,
        source_name: str,
        source_url: str,
        cfg: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        items: List[Dict[str, Any]] = []

        for block in soup.select(cfg["item_selector"]):
            # Title — use tighter selectors to avoid nav/footer/ads
            title_tag = block.select_one(cfg["title_selector"])
            if not title_tag:
                continue

            title = title_tag.get_text(" ", strip=True)
            if not title or len(title) < 15:
                continue

            normalized = self._normalize(title)
            if normalized in self.seen_titles:
                continue
            if not self._is_relevant(title):
                continue

            # Link
            link_tag = block.select_one(cfg["link_selector"])
            href = link_tag.get("href") if link_tag else None
            link = self._build_url(source_url, href or source_url)

            self.seen_titles.add(normalized)
            items.append(self._make_item(source_name, title, link))

            if len(items) >= self.max_items_per_site:
                break

        return items

    async def _fetch_site(
        self,
        name: str,
        cfg: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        html = await self._fetch_html(cfg["url"])
        if not html:
            print(f"[Scraper] Could not fetch {name} — will rely on NewsAPI")
            return []
        try:
            return self._extract_items(html, name, cfg["url"], cfg)
        except Exception as e:
            print(f"[Scraper] Parse error on {name}: {e}")
            return []

    # ── LAYER 2: NEWSAPI FALLBACK ─────────────────────────────────────────────

    async def _fetch_newsapi(self) -> List[Dict[str, Any]]:
        """
        NewsAPI structured JSON fallback.
        More reliable than scraping — sites can change HTML anytime.
        Free tier: 100 requests/day — enough for MVP.
        Get key at newsapi.org
        """
        if not self.news_api_key:
            print("[NewsAPI] No API key found — skipping")
            return []

        items: List[Dict[str, Any]] = []

        for query in self.newsapi_queries:
            try:
                async with self.session.get(
                    "https://newsapi.org/v2/everything",
                    params={
                        "q": query,
                        "language": "en",
                        "sortBy": "publishedAt",
                        "pageSize": 8,
                        "apiKey": self.news_api_key,
                    },
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status != 200:
                        continue

                    data = await resp.json()
                    articles = data.get("articles", [])

                    for article in articles:
                        title = article.get("title", "")
                        if not title or len(title) < 15:
                            continue

                        # Filter out removed articles
                        if "[Removed]" in title:
                            continue

                        normalized = self._normalize(title)
                        if normalized in self.seen_titles:
                            continue
                        if not self._is_relevant(title):
                            continue

                        url = article.get("url", "")
                        self.seen_titles.add(normalized)
                        items.append(
                            self._make_item("newsapi", title, url)
                        )

            except Exception as e:
                print(f"[NewsAPI] Error on query '{query}': {e}")
                continue

        print(f"[NewsAPI] Fetched {len(items)} headlines")
        return items

    # ── MAIN ENTRY POINT ──────────────────────────────────────────────────────

    async def get_payload(self) -> List[Dict[str, Any]]:
        """
        Runs both layers in parallel.
        Returns deduplicated, relevant Nigerian financial headlines.
        Newest first.
        """
        # Layer 1 — scraping (parallel)
        scrape_tasks = [
            self._fetch_site(name, cfg)
            for name, cfg in self.site_map.items()
        ]

        # Layer 2 — NewsAPI (runs alongside scraping)
        all_tasks = scrape_tasks + [self._fetch_newsapi()]
        results = await asyncio.gather(*all_tasks, return_exceptions=True)

        payload: List[Dict[str, Any]] = []
        for result in results:
            if isinstance(result, Exception):
                continue
            payload.extend(result)

        # Sort newest first
        payload.sort(key=lambda x: x["timestamp"], reverse=True)

        print(
            f"[QUELO Scraper] Total headlines collected: {len(payload)} "
            f"from {len(set(i['source'] for i in payload))} sources"
        )
        return payload


# ── STANDALONE TEST ───────────────────────────────────────────────────────────

async def run_scraper() -> List[Dict[str, Any]]:
    """
    Entry point called by stress/index.py
    Also runnable standalone for testing.
    """
    async with aiohttp.ClientSession() as session:
        scraper = ZeltaNewsScraper(
            session=session,
            max_items_per_site=10,
            news_api_key=os.getenv("NEWS_API_KEY"),
        )
        payload = await scraper.get_payload()
        print(f"\nSample headlines:")
        for item in payload[:5]:
            print(f"  [{item['source']}] {item['title'][:70]}")
        return payload


if __name__ == "__main__":
    asyncio.run(run_scraper())
