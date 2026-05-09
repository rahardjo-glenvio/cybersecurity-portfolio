"""DNS records (A, AAAA, MX, NS, TXT, CNAME, SOA) via dnspython."""
import asyncio
import dns.resolver
import dns.asyncresolver
from ..core.logger import get_logger

log = get_logger("passive.dns")

RECORD_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "SOA", "CNAME"]


async def query(domain: str, rtype: str) -> list[str]:
    try:
        resolver = dns.asyncresolver.Resolver()
        resolver.timeout = 5
        resolver.lifetime = 5
        answers = await resolver.resolve(domain, rtype, raise_on_no_answer=False)
        return [str(rdata).strip() for rdata in answers]
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
        return []
    except Exception as e:
        log.debug(f"DNS {rtype} {domain}: {e}")
        return []


async def get_all_records(domain: str) -> dict[str, list[str]]:
    tasks = {rt: asyncio.create_task(query(domain, rt)) for rt in RECORD_TYPES}
    return {rt: await t for rt, t in tasks.items()}


async def resolve_subdomain(subdomain: str) -> tuple[bool, str | None, str | None]:
    """Return (resolved, ip, cname)."""
    try:
        resolver = dns.asyncresolver.Resolver()
        resolver.timeout = 3
        resolver.lifetime = 3

        cname = None
        try:
            cn = await resolver.resolve(subdomain, "CNAME", raise_on_no_answer=False)
            if cn.rrset:
                cname = str(cn[0].target).rstrip(".")
        except Exception:
            pass

        try:
            a = await resolver.resolve(subdomain, "A", raise_on_no_answer=False)
            if a.rrset:
                return True, str(a[0]), cname
        except Exception:
            pass

        return False, None, cname
    except Exception:
        return False, None, None
