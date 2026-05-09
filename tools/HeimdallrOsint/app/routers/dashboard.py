"""HTML dashboard routes (Jinja + HTMX partials)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Finding, ScanRun, Target

router = APIRouter(tags=["dashboard"])
templates = Jinja2Templates(directory="app/templates")


def _normalize_domain(raw: str) -> str:
    d = (raw or "").strip().lower()
    for p in ("http://", "https://", "www."):
        if d.startswith(p):
            d = d[len(p):]
    return d.rstrip("/")


def _resolve_target(db: Session, domain: str | None) -> Target | None:
    if domain:
        d = _normalize_domain(domain)
        t = db.query(Target).filter(Target.domain == d).one_or_none()
        if t:
            return t
    # fallback: default from settings
    return db.query(Target).filter(Target.domain == settings.TARGET_DOMAIN).one_or_none()


def _get_stats(db: Session, target: Target | None) -> dict:
    if not target:
        return {
            "total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0,
            "new": 0, "last_scan_at": None,
        }
    findings = db.query(Finding).filter(Finding.target_id == target.id).all()
    counts = {"total": len(findings), "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0, "new": 0}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1
        if f.status == "new":
            counts["new"] += 1
    counts["last_scan_at"] = target.last_scan_at
    return counts


def _list_all_targets(db: Session) -> list[Target]:
    return db.query(Target).order_by(Target.added_at.desc()).all()


@router.get("/", response_class=HTMLResponse)
def dashboard(
    request: Request,
    target: str | None = Query(None),
    db: Session = Depends(get_db),
):
    current = _resolve_target(db, target)
    all_targets = _list_all_targets(db)
    stats = _get_stats(db, current)

    findings = []
    recent_runs = []
    if current:
        findings = (
            db.query(Finding)
            .filter(Finding.target_id == current.id)
            .order_by(Finding.first_seen.desc())
            .limit(200)
            .all()
        )
        recent_runs = (
            db.query(ScanRun)
            .filter(ScanRun.target_id == current.id)
            .order_by(ScanRun.started_at.desc())
            .limit(10)
            .all()
        )

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "target_domain": current.domain if current else (settings.TARGET_DOMAIN or "—"),
            "target": current,
            "all_targets": all_targets,
            "stats": stats,
            "findings": findings,
            "recent_runs": recent_runs,
            "app_name": settings.APP_NAME,
            "scan_interval": settings.SCAN_INTERVAL_MINUTES,
        },
    )


@router.get("/partials/findings", response_class=HTMLResponse)
def partial_findings(
    request: Request,
    target: str | None = Query(None),
    severity: str | None = None,
    collector: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    current = _resolve_target(db, target)
    findings = []
    if current:
        q = db.query(Finding).filter(Finding.target_id == current.id)
        if severity:
            q = q.filter(Finding.severity == severity)
        if collector:
            q = q.filter(Finding.collector == collector)
        if status:
            q = q.filter(Finding.status == status)
        findings = q.order_by(Finding.first_seen.desc()).limit(200).all()
    return templates.TemplateResponse(
        "partials/findings_table.html",
        {"request": request, "findings": findings},
    )


@router.get("/partials/stats", response_class=HTMLResponse)
def partial_stats(
    request: Request,
    target: str | None = Query(None),
    db: Session = Depends(get_db),
):
    current = _resolve_target(db, target)
    stats = _get_stats(db, current)
    return templates.TemplateResponse(
        "partials/stats_cards.html",
        {"request": request, "stats": stats, "target": current},
    )


@router.get("/partials/scan-runs", response_class=HTMLResponse)
def partial_scan_runs(
    request: Request,
    target: str | None = Query(None),
    db: Session = Depends(get_db),
):
    current = _resolve_target(db, target)
    recent_runs = []
    if current:
        recent_runs = (
            db.query(ScanRun)
            .filter(ScanRun.target_id == current.id)
            .order_by(ScanRun.started_at.desc())
            .limit(10)
            .all()
        )
    return templates.TemplateResponse(
        "partials/scan_runs.html",
        {"request": request, "recent_runs": recent_runs},
    )


@router.get("/partials/target-bar", response_class=HTMLResponse)
def partial_target_bar(
    request: Request,
    target: str | None = Query(None),
    db: Session = Depends(get_db),
):
    current = _resolve_target(db, target)
    all_targets = _list_all_targets(db)
    return templates.TemplateResponse(
        "partials/target_bar.html",
        {
            "request": request,
            "target": current,
            "all_targets": all_targets,
            "target_domain": current.domain if current else (settings.TARGET_DOMAIN or "—"),
            "scan_interval": settings.SCAN_INTERVAL_MINUTES,
            "stats": _get_stats(db, current),
        },
    )
