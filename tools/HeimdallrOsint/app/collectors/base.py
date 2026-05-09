"""Base collector contract.

Every collector module implements BaseCollector and yields RawFinding objects.
The orchestrator handles dedup, persistence, and severity normalization.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class RawFinding:
    """Finding as emitted by a collector — not yet deduped / persisted."""

    finding_type: str
    title: str
    description: Optional[str] = None
    evidence_url: Optional[str] = None
    severity: str = "info"  # critical | high | medium | low | info
    raw_data: dict[str, Any] = field(default_factory=dict)
    # Fields used to compute dedup_hash. If not set, collector + title + evidence_url is used.
    dedup_key: Optional[str] = None


@dataclass
class CollectorResult:
    collector_name: str
    ok: bool
    findings: list[RawFinding] = field(default_factory=list)
    error: Optional[str] = None
    skipped_reason: Optional[str] = None


class BaseCollector(ABC):
    """Abstract collector. Subclasses implement `run(domain)`."""

    name: str = "base"

    def is_enabled(self) -> tuple[bool, Optional[str]]:
        """Return (enabled, reason_if_disabled). Default: always enabled."""
        return True, None

    @abstractmethod
    async def run(self, domain: str) -> list[RawFinding]:
        """Execute the collector for the given domain. Raises on unrecoverable error."""
        ...

    async def execute(self, domain: str) -> CollectorResult:
        """Wraps `run()` with enable-check + error handling."""
        enabled, reason = self.is_enabled()
        if not enabled:
            logger.info("Collector %s skipped: %s", self.name, reason)
            return CollectorResult(collector_name=self.name, ok=True, skipped_reason=reason)

        try:
            findings = await self.run(domain)
            logger.info("Collector %s produced %d findings", self.name, len(findings))
            return CollectorResult(collector_name=self.name, ok=True, findings=findings)
        except Exception as e:  # noqa: BLE001 — collectors must not crash orchestrator
            logger.exception("Collector %s failed", self.name)
            return CollectorResult(collector_name=self.name, ok=False, error=str(e))

    @staticmethod
    def http_client(headers: Optional[dict[str, str]] = None) -> httpx.AsyncClient:
        """Build a sensible default async HTTP client."""
        base_headers = {"User-Agent": settings.USER_AGENT, "Accept": "application/json"}
        if headers:
            base_headers.update(headers)
        return httpx.AsyncClient(
            timeout=httpx.Timeout(settings.HTTP_TIMEOUT_SECONDS),
            headers=base_headers,
            follow_redirects=True,
        )
