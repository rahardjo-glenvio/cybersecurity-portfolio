"""JSON API routes."""
from __future__ import annotations

import asyncio
import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.core.orchestrator import run_scan_for_domain
from app.db import get_db
from app.models import Finding, ScanRun, Target
from app.schemas import (
    DashboardStats,
    FindingOut,
    FindingStatusUpdate,
    ScanRunOut,
    TargetOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["api"])


# Rough domain validation: labels 1–63 chars, allowed [a-z0-9-], TLD ≥2 chars.
_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$",
    re.IGNORECASE,
)


def _normalize_domain(raw: str) -> str:
    d = (raw or "").strip().lower()
    # strip common prefixes
    for p in ("http://", "https://", "www."):
        if d.startswith(p):
            d = d[len(p):]
    d = d.rstrip("/")
    return d


def _resolve_target(db: Session, domain: str | None) -> Target | None:
    """Return the Target matching `domain`, or the configured default."""
    if domain:
        return db.query(Target).filter(Target.domain == domain).one_or_none()
    return db.query(Target).filter(Target.domain == settings.TARGET_DOMAIN).one_or_none()


class CreateTargetIn(BaseModel):
    domain: str


# ----------------- Target CRUD -----------------

@router.get("/targets", response_model=list[TargetOut])
def list_targets(db: Session = Depends(get_db)):
    return db.query(Target).order_by(Target.added_at.desc()).all()


@router.post("/targets", status_code=201)
async def create_target(
    request: Request,
    db: Session = Depends(get_db),
):
    """Accept either form-encoded `domain=...` (HTMX) or JSON `{"domain": ...}`.
    Creates the target if missing, triggers a scan, returns an HX-Redirect."""
    raw: str | None = None

    ctype = (request.headers.get("content-type") or "").lower()
    if ctype.startswith("application/json"):
        try:
            body = await request.json()
            raw = (body or {}).get("domain")
        except Exception:  # noqa: BLE001
            raw = None
    else:
        form = await request.form()
        raw = form.get("domain")  # type: ignore[assignment]

    if not raw:
        raise HTTPException(400, "domain is required")

    d = _normalize_domain(str(raw))
    if not _DOMAIN_RE.match(d):
        raise HTTPException(400, f"Invalid domain format: {raw}")

    existing = db.query(Target).filter(Target.domain == d).one_or_none()
    if existing:
        target = existing
        target.active = True
    else:
        target = Target(domain=d, active=True)
        db.add(target)
    db.commit()
    db.refresh(target)

    # Fire scan in background
    asyncio.create_task(run_scan_for_domain(d))
    logger.info("Target created/reactivated: %s (scan dispatched)", d)

    return Response(
        status_code=201,
        headers={"HX-Redirect": f"/?target={d}"},
    )


@router.delete("/targets/{domain}", status_code=204)
def delete_target(domain: str, db: Session = Depends(get_db)):
    d = _normalize_domain(domain)
    t = db.query(Target).filter(Target.domain == d).one_or_none()
    if not t:
        raise HTTPException(404, "Target not found")
    db.delete(t)  # cascades to findings + scan_runs
    db.commit()
    return Response(status_code=204, headers={"HX-Redirect": "/"})


@router.get("/target", response_model=TargetOut)
def get_current_target(target: str | None = Query(None), db: Session = Depends(get_db)):
    t = _resolve_target(db, _normalize_domain(target) if target else None)
    if not t:
        raise HTTPException(404, "Target not initialized yet — add one first.")
    return t


# ----------------- Scan control -----------------

@router.post("/scan", status_code=202)
async def trigger_scan(target: str | None = Query(None), db: Session = Depends(get_db)):
    d = _normalize_domain(target) if target else settings.TARGET_DOMAIN
    asyncio.create_task(run_scan_for_domain(d))
    return {"status": "accepted", "domain": d}


# ----------------- Findings -----------------

@router.get("/findings", response_model=list[FindingOut])
def list_findings(
    target: str | None = Query(None),
    severity: str | None = Query(None),
    collector: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
):
    t = _resolve_target(db, _normalize_domain(target) if target else None)
    if not t:
        return []
    q = db.query(Finding).filter(Finding.target_id == t.id)
    if severity:
        q = q.filter(Finding.severity == severity)
    if collector:
        q = q.filter(Finding.collector == collector)
    if status:
        q = q.filter(Finding.status == status)
    return q.order_by(Finding.first_seen.desc()).limit(limit).all()


@router.patch("/findings/{finding_id}/status", response_model=FindingOut)
def update_finding_status(finding_id: int, body: FindingStatusUpdate, db: Session = Depends(get_db)):
    f = db.get(Finding, finding_id)
    if not f:
        raise HTTPException(404, "Finding not found")
    f.status = body.status
    db.commit()
    db.refresh(f)
    return f


# ----------------- Scan runs -----------------

@router.get("/scan-runs", response_model=list[ScanRunOut])
def list_scan_runs(
    target: str | None = Query(None),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    t = _resolve_target(db, _normalize_domain(target) if target else None)
    if not t:
        return []
    return (
        db.query(ScanRun)
        .filter(ScanRun.target_id == t.id)
        .order_by(ScanRun.started_at.desc())
        .limit(limit)
        .all()
    )


# ----------------- Stats -----------------

@router.get("/stats", response_model=DashboardStats)
def get_stats(target: str | None = Query(None), db: Session = Depends(get_db)):
    t = _resolve_target(db, _normalize_domain(target) if target else None)
    if not t:
        return DashboardStats(
            total_findings=0, critical_count=0, high_count=0,
            medium_count=0, low_count=0, info_count=0,
            new_count=0, last_scan_at=None,
        )
    findings = db.query(Finding).filter(Finding.target_id == t.id).all()
    by_sev = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    new_count = 0
    for f in findings:
        by_sev[f.severity] = by_sev.get(f.severity, 0) + 1
        if f.status == "new":
            new_count += 1
    return DashboardStats(
        total_findings=len(findings),
        critical_count=by_sev["critical"],
        high_count=by_sev["high"],
        medium_count=by_sev["medium"],
        low_count=by_sev["low"],
        info_count=by_sev["info"],
        new_count=new_count,
        last_scan_at=t.last_scan_at,
    )
