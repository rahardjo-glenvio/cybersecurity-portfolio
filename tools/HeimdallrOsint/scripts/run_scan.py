"""Run a one-off scan for the configured target domain.

Usage:
    python -m scripts.run_scan
    python -m scripts.run_scan example.org   # override domain
"""
from __future__ import annotations

import asyncio
import sys

from app.config import settings
from app.core.orchestrator import run_scan_for_domain
from app.db import init_db


async def _main() -> None:
    domain = sys.argv[1] if len(sys.argv) > 1 else settings.TARGET_DOMAIN
    init_db()
    result = await run_scan_for_domain(domain)
    print("=" * 60)
    print(f"Scan complete for: {domain}")
    print("=" * 60)
    for c in result["collectors"]:
        status = "OK" if c["ok"] else "FAIL"
        tag = f"[{status}]"
        if c["skipped"]:
            tag = "[SKIP]"
        print(f"{tag:6} {c['name']:14} findings={c['findings']}", end="")
        if c["error"]:
            print(f"  err={c['error']}")
        elif c["skipped"]:
            print(f"  reason={c['skipped']}")
        else:
            print()


if __name__ == "__main__":
    asyncio.run(_main())
