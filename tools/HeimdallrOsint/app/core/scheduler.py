"""APScheduler wrapper — periodic background scans across ALL active targets."""
from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.core.orchestrator import run_scan_for_domain
from app.db import SessionLocal
from app.models import Target

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _scan_all_active() -> None:
    """Sequential scan of every active target to avoid overload."""
    db = SessionLocal()
    try:
        targets = db.query(Target).filter(Target.active == True).all()  # noqa: E712
        domains = [t.domain for t in targets]
    finally:
        db.close()

    if not domains:
        logger.info("Scheduler: no active targets to scan")
        return

    logger.info("Scheduler: scanning %d active target(s): %s", len(domains), domains)
    for d in domains:
        try:
            await run_scan_for_domain(d)
        except Exception:  # noqa: BLE001
            logger.exception("Scheduler: scan failed for %s", d)


def _job_wrapper() -> None:
    """APScheduler fires this synchronously; bridge to async."""
    logger.info("Scheduler firing multi-target scan")
    asyncio.create_task(_scan_all_active())


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        _job_wrapper,
        trigger=IntervalTrigger(minutes=settings.SCAN_INTERVAL_MINUTES),
        id="periodic_scan",
        name=f"Periodic OSINT scan ({settings.SCAN_INTERVAL_MINUTES}m, all active targets)",
        replace_existing=True,
        max_instances=1,
    )
    _scheduler.start()
    logger.info("Scheduler started (interval=%dm, mode=all-active-targets)", settings.SCAN_INTERVAL_MINUTES)
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler stopped")
