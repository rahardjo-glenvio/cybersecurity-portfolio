"""Passive subdomain enumeration from CT logs & threat intel feeds.

Sumber (semua public, tanpa API key kecuali yang dilabeli OPTIONAL):
  - crt.sh (Certificate Transparency logs)
  - HackerTarget
  - AlienVault OTX
  - RapidDNS
  - URLScan.io
  - Anubis-DB (jldc.me)
  - BufferOver (dns.bufferover.run)
  - Wayback Machine (web.archive.org)
  - SecurityTrails (OPTIONAL — butuh API key)
  - VirusTotal (OPTIONAL — butuh API key)
"""
import asyncio
import re
import json
from urllib.parse import urlparse
import aiohttp
from ..core.runner import make_session, gather_bounded
from ..core.config import CFG
from ..core.logger import get_logger

log = get_logger("passive.subdomain")

SUB_RE = re.compile(r"[a-zA-Z0-9_\-\.]+")


def _filter(domain: str, subs: set) -> set:
    """Hanya keep subdomain yang valid dan match domain target."""
    domain = domain.lower().lstrip(".")
    out = set()
    for s in subs:
        if not s:
            continue
        s = s.lower().strip().lstrip("*.").rstrip(".")
        # buang wildcard, hilangkan port
        s = s.split(":")[0]
        if not s or " " in s or "@" in s:
            continue
        if not s.endswith("." + domain) and s != domain:
            continue
        if not all(c.isalnum() or c in ".-_" for c in s):
            continue
        out.add(s)
    return out


# --- individual source fetchers ---

async def crtsh(session, domain: str) -> set:
    url = f"https://crt.sh/?q=%25.{domain}&output=json"
    try:
        async with session.get(url) as r:
            if r.status != 200:
                return set()
            data = await r.json(content_type=None)
            subs = set()
            for entry in data:
                names = entry.get("name_value", "").split("\n")
                for n in names:
                    subs.add(n.strip())
            return subs
    except Exception as e:
        log.debug(f"crtsh: {e}")
        return set()


async def hackertarget(session, domain: str) -> set:
    url = f"https://api.hackertarget.com/hostsearch/?q={domain}"
    try:
        async with session.get(url) as r:
            text = await r.text()
            if "API count exceeded" in text or r.status != 200:
                return set()
            return {line.split(",")[0] for line in text.splitlines() if "," in line}
    except Exception as e:
        log.debug(f"hackertarget: {e}")
        return set()


async def alienvault(session, domain: str) -> set:
    url = f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/passive_dns"
    try:
        async with session.get(url) as r:
            if r.status != 200:
                return set()
            data = await r.json(content_type=None)
            return {rec.get("hostname", "") for rec in data.get("passive_dns", [])}
    except Exception as e:
        log.debug(f"alienvault: {e}")
        return set()


async def rapiddns(session, domain: str) -> set:
    url = f"https://rapiddns.io/subdomain/{domain}?full=1#result"
    try:
        async with session.get(url) as r:
            if r.status != 200:
                return set()
            html = await r.text()
            # extract from table cells
            return set(re.findall(r"<td>([a-zA-Z0-9._-]+\." + re.escape(domain) + r")</td>", html))
    except Exception as e:
        log.debug(f"rapiddns: {e}")
        return set()


async def urlscan(session, domain: str) -> set:
    url = f"https://urlscan.io/api/v1/search/?q=domain:{domain}&size=10000"
    try:
        async with session.get(url) as r:
            if r.status != 200:
                return set()
            data = await r.json(content_type=None)
            subs = set()
            for res in data.get("results", []):
                page = res.get("page", {})
                subs.add(page.get("domain", ""))
                subs.add(page.get("apexDomain", ""))
            return subs
    except Exception as e:
        log.debug(f"urlscan: {e}")
        return set()


async def anubis(session, domain: str) -> set:
    url = f"https://jldc.me/anubis/subdomains/{domain}"
    try:
        async with session.get(url) as r:
            if r.status != 200:
                return set()
            data = await r.json(content_type=None)
            return set(data) if isinstance(data, list) else set()
    except Exception as e:
        log.debug(f"anubis: {e}")
        return set()


async def bufferover(session, domain: str) -> set:
    url = f"https://tls.bufferover.run/dns?q=.{domain}"
    try:
        async with session.get(url) as r:
            if r.status != 200:
                return set()
            data = await r.json(content_type=None)
            subs = set()
            for rec in (data.get("Results") or []):
                # format: "ip,*,*,*,host"
                parts = rec.split(",")
                if len(parts) >= 5:
                    subs.add(parts[4])
            return subs
    except Exception as e:
        log.debug(f"bufferover: {e}")
        return set()


async def wayback(session, domain: str) -> set:
    url = f"http://web.archive.org/cdx/search/cdx?url=*.{domain}/*&output=json&fl=original&collapse=urlkey"
    try:
        async with session.get(url) as r:
            if r.status != 200:
                return set()
            data = await r.json(content_type=None)
            subs = set()
            for row in data[1:]:  # skip header
                if not row:
                    continue
                u = row[0]
                try:
                    host = urlparse(u).hostname
                    if host:
                        subs.add(host)
                except Exception:
                    pass
            return subs
    except Exception as e:
        log.debug(f"wayback: {e}")
        return set()


async def securitytrails(session, domain: str) -> set:
    if not CFG.securitytrails_key:
        return set()
    url = f"https://api.securitytrails.com/v1/domain/{domain}/subdomains?children_only=false"
    try:
        async with session.get(url, headers={"APIKEY": CFG.securitytrails_key}) as r:
            if r.status != 200:
                return set()
            data = await r.json(content_type=None)
            return {f"{s}.{domain}" for s in data.get("subdomains", [])}
    except Exception as e:
        log.debug(f"securitytrails: {e}")
        return set()


async def virustotal(session, domain: str) -> set:
    if not CFG.virustotal_key:
        return set()
    url = f"https://www.virustotal.com/api/v3/domains/{domain}/subdomains?limit=40"
    try:
        async with session.get(url, headers={"x-apikey": CFG.virustotal_key}) as r:
            if r.status != 200:
                return set()
            data = await r.json(content_type=None)
            return {item.get("id", "") for item in data.get("data", [])}
    except Exception as e:
        log.debug(f"virustotal: {e}")
        return set()


SOURCES = {
    "crt.sh": crtsh,
    "hackertarget": hackertarget,
    "alienvault": alienvault,
    "rapiddns": rapiddns,
    "urlscan": urlscan,
    "anubis": anubis,
    "bufferover": bufferover,
    "wayback": wayback,
    "securitytrails": securitytrails,
    "virustotal": virustotal,
}


async def enumerate_subdomains(domain: str) -> dict[str, set]:
    """Return dict: {source_name: set_of_subdomains}"""
    results = {}
    async with make_session(timeout=30) as session:
        tasks = {name: asyncio.create_task(fn(session, domain)) for name, fn in SOURCES.items()}
        for name, task in tasks.items():
            try:
                subs = await task
                filtered = _filter(domain, subs)
                results[name] = filtered
                log.info(f"[{name}] {len(filtered)} subdomain ditemukan")
            except Exception as e:
                log.warning(f"[{name}] gagal: {e}")
                results[name] = set()
    return results
