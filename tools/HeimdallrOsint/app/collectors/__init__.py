"""Collector modules — each module implements BaseCollector."""
from app.collectors.base import BaseCollector, CollectorResult, RawFinding
from app.collectors.crtsh import CrtShCollector
from app.collectors.github_dork import GitHubDorkCollector
from app.collectors.google_dork import GoogleDorkCollector
from app.collectors.leakcheck import LeakCheckCollector
from app.collectors.pastebin import PastebinCollector
from app.collectors.xposedornot import XposedOrNotCollector

__all__ = [
    "BaseCollector",
    "CollectorResult",
    "RawFinding",
    "CrtShCollector",
    "GitHubDorkCollector",
    "GoogleDorkCollector",
    "LeakCheckCollector",
    "PastebinCollector",
    "XposedOrNotCollector",
]


def get_all_collectors() -> list[BaseCollector]:
    """Return instances of all collectors. Individual collectors self-disable
    if prerequisites (API keys, config flags) are missing."""
    return [
        CrtShCollector(),
        XposedOrNotCollector(),
        LeakCheckCollector(),
        GitHubDorkCollector(),
        GoogleDorkCollector(),
        PastebinCollector(),
    ]
