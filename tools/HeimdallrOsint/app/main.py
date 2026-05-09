"""FastAPI application entrypoint."""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.orchestrator import run_scan_for_domain
from app.core.scheduler import start_scheduler, stop_scheduler
from app.db import SessionLocal, init_db
from app.models import Target
from app.routers import api as api_router
from app.routers import dashboard as dashboard_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup ---
    logger.info("%s starting up (target=%s)", settings.APP_NAME, settings.TARGET_DOMAIN)
    init_db()

    # Seed target row if missing (idempotent)
    db = SessionLocal()
    try:
        t = db.query(Target).filter(Target.domain == settings.TARGET_DOMAIN).one_or_none()
        if not t:
            db.add(Target(domain=settings.TARGET_DOMAIN, active=True))
            db.commit()
            logger.info("Seeded target %s", settings.TARGET_DOMAIN)
    finally:
        db.close()

    start_scheduler()
    if settings.SCAN_ON_STARTUP:
        logger.info("SCAN_ON_STARTUP=true → firing initial scan")
        asyncio.create_task(run_scan_for_domain(settings.TARGET_DOMAIN))

    yield

    # --- shutdown ---
    logger.info("%s shutting down", settings.APP_NAME)
    stop_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="Corporate OSINT & Exposure Monitor — proactive threat-intel dashboard.",
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(dashboard_router.router)
app.include_router(api_router.router)


@app.get("/healthz")
def healthz():
    return {"ok": True, "app": settings.APP_NAME, "target": settings.TARGET_DOMAIN}
