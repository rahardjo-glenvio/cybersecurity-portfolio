"""Centralized logger using rich."""
from rich.console import Console
from rich.logging import RichHandler
import logging

console = Console()

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(console=console, rich_tracebacks=True, show_path=False)],
)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
