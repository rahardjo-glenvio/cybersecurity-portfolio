"""ReconForge CLI."""
import asyncio
import click
import os
import sys
from .core.database import DB
from .core.config import CFG
from .core.orchestrator import Pipeline
from .core.logger import get_logger, console
from .report import html_report

log = get_logger("cli")


@click.command()
@click.option("-d", "--domain", required=True, help="Target domain (cth: example.com)")
@click.option("--mode", type=click.Choice(["passive", "full"]), default="full",
              help="passive=tanpa kontak target | full=passive+active")
@click.option("--concurrency", default=50, type=int, help="Max concurrent requests")
@click.option("--output", default="output", help="Output directory")
def main(domain, mode, concurrency, output):
    """ReconForge — automated recon framework."""
    CFG.concurrency = concurrency
    CFG.output_dir = output
    CFG.db_path = os.path.join(output, f"{domain}.db")

    console.print(f"\n[bold cyan]⚡ ReconForge[/bold cyan] target=[yellow]{domain}[/yellow] mode=[green]{mode}[/green]\n")

    os.makedirs(output, exist_ok=True)
    db = DB(CFG.db_path)

    async def _run():
        pipe = Pipeline(domain, db, mode=mode)
        stats = await pipe.run()
        console.print(f"\n[bold green]✓ DONE[/bold green]")
        console.print(stats)

        # generate reports
        html_path = os.path.join(output, f"{domain}_report.html")
        json_path = os.path.join(output, f"{domain}_report.json")
        html_report.render(db, domain, html_path)
        html_report.export_json(db, domain, json_path)

    try:
        asyncio.run(_run())
    finally:
        db.close()


if __name__ == "__main__":
    main()
