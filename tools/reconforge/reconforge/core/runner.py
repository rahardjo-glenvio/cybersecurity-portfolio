"""Async helper: bounded concurrent HTTP requests."""
import asyncio
import aiohttp
from typing import Callable, Awaitable, Iterable, Any
from .config import CFG
from .logger import get_logger

log = get_logger("runner")


async def gather_bounded(coros, limit: int = None):
    limit = limit or CFG.concurrency
    sem = asyncio.Semaphore(limit)

    async def _wrap(coro):
        async with sem:
            try:
                return await coro
            except Exception as e:
                return e

    return await asyncio.gather(*[_wrap(c) for c in coros])


def make_session(timeout: int = None) -> aiohttp.ClientSession:
    t = aiohttp.ClientTimeout(total=timeout or CFG.timeout)
    conn = aiohttp.TCPConnector(ssl=False, limit=CFG.concurrency * 2)
    return aiohttp.ClientSession(
        timeout=t,
        connector=conn,
        headers={"User-Agent": CFG.user_agent},
    )
