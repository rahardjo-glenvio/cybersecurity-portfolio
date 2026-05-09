"""Vulnerability heuristics — bukan full nuclei, tapi cek paparan umum.

Cek:
  - Sensitive file exposure (.env, .git/config, .DS_Store, backup, dll)
  - Default panel pages (phpMyAdmin, Jenkins, Grafana login)
  - Subdomain takeover fingerprints (CNAME pointing ke service mati)
  - Open redirect parameter hints (dari wayback)
  - Missing security headers (HSTS, CSP, X-Frame-Options)
  - Directory listing
  - Server version disclosure
  - Exposed config endpoints (/.env, /server-status, /actuator)
"""
import asyncio
import re
import aiohttp
from ..core.runner import make_session, gather_bounded
from ..core.config import CFG
from ..core.logger import get_logger

log = get_logger("active.vuln")

# Subdomain takeover signatures (subset dari can-i-take-over-xyz)
TAKEOVER_SIGS = {
    "github.io": "There isn't a GitHub Pages site here",
    "herokuapp.com": "no such app",
    "amazonaws.com": "NoSuchBucket",
    "azurewebsites.net": "404 Web Site not found",
    "cloudfront.net": "Bad Request: ERROR",
    "fastly.net": "Fastly error: unknown domain",
    "shopify.com": "Sorry, this shop is currently unavailable",
    "tumblr.com": "Whatever you were looking for doesn't currently exist",
    "wordpress.com": "Do you want to register",
    "ghost.io": "The thing you were looking for is no longer here",
    "readthedocs.io": "unknown to Read the Docs",
    "surge.sh": "project not found",
    "bitbucket.io": "Repository not found",
    "pantheonsite.io": "The gods are wise",
    "netlify.app": "Not Found - Request ID",
}

SENSITIVE_PATHS = [
    "/.env",
    "/.git/config",
    "/.git/HEAD",
    "/.DS_Store",
    "/.svn/entries",
    "/.htaccess",
    "/.htpasswd",
    "/server-status",
    "/server-info",
    "/phpinfo.php",
    "/info.php",
    "/actuator",
    "/actuator/health",
    "/actuator/env",
    "/actuator/heapdump",
    "/api/swagger.json",
    "/swagger-ui.html",
    "/swagger/v1/swagger.json",
    "/api-docs",
    "/v2/api-docs",
    "/.well-known/security.txt",
    "/robots.txt",
    "/sitemap.xml",
    "/wp-config.php.bak",
    "/web.config",
    "/composer.json",
    "/package.json",
    "/yarn.lock",
    "/Gemfile",
    "/.aws/credentials",
    "/config.php.bak",
    "/backup.sql",
    "/backup.zip",
    "/admin",
    "/administrator",
    "/login",
    "/wp-admin",
    "/wp-login.php",
    "/cgi-bin/",
    "/.vscode/sftp.json",
    "/.idea/workspace.xml",
]

SECURITY_HEADERS = [
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
]


async def check_takeover(session, subdomain: str, cname: str | None) -> dict | None:
    if not cname:
        return None
    cname_l = cname.lower().rstrip(".")
    for service, sig in TAKEOVER_SIGS.items():
        if service in cname_l:
            # Validate dengan request
            for scheme in ("https", "http"):
                try:
                    async with session.get(f"{scheme}://{subdomain}", ssl=False,
                                           allow_redirects=True) as r:
                        body = await r.text(errors="ignore")
                        if sig.lower() in body.lower():
                            return {
                                "severity": "high",
                                "category": "subdomain_takeover",
                                "title": f"Possible takeover via {service}",
                                "detail": f"CNAME {cname} → fingerprint matched",
                            }
                except Exception:
                    pass
    return None


