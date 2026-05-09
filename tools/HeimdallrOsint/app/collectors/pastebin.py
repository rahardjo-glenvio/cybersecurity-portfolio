"""Pastebin leak detection via DuckDuckGo HTML search.

Rationale:
  - Pastebin's scraping API requires a paid Pro account.
  - Google search scraping is aggressively rate-limited and often blocked.
  - DuckDuckGo's HTML endpoint is more lenient and requires no API key.

Strategy:
  Search DDG for `site:pastebin.com "{domain}"` (and a few sibling paste sites)
  and surface each hit as a MEDIUM finding for manual triage.

CAVEAT: DDG HTML results are best-effort and may be empty / blocked on
heavy use. This collector is a tripwire, not a guarantee of coverage.
"""
from __future__ import annotations

import logging
from typing import Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from app.collectors.base import BaseCollector, RawFinding
from app.config import settings

logger = logging.getLogger(__name__)


PASTE_SITES = [
    "pastebin.com",
    "paste.ee",
    "ghostbin.com",
    "justpaste.it",
    "rentry.co",
    "controlc.com",
]


class PastebinCollector(BaseCollector):
    name = "pastebin"

    def is_enabled(self) -> tuple[bool, Optional[str]]:
        if not settings.PASTEBIN_ENABLED:
            return False, "PASTEBIN_ENABLED=false"
        return True, None

    async def run(self, domain: str) -> list[RawFinding]:
        findings: list[RawFinding] = []

        # Mimic a real browser — DDG HTML endpoint is picky about UA
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml",
        }

        async with self.http_client(headers=headers) as client:
            for site in PASTE_SITES:
                query = f'site:{site} "{domain}"'
                try:
                    resp = await client.post(
                        "https://html.duckduckgo.com/html/",
                        data={"q": query, "kl": "us-en"},
                    )
                    resp.raise_for_status()
                except Exception as e:  # noqa: BLE001
                    logger.warning("DDG search failed for %s: %s", site, e)
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                # DDG result links are in a.result__a
                anchors = soup.select("a.result__a")
                for a in anchors:
                    href = a.get("href", "")
                    text = a.get_text(strip=True)
                    if not href:
                        continue
                    # DDG sometimes wraps real URL in a redirect
                    parsed = urlparse(href)
                    if parsed.netloc.endswith("duckduckgo.com") and "uddg=" in parsed.query:
                        # real URL is in the `uddg` param (url-encoded)
                        from urllib.parse import parse_qs, unquote

                        qs = parse_qs(parsed.query)
                        if "uddg" in qs:
                            href = unquote(qs["uddg"][0])
                            parsed = urlparse(href)

                    if site not in parsed.netloc:
                        continue

                    findings.append(
                        RawFinding(
                            finding_type="paste_leak",
                            title=f"[{site}] {text[:180]}",
                            description=(
                                f"Paste matching domain '{domain}' found on {site}. "
                                f"Manual triage required — may contain leaked credentials, "
                                f"source code, or unrelated mentions."
                            ),
                            evidence_url=href,
                            severity="medium",
                            raw_data={"site": site, "url": href, "snippet": text, "query": query},
                            dedup_key=f"paste:{site}:{href}",
                        )
                    )

        logger.info("Pastebin: %d findings for %s", len(findings), domain)
        return findings
