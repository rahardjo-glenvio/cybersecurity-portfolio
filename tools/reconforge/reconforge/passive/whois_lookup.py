"""WHOIS data extraction."""
import whois
import asyncio
from ..core.logger import get_logger

log = get_logger("passive.whois")


async def lookup(domain: str) -> dict:
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, whois.whois, domain)
        if not data:
            return {}

        out = {
            "domain_name": data.get("domain_name"),
            "registrar": data.get("registrar"),
            "creation_date": data.get("creation_date"),
            "expiration_date": data.get("expiration_date"),
            "updated_date": data.get("updated_date"),
            "name_servers": data.get("name_servers"),
            "emails": data.get("emails"),
            "org": data.get("org"),
            "country": data.get("country"),
            "status": data.get("status"),
        }
        # normalize lists & dates
        for k, v in out.items():
            if isinstance(v, list):
                out[k] = list({str(x) for x in v if x})
            elif v is not None:
                out[k] = str(v)
        return out
    except Exception as e:
        log.debug(f"whois fail: {e}")
        return {}
