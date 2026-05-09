"""Shared DuckDuckGo HTML search helper for collectors.

DDG HTML endpoint (`https://html.duckduckgo.com/html/`) accepts POSTed form
searches and returns plain HTML — no API key required.

Characteristics vs real Google:
  - Lower recall (less exhaustive index)
  - More lenient to scrapers
  - Will soft-block with empty results on heavy burst usage
"""
from __future__ import annotations

import asyncio
import logging
import random
from dataclasses import dataclass
from typing import Optional
from urllib.parse import parse_qs, unquote, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


# Rotating UA pool to reduce block probability.
_UAS = [
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
]


@dataclass
class DDGResult:
    url: str
    title: str
    snippet: str


class DDGBlockedError(RuntimeError):
    """Raised when DDG appears to be rate-limiting / blocking us."""


async def ddg_search(query: str, max_results: int = 10) -> list[DDGResult]:
    """Execute a single DDG HTML search and return parsed results."""
    ua = random.choice(_UAS)
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://duckduckgo.com/",
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0), follow_redirects=True) as client:
        resp = await client.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query, "kl": "us-en"},
            headers=headers,
        )

    if resp.status_code in (429, 403):
        raise DDGBlockedError(f"DDG returned {resp.status_code}")

    resp.raise_for_status()
    html = resp.text

    # DDG's anti-bot page has a distinct marker.
    if "anomaly" in html.lower() and "DuckDuckGo" in html:
        raise DDGBlockedError("DDG anomaly challenge page detected")

    soup = BeautifulSoup(html, "lxml")
    anchors = soup.select("a.result__a")
    snippets_map: dict[str, str] = {}
    for snip_el in soup.select(".result__snippet"):
        parent = snip_el.find_parent(class_="result")
        if parent:
            link = parent.select_one("a.result__a")
            if link and link.get("href"):
                snippets_map[link["href"]] = snip_el.get_text(" ", strip=True)

    out: list[DDGResult] = []
    for a in anchors[:max_results]:
        href = a.get("href", "")
        title = a.get_text(strip=True)
        if not href:
            continue

        # DDG wraps outbound links in /l/?uddg=<encoded>
        parsed = urlparse(href)
        if parsed.netloc.endswith("duckduckgo.com") and "uddg=" in parsed.query:
            qs = parse_qs(parsed.query)
            if "uddg" in qs:
                href = unquote(qs["uddg"][0])

        out.append(DDGResult(url=href, title=title, snippet=snippets_map.get(a.get("href", ""), "")))

    return out


async def throttled_ddg_search(
    query: str,
    max_results: int = 10,
    delay_before: float = 0.0,
) -> Optional[list[DDGResult]]:
    """Wrapper with pre-delay + jitter + single-retry on soft-block."""
    if delay_before > 0:
        await asyncio.sleep(delay_before + random.uniform(0, 0.6))
    try:
        return await ddg_search(query, max_results=max_results)
    except DDGBlockedError:
        logger.warning("DDG blocked for query: %s — backing off 15s", query)
        await asyncio.sleep(15)
        try:
            return await ddg_search(query, max_results=max_results)
        except DDGBlockedError:
            logger.warning("DDG still blocked after backoff — skipping: %s", query)
            return None
    except Exception as e:  # noqa: BLE001
        logger.warning("DDG error for '%s': %s", query, e)
        return None
