"""LeakCheck — optional breach intelligence API.

Requires an API key. Self-disables if LEAKCHECK_API_KEY is not set.
Uses the domain-search endpoint for organizational threat intel.

See: https://leakcheck.io/api
"""
from __future__ import annotations

import logging
from typing import Optional

from app.collectors.base import BaseCollector, RawFinding
from app.config import settings

logger = logging.getLogger(__name__)


class LeakCheckCollector(BaseCollector):
    name = "leakcheck"

    def is_enabled(self) -> tuple[bool, Optional[str]]:
        if not settings.LEAKCHECK_API_KEY:
            return False, "LEAKCHECK_API_KEY not configured"
        return True, None

    async def run(self, domain: str) -> list[RawFinding]:
        # LeakCheck public API — domain search endpoint
        url = "https://leakcheck.io/api/public"
        params = {"check": domain, "type": "domain", "key": settings.LEAKCHECK_API_KEY}

        async with self.http_client() as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 429:
                raise RuntimeError("LeakCheck rate-limited (429)")
            resp.raise_for_status()
            data = resp.json()

        if not data.get("success"):
            logger.info("LeakCheck returned success=false for %s: %s", domain, data.get("error"))
            return []

        results = data.get("result") or []
        findings: list[RawFinding] = []
        for r in results:
            source = r.get("source", {})
            source_name = source.get("name") or "unknown-source"
            breach_date = source.get("breach_date") or "unknown"
            email = r.get("email") or r.get("line") or "unknown"

            severity = "high" if r.get("password") else "medium"

            findings.append(
                RawFinding(
                    finding_type="breach_email",
                    title=f"Credential leak: {email} @ {source_name}",
                    description=f"Email {email} found in breach '{source_name}' ({breach_date}).",
                    severity=severity,
                    raw_data={"record": r, "domain": domain},
                    dedup_key=f"leakcheck:{source_name}:{email}",
                )
            )

        logger.info("LeakCheck: %d findings for %s", len(findings), domain)
        return findings
