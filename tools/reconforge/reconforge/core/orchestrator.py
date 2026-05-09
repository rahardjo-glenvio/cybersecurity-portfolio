"""Pipeline orchestrator — chain semua module."""
import asyncio
import json
from .database import DB
from .config import CFG
from .logger import get_logger
from ..passive import subdomain as p_sub
from ..passive import dns_records as p_dns
from ..passive import whois_lookup as p_whois
from ..passive import wayback as p_wayback
from ..active import alive as a_alive
from ..active import dns_brute as a_brute
from ..active import port_scan as a_port
from ..active import vuln_scan as a_vuln

log = get_logger("orchestrator")


class Pipeline:
    def __init__(self, domain: str, db: DB, mode: str = "full"):
        self.domain = domain.lower().strip()
        self.db = db
        self.mode = mode
        self.target_id = db.add_target(self.domain)

    async def run_passive(self):
        log.info(f"=== PHASE 1: PASSIVE RECON [{self.domain}] ===")

        # 1. WHOIS
        log.info("[passive] whois lookup")
        wdata = await p_whois.lookup(self.domain)
        if wdata:
            self.db.set_whois(self.target_id, wdata)
            log.info(f"[passive] whois: registrar={wdata.get('registrar')}")

        # 2. DNS records
        log.info("[passive] DNS records (A/AAAA/MX/NS/TXT/SOA/CNAME)")
        dns_data = await p_dns.get_all_records(self.domain)
        for rt, vals in dns_data.items():
            for v in vals:
                self.db.add_dns_record(self.target_id, rt, v)
            if vals:
                log.info(f"[passive] DNS {rt}: {len(vals)} record")

        # 3. Subdomain enumeration (multi-source)
        log.info("[passive] subdomain enumeration (10 sources)")
        sources = await p_sub.enumerate_subdomains(self.domain)

        # bulk insert
        items = []
        for src, subs in sources.items():
            for s in subs:
                items.append((s, src))
        self.db.add_subdomains_bulk(self.target_id, items)
        unique = {s for _, subs in sources.items() for s in subs}
        log.info(f"[passive] total unique subdomains: {len(unique)}")

        # 4. Wayback URLs
        log.info("[passive] wayback URL harvest")
        wb = await p_wayback.fetch_urls(self.domain, limit=2000)
        log.info(f"[passive] wayback: {len(wb['all'])} URLs, "
                 f"{len(wb['endpoints'])} endpoints, "
                 f"{len(wb['params'])} params, "
                 f"{len(wb['sensitive_files'])} sensitive files")
        # save sensitive files as findings
        for u in wb["sensitive_files"][:50]:
            self.db.add_finding(
                self.target_id, self.domain, "low", "wayback_sensitive_file",
                "Sensitive file in archive history", u,
            )

        return unique

    async def run_active(self, passive_subs: set[str]):
        log.info(f"=== PHASE 2: ACTIVE RECON [{self.domain}] ===")

        # 1. DNS brute → tambah ke pool
        log.info("[active] DNS bruteforce")
        brute_subs = await a_brute.brute(self.domain)
        items = [(s, "dns_brute") for s in brute_subs]
        self.db.add_subdomains_bulk(self.target_id, items)

        # Total pool
        all_subs = sorted({s.lower() for s in passive_subs} | brute_subs)
        log.info(f"[active] total unique subdomain pool: {len(all_subs)}")

        # 2. DNS resolve semua
        log.info("[active] DNS resolve all subdomains")
        sem = asyncio.Semaphore(100)

        async def _resolve(s):
            async with sem:
                return s, await p_dns.resolve_subdomain(s)

        resolve_results = await asyncio.gather(*[_resolve(s) for s in all_subs])
        cname_map = {}
        for sub, (resolved, ip, cname) in resolve_results:
            self.db.update_subdomain(
                self.target_id, sub,
                resolved=1 if resolved else 0,
                ip=ip,
                cname=cname,
            )
            if cname:
                cname_map[sub] = cname

        resolved_subs = [s for s, (r, _, _) in resolve_results if r]
        log.info(f"[active] resolved: {len(resolved_subs)}/{len(all_subs)}")

        # 3. HTTP/HTTPS alive probe + tech/cdn/title
        log.info("[active] HTTP/HTTPS alive probe + classification")
        probes = await a_alive.probe_all(resolved_subs)
        alive_count = 0
        alive_targets = []  # (sub, scheme, cname)
        for rec in probes:
            self.db.update_subdomain(
                self.target_id, rec["subdomain"],
                http_alive=rec["http_alive"],
                https_alive=rec["https_alive"],
                status_code=rec["status_code"],
                title=rec["title"],
                server=rec["server"],
                tech=rec["tech"],
                cdn=rec["cdn"],
                redirect=rec["redirect"],
                content_length=rec["content_length"],
                interesting_tag=rec["interesting_tag"],
            )
            if rec["http_alive"] or rec["https_alive"]:
                alive_count += 1
                scheme = "https" if rec["https_alive"] else "http"
                alive_targets.append(
                    (rec["subdomain"], scheme, cname_map.get(rec["subdomain"]))
                )
        log.info(f"[active] alive: {alive_count}/{len(resolved_subs)}")

        # 4. Port scan (terbatas top hosts agar gak overload)
        scan_hosts = [s for s, _, _ in alive_targets][:30]
        if scan_hosts:
            log.info(f"[active] port scan top {len(scan_hosts)} hosts")
            scan_results = await a_port.scan_many(scan_hosts)
            for r in scan_results:
                if r["open_ports"]:
                    ports_str = ",".join(str(p) for p in sorted(r["open_ports"].keys()))
                    self.db.update_subdomain(
                        self.target_id, r["host"],
                        open_ports=ports_str,
                    )

        # 5. Vuln heuristics scan
        if alive_targets:
            log.info(f"[active] vuln heuristics on {len(alive_targets)} live hosts")
            findings = await a_vuln.scan_many(alive_targets)
            for sub, fs in findings.items():
                for f in fs:
                    self.db.add_finding(
                        self.target_id, sub,
                        f["severity"], f["category"], f["title"], f["detail"],
                    )
            total_f = sum(len(v) for v in findings.values())
            log.info(f"[active] total findings: {total_f}")

    async def run(self):
        passive_subs = await self.run_passive()
        if self.mode in ("full", "active"):
            await self.run_active(passive_subs)
        log.info("=== PIPELINE COMPLETE ===")
        return self.db.stats(self.target_id)
