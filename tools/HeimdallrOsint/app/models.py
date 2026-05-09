"""ORM models for HeimdallrOsint."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Target(Base):
    """A domain being monitored."""

    __tablename__ = "targets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    domain: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    active: Mapped[bool] = mapped_column(default=True, nullable=False)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    last_scan_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    findings: Mapped[list["Finding"]] = relationship(back_populates="target", cascade="all, delete-orphan")
    scan_runs: Mapped[list["ScanRun"]] = relationship(back_populates="target", cascade="all, delete-orphan")


class ScanRun(Base):
    """A single execution of one collector against a target."""

    __tablename__ = "scan_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    target_id: Mapped[int] = mapped_column(ForeignKey("targets.id", ondelete="CASCADE"), index=True)
    collector: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="running", nullable=False)  # running|success|failed|skipped
    findings_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    target: Mapped[Target] = relationship(back_populates="scan_runs")


class Finding(Base):
    """An individual exposure finding, deduplicated via dedup_hash per target."""

    __tablename__ = "findings"
    __table_args__ = (UniqueConstraint("target_id", "dedup_hash", name="uq_finding_target_dedup"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    target_id: Mapped[int] = mapped_column(ForeignKey("targets.id", ondelete="CASCADE"), index=True)
    scan_run_id: Mapped[Optional[int]] = mapped_column(ForeignKey("scan_runs.id", ondelete="SET NULL"), nullable=True)

    collector: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    finding_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    # e.g. leaked_credential | exposed_secret | subdomain | paste_leak | breach_email

    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    raw_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON blob

    dedup_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    severity: Mapped[str] = mapped_column(String(16), default="info", index=True, nullable=False)
    # critical | high | medium | low | info
    status: Mapped[str] = mapped_column(String(16), default="new", index=True, nullable=False)
    # new | acknowledged | false_positive | resolved

    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    target: Mapped[Target] = relationship(back_populates="findings")
