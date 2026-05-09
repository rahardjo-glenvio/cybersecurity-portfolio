"""Pydantic schemas for API I/O."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# --- Finding ---


class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    collector: str
    finding_type: str
    title: str
    description: Optional[str] = None
    evidence_url: Optional[str] = None
    severity: str
    status: str
    first_seen: datetime
    last_seen: datetime


class FindingStatusUpdate(BaseModel):
    status: str = Field(pattern="^(new|acknowledged|false_positive|resolved)$")


# --- ScanRun ---


class ScanRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    collector: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str
    findings_count: int
    error: Optional[str] = None


# --- Target ---


class TargetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    domain: str
    active: bool
    added_at: datetime
    last_scan_at: Optional[datetime] = None


# --- Dashboard stats ---


class DashboardStats(BaseModel):
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    new_count: int
    last_scan_at: Optional[datetime] = None