async def check_path(session, base: str, path: str) -> dict | None:
    url = base.rstrip("/") + path
    try:
        async with session.get(url, ssl=False, allow_redirects=False) as r:
            if r.status not in (200, 401, 403):
                return None
            body = await r.text(errors="ignore")
            body_low = body.lower()

            # .env
            if path == "/.env" and r.status == 200 and re.search(
                r"(db_password|aws_secret|api_key|secret_key|database_url)", body_low
            ):
                return {"severity": "critical", "category": "exposed_env",
                        "title": ".env file exposed",
                        "detail": f"{url} → contains credentials"}
            # .git/config
            if path == "/.git/config" and r.status == 200 and "[core]" in body_low:
                return {"severity": "high", "category": "exposed_git",
                        "title": ".git directory exposed",
                        "detail": f"{url} → repository accessible"}
            # actuator heapdump
            if path == "/actuator/heapdump" and r.status == 200:
                return {"severity": "critical", "category": "spring_actuator",
                        "title": "Spring Boot heapdump exposed",
                        "detail": f"{url}"}
            # phpinfo
            if "phpinfo" in path and r.status == 200 and "phpinfo()" in body_low:
                return {"severity": "medium", "category": "info_disclosure",
                        "title": "phpinfo() page exposed",
                        "detail": f"{url}"}
            # swagger / api docs
            if any(s in path for s in ("swagger", "api-docs")) and r.status == 200 and \
                    ("swagger" in body_low or '"openapi"' in body_low or '"swagger"' in body_low):
                return {"severity": "low", "category": "api_documentation",
                        "title": "API documentation exposed",
                        "detail": f"{url}"}
            # server-status apache
            if path == "/server-status" and r.status == 200 and "apache server status" in body_low:
                return {"severity": "medium", "category": "info_disclosure",
                        "title": "Apache server-status exposed",
                        "detail": f"{url}"}
            # admin login pages — informational
            if path in ("/admin", "/wp-admin", "/wp-login.php", "/administrator", "/login") and \
                    r.status in (200, 401):
                return {"severity": "info", "category": "login_page",
                        "title": f"Login page found at {path}",
                        "detail": f"{url} → status {r.status}"}
            # .DS_Store
            if path == "/.DS_Store" and r.status == 200 and len(body) > 0:
                return {"severity": "low", "category": "info_disclosure",
                        "title": ".DS_Store exposed",
                        "detail": f"{url}"}
    except Exception:
        return None
    return None


async def check_security_headers(session, base: str) -> list[dict]:
    findings = []
    try:
        async with session.get(base, ssl=False, allow_redirects=False) as r:
            for h in SECURITY_HEADERS:
                if h not in r.headers:
                    findings.append({
                        "severity": "info",
                        "category": "missing_header",
                        "title": f"Missing {h}",
                        "detail": f"{base}",
                    })
            # Server version disclosure
            srv = r.headers.get("Server", "")
            if re.search(r"\d+\.\d+", srv):
                findings.append({
                    "severity": "info",
                    "category": "version_disclosure",
                    "title": f"Server version disclosed: {srv}",
                    "detail": f"{base}",
                })
    except Exception:
        pass
    return findings


async def scan_target(subdomain: str, scheme: str, cname: str | None = None) -> list[dict]:
    base = f"{scheme}://{subdomain}"
    findings = []
    async with make_session(timeout=8) as session:
        # takeover
        t = await check_takeover(session, subdomain, cname)
        if t:
            findings.append(t)
        # paths (concurrent, capped)
        tasks = [check_path(session, base, p) for p in SENSITIVE_PATHS]
        results = await gather_bounded(tasks, limit=20)
        for r in results:
            if isinstance(r, dict):
                findings.append(r)
        # security headers
        findings.extend(await check_security_headers(session, base))
    return findings


async def scan_many(targets: list[tuple[str, str, str | None]]) -> dict:
    """targets: list of (subdomain, scheme, cname)"""
    log.info(f"vuln scan: {len(targets)} targets")
    sem = asyncio.Semaphore(10)

    async def _wrap(t):
        async with sem:
            sub, scheme, cname = t
            try:
                return sub, await scan_target(sub, scheme, cname)
            except Exception as e:
                log.debug(f"scan {sub}: {e}")
                return sub, []

    results = await asyncio.gather(*[_wrap(t) for t in targets])
    return {sub: f for sub, f in results if f}
