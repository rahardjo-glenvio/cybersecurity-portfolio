"""XposedOrNot — free public breach database API.

Endpoints used:
  GET /v1/breaches?domain={domain}   — list breaches by domain
  (Domain endpoint is not authenticated for basic data.)

For MVP we use the domain breach enumeration. If the endpoint returns an
empty set or the domain is not found, no findings are produced.

See: https://xposedornot.com/api_doc
"""
from __future__ import annotations

import logging

from app.collectors.base import BaseCollector, RawFinding
from app.config import settings

logger = logging.getLogger(__name__)


class XposedOrNotCollector(BaseCollector):
    name = "xposedornot"

    async def run(self, domain: str) -> list[RawFinding]:
        # XposedOrNot supports `/v1/breaches?domain=` (public, no auth)
        url = f"{settings.XPOSEDORNOT_BASE_URL}/breaches"
        params = {"domain": domain}

        async with self.http_client() as client:
            resp = await client.get(url, params=params)
            # 404 = no breaches for this domain; treat as empty
            if resp.status_code == 404:
                logger.info("XposedOrNot: no breach data for %s", domain)
                return []
            resp.raise_for_status()
            try:
                data = resp.json()
            except ValueError:
                logger.warning("XposedOrNot: non-JSON response for %s", domain)
                return []

        # Response shape historically: {"exposedBreaches": [...]}
        breaches = []
        if isinstance(data, dict):
            breaches = data.get("exposedBreaches") or data.get("breaches") or []
        elif isinstance(data, list):
            breaches = data

        findings: list[RawFinding] = []
        for b in breaches:
            if not isinstance(b, dict):
                continue
            breach_name = b.get("breachID") or b.get("name") or b.get("title") or "Unknown breach"
            breach_date = b.get("breachedDate") or b.get("date") or "unknown date"
            records = b.get("exposedRecords") or b.get("pwnCount") or 0
            data_classes = b.get("exposedData") or b.get("dataClasses") or []
            if isinstance(data_classes, str):
                data_classes = [d.strip() for d in data_classes.split(";") if d.strip()]

            # Severity: has password/credential → high, PII-only → medium
            dc_lower = {d.lower() for d in data_classes}
            if any(k in s for s in dc_lower for k in ("password", "hash", "credential")):
                severity = "high"
            elif dc_lower:
                severity = "medium"
            else:
                severity = "low"

            title = f"Domain in breach: {breach_name}"
            desc = (
                f"Domain {domain} appears in breach '{breach_name}' dated {breach_date}. "
                f"Exposed records: {records}. "
                f"Data classes: {', '.join(data_classes) if data_classes else 'unknown'}."
            )

            findings.append(
                RawFinding(
                    finding_type="breach_domain",
                    title=title,
                    description=desc,
                    evidence_url=f"https://xposedornot.com/xposed/#{breach_name}",
                    severity=severity,
                    raw_data={"breach": b, "domain": domain},
                    dedup_key=f"xposedornot:breach:{breach_name}",
                )
            )

        logger.info("XposedOrNot: %d breach findings for %s", len(findings), domain)
        return findings
