"""Config: API keys, threading, timeouts."""
import os
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Config:
    # threading
    concurrency: int = 50
    timeout: int = 10
    retries: int = 2

    # API keys (opsional, ambil dari env)
    shodan_api_key: Optional[str] = field(default_factory=lambda: os.getenv("SHODAN_API_KEY"))
    github_token: Optional[str] = field(default_factory=lambda: os.getenv("GITHUB_TOKEN"))
    securitytrails_key: Optional[str] = field(default_factory=lambda: os.getenv("SECURITYTRAILS_KEY"))
    virustotal_key: Optional[str] = field(default_factory=lambda: os.getenv("VIRUSTOTAL_KEY"))

    # paths
    output_dir: str = "output"
    db_path: str = "output/recon.db"

    # user agent
    user_agent: str = "Mozilla/5.0 (X11; Linux x86_64) ReconForge/0.1"

    # ports untuk active scan (top 25 paling umum)
    common_ports: list = field(default_factory=lambda: [
        21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443,
        445, 993, 995, 1723, 3306, 3389, 5900, 8080, 8443, 8888,
        9000, 9200, 27017
    ])

    # interesting subdomain keywords
    interesting_keywords: list = field(default_factory=lambda: [
        "admin", "dev", "staging", "test", "uat", "qa", "internal",
        "vpn", "api", "git", "jenkins", "jira", "confluence", "gitlab",
        "mail", "smtp", "ftp", "ssh", "backup", "old", "beta", "alpha",
        "portal", "intranet", "manage", "console", "panel", "dashboard",
        "kibana", "grafana", "prometheus", "phpmyadmin", "webmail"
    ])

CFG = Config()
