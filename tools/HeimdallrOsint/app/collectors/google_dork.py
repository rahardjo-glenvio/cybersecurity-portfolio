"""Google Dork collector — massive, tiered, category-based.

Backend: DuckDuckGo HTML (no API key required). Lower recall than real Google
but usable and unauthenticated.

Configuration (via .env):
  GOOGLE_DORK_ENABLED=true|false
  GOOGLE_DORK_TIERS=1,2,3        # comma-separated tier list
  GOOGLE_DORK_DELAY_SECONDS=1.8  # throttle between queries
  GOOGLE_DORK_MAX_RESULTS=8      # DDG results parsed per dork

Every hit is emitted as a RawFinding with the severity defined in the catalog.
Analyst triage required — dorks produce false positives.
"""
from __future__ import annotations

import logging
from typing import Optional

from app.collectors._ddg import throttled_ddg_search
from app.collectors.base import BaseCollector, RawFinding
from app.collectors.dorks_catalog import TOTAL_DORKS, get_dorks
from app.config import settings

logger = logging.getLogger(__name__)


class GoogleDorkCollector(BaseCollector):
    name = "google_dork"

    def is_enabled(self) -> tuple[bool, Optional[str]]:
        if not settings.GOOGLE_DORK_ENABLED:
            return False, "GOOGLE_DORK_ENABLED=false"
        tiers = self._active_tiers()
        if not tiers:
            return False, "GOOGLE_DORK_TIERS empty"
        return True, None

    def _active_tiers(self) -> set[int]:
        raw = (settings.GOOGLE_DORK_TIERS or "").strip()
        if not raw:
            return set()
        out: set[int] = set()
        for part in raw.split(","):
            part = part.strip()
            if part.isdigit():
                t = int(part)
                if t in (1, 2, 3):
                    out.add(t)
        return out

    async def run(self, domain: str) -> list[RawFinding]:
        tiers = self._active_tiers()
        dorks = get_dorks(tiers)
        logger.info(
            "GoogleDork: %d dorks active (tiers=%s) / %d total catalog",
            len(dorks), sorted(tiers), TOTAL_DORKS,
        )

        findings: list[RawFinding] = []
        consecutive_blocks = 0

        for idx, (tier, category, template, ftype, severity) in enumerate(dorks, start=1):
            query = template.format(domain=domain)
            logger.debug("GoogleDork [%d/%d] t%d/%s: %s", idx, len(dorks), tier, category, query)

            results = await throttled_ddg_search(
                query=query,
                max_results=settings.GOOGLE_DORK_MAX_RESULTS,
                delay_before=settings.GOOGLE_DORK_DELAY_SECONDS if idx > 1 else 0,
            )

            # None = blocked/error. Count consecutives to decide full abort.
            if results is None:
                consecutive_blocks += 1
                if consecutive_blocks >= 4:
                    logger.warning("GoogleDork: aborting — 4 consecutive DDG blocks")
                    break
                continue
            consecutive_blocks = 0

            for r in results:
                # Basic relevance guard: skip cached DDG pages or DDG itself
                if "duckduckgo.com" in r.url:
                    continue
                findings.append(
                    RawFinding(
                        finding_type=ftype,
                        title=f"[{category}] {r.title[:180]}",
                        description=(
                            f"Tier-{tier} dork hit for `{query}`.\n"
                            f"Snippet: {r.snippet[:240] or '(no snippet)'}\n"
                            f"Category: {category}. Manual triage required."
                        ),
                        evidence_url=r.url,
                        severity=severity,
                        raw_data={
                            "tier": tier,
                            "category": category,
                            "query": query,
                            "title": r.title,
                            "snippet": r.snippet,
                        },
                        dedup_key=f"gdork:{category}:{r.url}",
                    )
                )

        logger.info("GoogleDork: %d findings for %s (from %d dorks run)", len(findings), domain, len(dorks))
        return findings
