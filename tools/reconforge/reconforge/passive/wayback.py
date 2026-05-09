"""Wayback Machine URL harvesting — find historical endpoints, params, files."""
from urllib.parse import urlparse, parse_qs
from ..core.runner import make_session
from ..core.logger import get_logger

log = get_logger("passive.wayback")

INTERESTING_EXT = {
    ".bak", ".old", ".backup", ".sql", ".env", ".log", ".config", ".conf",
    ".json", ".xml", ".yml", ".yaml", ".tar", ".zip", ".gz", ".7z",
    ".key", ".pem", ".pub", ".csv", ".sqlite", ".db", ".swp",
}


async def fetch_urls(domain: str, limit: int = 5000) -> dict:
    """Return classified URLs: {endpoints, params, sensitive_files, all}."""
    url = (
        f"http://web.archive.org/cdx/search/cdx"
        f"?url=*.{domain}/*&output=json&fl=original&collapse=urlkey&limit={limit}"
    )
    out = {"all": [], "endpoints": set(), "params": set(), "sensitive_files": []}
    try:
        async with make_session(timeout=60) as session:
            async with session.get(url) as r:
                if r.status != 200:
                    return out
                data = await r.json(content_type=None)
                for row in data[1:]:
                    if not row:
                        continue
                    u = row[0]
                    out["all"].append(u)
                    p = urlparse(u)
                    out["endpoints"].add(f"{p.scheme}://{p.netloc}{p.path}")
                    for param in parse_qs(p.query).keys():
                        out["params"].add(param)
                    # sensitive file detection
                    path = p.path.lower()
                    for ext in INTERESTING_EXT:
                        if path.endswith(ext):
                            out["sensitive_files"].append(u)
                            break
    except Exception as e:
        log.debug(f"wayback URLs: {e}")
    out["endpoints"] = list(out["endpoints"])
    out["params"] = list(out["params"])
    return out
