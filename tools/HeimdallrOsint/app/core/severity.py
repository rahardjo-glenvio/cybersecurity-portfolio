"""Severity utilities."""
from __future__ import annotations

SEVERITY_ORDER: dict[str, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "info": 0,
}

VALID_SEVERITIES = set(SEVERITY_ORDER.keys())


def normalize(sev: str) -> str:
    s = (sev or "").strip().lower()
    return s if s in VALID_SEVERITIES else "info"


def rank(sev: str) -> int:
    return SEVERITY_ORDER.get(normalize(sev), 0)
