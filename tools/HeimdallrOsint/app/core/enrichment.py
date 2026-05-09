"""Normalization + dedup for findings before persistence."""
from __future__ import annotations

import hashlib

from app.collectors.base import RawFinding


def compute_dedup_hash(collector: str, raw: RawFinding) -> str:
    """Stable per-finding hash used to avoid duplicate rows in DB."""
    key = raw.dedup_key or f"{collector}|{raw.finding_type}|{raw.title}|{raw.evidence_url or ''}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()
