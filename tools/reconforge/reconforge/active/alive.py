"""Active HTTP/HTTPS alive probe with classification.

Mengisi data: status_code, title, server, tech, cdn, redirect, content_length,
http_alive, https_alive.
"""
import asyncio
import re
import ssl
import aiohttp
from ..core.runner import make_session, gather_bounded
from ..core.config import CFG
from ..core.logger import get_logger

log = get_logger("active.alive")

TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)

# Quick CDN/WAF fingerprints from headers
CDN_SIGS = {
    "cloudflare": ["cf-ray", "cloudflare"],
    "akamai": ["akamai", "x-akamai"],
    "cloudfront": ["cloudfront", "x-amz-cf-id"],
    "fastly": ["fastly", "x-served-by"],
    "incapsula": ["x-iinfo", "incap_ses"],
    "sucuri": ["x-sucuri-id"],
    "azure": ["x-azure-ref", "x-msedge-ref"],
    "google": ["x-goog-", "gws"],
}

# Tech stack from headers / body keywords
TECH_HEADERS = {
    "nginx": "nginx",
    "apache": "apache",
    "iis": "iis",
    "caddy": "caddy",
    "litespeed": "litespeed",
    "openresty": "openresty",
    "envoy": "envoy",
}

TECH_BODY = {
    "wordpress": [r"wp-content", r"wp-includes"],
    "drupal": [r"Drupal\.settings", r"sites/all/"],
    "joomla": [r"/components/com_", r"Joomla!"],
    "react": [r"__REACT_DEVTOOLS", r"react-dom"],
    "vue": [r"__VUE__", r"vue\.js"],
    "angular": [r"ng-version", r"ng-app"],
    "next.js": [r"__NEXT_DATA__", r"_next/static"],
    "laravel": [r"laravel_session", r"XSRF-TOKEN"],
    "django": [r"csrfmiddlewaretoken", r"__admin"],
    "express": [r"X-Powered-By: Express"],
    "phpmyadmin": [r"phpMyAdmin"],
    "jenkins": [r"X-Jenkins"],
    "grafana": [r"grafana"],
    "kibana": [r"kbn-name", r"kibana"],
    "gitlab": [r"GitLab"],
    "swagger": [r"swagger-ui", r"openapi"],
}


def _detect_cdn(headers: dict) -> str | None:
    hdr_str = " ".join(f"{k.lower()}:{v.lower()}" for k, v in headers.items())
    for name, sigs in CDN_SIGS.items():
        if any(s.lower() in hdr_str for s in sigs):
            return name
    return None


def _detect_tech(headers: dict, body: str) -> list[str]:
    found = []
    server = headers.get("Server", "").lower() + " " + headers.get("X-Powered-By", "").lower()
    for tech, kw in TECH_HEADERS.items():
        if kw in server:
            found.append(tech)
    body_l = body[:50000].lower()
    for tech, patterns in TECH_BODY.items():
        for p in patterns:
            if re.search(p, body_l, re.IGNORECASE):
                found.append(tech)
                break
    return list(dict.fromkeys(found))  # dedup, preserve order


def _interesting_tag(subdomain: str) -> str | None:
    s = subdomain.lower()
    for kw in CFG.interesting_keywords:
        if kw in s:
            return kw
    return None


async def probe_one(session: aiohttp.ClientSession, subdomain: str, scheme: str) -> dict | None:
    url = f"{scheme}://{subdomain}"
    try:
        async with session.get(url, allow_redirects=False, ssl=False) as r:
            body = ""
            try:
                body = await r.text(errors="ignore")
            except Exception:
                pass
            title_m = TITLE_RE.search(body) if body else None
            title = (title_m.group(1).strip()[:200] if title_m else "").replace("\n", " ")
            headers = dict(r.headers)
            return {
                "scheme": scheme,
                "status": r.status,
                "title": title,
                "server": headers.get("Server", ""),
                "redirect": headers.get("Location", ""),
                "content_length": len(body),
                "headers": headers,
                "body_snippet": body[:50000],
            }
    except (aiohttp.ClientError, asyncio.TimeoutError, ssl.SSLError):
        return None
    except Exception as e:
        log.debug(f"probe {url}: {e}")
        return None


async def probe(subdomain: str, session: aiohttp.ClientSession) -> dict:
    """Probe both http & https, return consolidated record."""
    https_res, http_res = await asyncio.gather(
        probe_one(session, subdomain, "https"),
        probe_one(session, subdomain, "http"),
    )

    rec = {
        "subdomain": subdomain,
        "http_alive": 0,
        "https_alive": 0,
        "status_code": None,
        "title": None,
        "server": None,
        "tech": None,
        "cdn": None,
        "redirect": None,
        "content_length": None,
        "interesting_tag": _interesting_tag(subdomain),
    }

    primary = https_res or http_res
    if https_res:
        rec["https_alive"] = 1
    if http_res:
        rec["http_alive"] = 1

    if primary:
        rec["status_code"] = primary["status"]
        rec["title"] = primary["title"]
        rec["server"] = primary["server"]
        rec["redirect"] = primary["redirect"]
        rec["content_length"] = primary["content_length"]
        rec["cdn"] = _detect_cdn(primary["headers"])
        tech = _detect_tech(primary["headers"], primary["body_snippet"])
        rec["tech"] = ",".join(tech) if tech else None

    return rec


async def probe_all(subdomains: list[str]) -> list[dict]:
    log.info(f"probing {len(subdomains)} hosts (concurrency={CFG.concurrency})")
    async with make_session(timeout=8) as session:
        tasks = [probe(s, session) for s in subdomains]
        results = await gather_bounded(tasks, limit=CFG.concurrency)
    # filter exceptions
    return [r for r in results if isinstance(r, dict)]
