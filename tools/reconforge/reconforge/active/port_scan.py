"""Pure-Python async TCP connect scan (top common ports).

Tidak butuh root, tidak butuh nmap. Untuk deep enum (banner/service version),
nanti bisa di-extend dengan grab banner per port.
"""
import asyncio
import socket
from ..core.config import CFG
from ..core.logger import get_logger

log = get_logger("active.portscan")


async def check_port(host: str, port: int, timeout: float = 2.0) -> tuple[int, bool, str]:
    try:
        fut = asyncio.open_connection(host, port)
        reader, writer = await asyncio.wait_for(fut, timeout=timeout)

        # Try grab banner (non-blocking, short window)
        banner = ""
        try:
            data = await asyncio.wait_for(reader.read(256), timeout=1.5)
            banner = data.decode("utf-8", errors="ignore").strip()[:100]
        except Exception:
            pass

        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return port, True, banner
    except Exception:
        return port, False, ""


async def scan_host(host: str, ports: list[int] = None) -> dict:
    ports = ports or CFG.common_ports
    sem = asyncio.Semaphore(50)

    async def _bounded(p):
        async with sem:
            return await check_port(host, p)

    results = await asyncio.gather(*[_bounded(p) for p in ports])
    open_ports = {p: banner for p, is_open, banner in results if is_open}
    return {"host": host, "open_ports": open_ports}


async def scan_many(hosts: list[str], ports: list[int] = None) -> list[dict]:
    log.info(f"port scan {len(hosts)} hosts × {len(ports or CFG.common_ports)} ports")
    sem = asyncio.Semaphore(20)  # max parallel host

    async def _wrap(h):
        async with sem:
            return await scan_host(h, ports)

    return await asyncio.gather(*[_wrap(h) for h in hosts])
