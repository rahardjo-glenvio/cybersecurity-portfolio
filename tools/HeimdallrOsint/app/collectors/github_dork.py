"""GitHub code search — dork-based exposed credential discovery.

Queries GitHub's code search API for high-signal dork patterns targeting
the organization's domain. Requires a Personal Access Token (classic) with
at least `public_repo` scope (GitHub code search requires authentication).

Rate limit: 30 req/min with auth; we stay well under this.

Note: GitHub code search indexes are not exhaustive — this is a tripwire,
not a guarantee of complete coverage. Findings should be manually triaged.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from app.collectors.base import BaseCollector, RawFinding
from app.config import settings

logger = logging.getLogger(__name__)


# High-signal dork queries. Each is a template; {domain} gets substituted.
# Ordered rough high-to-low severity.
DORKS: list[tuple[str, str, str]] = [
    # (query_template, finding_type, severity)
    ('"{domain}" "BEGIN RSA PRIVATE KEY"', "exposed_private_key", "critical"),
    ('"{domain}" "BEGIN OPENSSH PRIVATE KEY"', "exposed_private_key", "critical"),
    ('"{domain}" "AWS_SECRET_ACCESS_KEY"', "exposed_secret", "critical"),
    ('"{domain}" "aws_access_key_id"', "exposed_secret", "high"),
    ('"{domain}" filename:.env', "exposed_env_file", "high"),
    ('"{domain}" filename:credentials', "exposed_secret", "high"),
    ('"@{domain}" password', "exposed_credential", "high"),
    ('"{domain}" "api_key"', "exposed_secret", "medium"),
    ('"{domain}" "apikey"', "exposed_secret", "medium"),
    ('"{domain}" filename:config.json password', "exposed_secret", "medium"),
    ('"{domain}" filename:.pgpass', "exposed_secret", "high"),
    ('"{domain}" filename:id_rsa', "exposed_private_key", "critical"),
    ('"@{domain}" filename:htpasswd', "exposed_credential", "high"),
]


class GitHubDorkCollector(BaseCollector):
    name = "github_dork"

    def is_enabled(self) -> tuple[bool, Optional[str]]:
        if not settings.GITHUB_TOKEN:
            return False, "GITHUB_TOKEN not configured"
        return True, None

    async def run(self, domain: str) -> list[RawFinding]:
        headers = {
            "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        url = "https://api.github.com/search/code"

        findings: list[RawFinding] = []
        async with self.http_client(headers=headers) as client:
            for idx, (template, ftype, severity) in enumerate(DORKS):
                q = template.format(domain=domain)
                try:
                    resp = await client.get(url, params={"q": q, "per_page": 10})
                except Exception as e:  # noqa: BLE001
                    logger.warning("GitHub dork failed (%s): %s", q, e)
                    continue

                # Handle GitHub rate limiting politely.
                if resp.status_code == 403 and "rate limit" in resp.text.lower():
                    reset = resp.headers.get("X-RateLimit-Reset", "?")
                    logger.warning("GitHub rate limited. Reset at %s. Aborting further dorks.", reset)
                    break

                if resp.status_code == 422:
                    # Invalid query — log and move on
                    logger.debug("GitHub 422 for query %s", q)
                    continue

                if resp.status_code != 200:
                    logger.warning("GitHub %s for query %s", resp.status_code, q)
                    continue

                data = resp.json()
                items = data.get("items", [])
                for item in items:
                    repo = item.get("repository", {})
                    repo_full = repo.get("full_name", "unknown/unknown")
                    path = item.get("path", "")
                    html_url = item.get("html_url", "")
                    findings.append(
                        RawFinding(
                            finding_type=ftype,
                            title=f"{repo_full}/{path}",
                            description=(
                                f"Match for dork `{q}` in public GitHub repo. "
                                f"Manual review required — may be a true exposure or a false positive."
                            ),
                            evidence_url=html_url,
                            severity=severity,
                            raw_data={"dork": q, "item": {"repo": repo_full, "path": path, "url": html_url}},
                            dedup_key=f"github:{repo_full}:{path}:{ftype}",
                        )
                    )

                # Pace ourselves — 30 req/min limit on code search.
                await asyncio.sleep(2.2)

        logger.info("GitHub: %d findings for %s", len(findings), domain)
        return findings
