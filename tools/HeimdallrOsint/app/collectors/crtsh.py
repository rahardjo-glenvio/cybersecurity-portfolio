"""crt.sh — subdomain enumeration via Certificate Transparency logs.

crt.sh is a public CT log search service. We query it for the target domain
and extract all discovered (sub)domains. Each unique subdomain becomes an
INFO-severity finding — useful for attack-surface visibility.
"""
from __future__ import annotations

import logging

from app.collectors.base import BaseCollector, RawFinding
from app.config import settings

logger = logging.getLogger(__name__)


class CrtShCollector(BaseCollector):
    name = "crtsh"

    async def run(self, domain: str) -> list[RawFinding]:
        url = f"{settings.CRTSH_BASE_URL}/"
        params = {"q": f"%.{domain}", "output": "json"}

        async with self.http_client() as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json() if resp.content else []

        # Extract unique subdomains from name_value (may contain newlines and wildcards)
        subdomains: set[str] = set()
        for row in data:
            name_value = row.get("name_value", "")
            for entry in name_value.split("\n"):
                entry = entry.strip().lower().lstrip("*.")
                if not entry:
                    continue
                if entry == domain or entry.endswith(f".{domain}"):
                    subdomains.add(entry)

        findings: list[RawFinding] = []
        for sub in sorted(subdomains):
            findings.append(
                RawFinding(
                    finding_type="subdomain",
                    title=sub,
                    description=f"Subdomain discovered via Certificate Transparency logs for {domain}",
                    evidence_url=f"{settings.CRTSH_BASE_URL}/?q={sub}",
                    severity="info",
                    raw_data={"subdomain": sub, "parent": domain},
                    dedup_key=f"crtsh:subdomain:{sub}",
                )
            )

        logger.info("crt.sh: %d subdomains for %s", len(findings), domain)
        return findings
