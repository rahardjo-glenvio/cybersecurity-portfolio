"""Orchestrator — runs all collectors for a target and persists findings.

Responsibilities:
  1. Fan out collectors concurrently.
  2. Record one ScanRun per collector (running → success/failed/skipped).
  3. Upsert findings by (target_id, dedup_hash):
       - insert if new
       - update last_seen if already present
  4. Update target.last_scan_at.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.collectors import get_all_collectors
from app.collectors.base import BaseCollector, CollectorResult, RawFinding
from app.core.enrichment import compute_dedup_hash
from app.core.severity import normalize as normalize_severity
from app.db import SessionLocal
from app.models import Finding, ScanRun, Target

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _run_one_collector(collector: BaseCollector, target_id: int, domain: str) -> CollectorResult:
    """Run a single collector, writing a ScanRun row as it progresses."""
    db: Session = SessionLocal()
    run = ScanRun(target_id=target_id, collector=collector.name, status="running")
    db.add(run)
    db.commit()
    db.refresh(run)
    db.close()

    result = await collector.execute(domain)

    # Persist status + findings
    db = SessionLocal()
    try:
        run = db.get(ScanRun, run.id)
        run.finished_at = _utcnow()
        if not result.ok:
            run.status = "failed"
            run.error = result.error
            run.findings_count = 0
            db.commit()
            return result

        if result.skipped_reason:
            run.status = "skipped"
            run.error = result.skipped_reason
            run.findings_count = 0
            db.commit()
            return result

        persisted = 0
        for raw in result.findings:
            persisted += _upsert_finding(db, target_id=target_id, scan_run_id=run.id, raw=raw, collector_name=collector.name)

        run.status = "success"
        run.findings_count = persisted
        db.commit()
    finally:
        db.close()

    return result


def _upsert_finding(
    db: Session,
    *,
    target_id: int,
    scan_run_id: int,
    raw: RawFinding,
    collector_name: str,
) -> int:
    """Insert finding if new; update last_seen if it already exists. Returns 1 if new, else 0."""
    dedup_hash = compute_dedup_hash(collector_name, raw)
    existing = (
        db.query(Finding)
        .filter(Finding.target_id == target_id, Finding.dedup_hash == dedup_hash)
        .one_or_none()
    )
    now = _utcnow()
    if existing:
        existing.last_seen = now
        existing.scan_run_id = scan_run_id
        return 0

    f = Finding(
        target_id=target_id,
        scan_run_id=scan_run_id,
        collector=collector_name,
        finding_type=raw.finding_type,
        title=raw.title[:512],
        description=raw.description,
        evidence_url=raw.evidence_url,
        raw_data=json.dumps(raw.raw_data, default=str, ensure_ascii=False),
        dedup_hash=dedup_hash,
        severity=normalize_severity(raw.severity),
        status="new",
        first_seen=now,
        last_seen=now,
    )
    db.add(f)
    return 1


async def run_scan_for_domain(domain: str) -> dict:
    """Run all collectors against the given domain. Creates target if missing."""
    # Ensure target exists
    db = SessionLocal()
    try:
        target = db.query(Target).filter(Target.domain == domain).one_or_none()
        if target is None:
            target = Target(domain=domain, active=True)
            db.add(target)
            db.commit()
            db.refresh(target)
        target_id = target.id
    finally:
        db.close()

    collectors = get_all_collectors()
    logger.info("Starting scan for %s across %d collectors", domain, len(collectors))

    results = await asyncio.gather(
        *[_run_one_collector(c, target_id, domain) for c in collectors],
        return_exceptions=False,
    )

    # Update target.last_scan_at
    db = SessionLocal()
    try:
        target = db.get(Target, target_id)
        target.last_scan_at = _utcnow()
        db.commit()
    finally:
        db.close()

    summary = {
        "domain": domain,
        "collectors": [
            {
                "name": r.collector_name,
                "ok": r.ok,
                "skipped": r.skipped_reason,
                "error": r.error,
                "findings": len(r.findings),
            }
            for r in results
        ],
    }
    logger.info("Scan complete for %s: %s", domain, summary)
    return summary
