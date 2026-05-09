"""Generate HTML report from DB."""
import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
from ..core.database import DB
from ..core.logger import get_logger

log = get_logger("report")

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")


def render(db: DB, domain: str, output_path: str):
    target_id = db.add_target(domain)
    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(["html", "xml"]),
    )
    tpl = env.get_template("report.html.j2")

    subs = [dict(r) for r in db.get_subdomains(target_id)]
    # sort: alive first, then by subdomain
    subs.sort(key=lambda s: (
        not (s.get("http_alive") or s.get("https_alive")),
        s.get("subdomain", "")
    ))

    findings = [dict(r) for r in db.get_findings(target_id)]
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    findings.sort(key=lambda f: severity_order.get(f.get("severity", "info"), 99))

    html = tpl.render(
        domain=domain,
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        stats=db.stats(target_id),
        whois=db.get_whois(target_id) or {},
        dns_records=[dict(r) for r in db.get_dns_records(target_id)],
        subdomains=subs,
        findings=findings,
    )

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w") as f:
        f.write(html)
    log.info(f"HTML report: {output_path}")
    return output_path


def export_json(db: DB, domain: str, output_path: str):
    import json
    target_id = db.add_target(domain)
    data = {
        "domain": domain,
        "generated_at": datetime.now().isoformat(),
        "stats": db.stats(target_id),
        "whois": db.get_whois(target_id),
        "dns_records": [dict(r) for r in db.get_dns_records(target_id)],
        "subdomains": [dict(r) for r in db.get_subdomains(target_id)],
        "findings": [dict(r) for r in db.get_findings(target_id)],
    }
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2, default=str)
    log.info(f"JSON export: {output_path}")
    return output_path
