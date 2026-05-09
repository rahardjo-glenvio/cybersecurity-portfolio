"""DNS bruteforce subdomain discovery (active)."""
import asyncio
import dns.asyncresolver
from ..core.logger import get_logger

log = get_logger("active.brute")

# Built-in mini wordlist (top 200 paling produktif). Bisa diganti via --wordlist.
DEFAULT_WORDLIST = [
    "www", "mail", "ftp", "localhost", "webmail", "smtp", "pop", "ns1", "webdisk",
    "ns2", "cpanel", "whm", "autodiscover", "autoconfig", "m", "imap", "test", "ns",
    "blog", "pop3", "dev", "www2", "admin", "forum", "news", "vpn", "ns3", "mail2",
    "new", "mysql", "old", "lists", "support", "mobile", "mx", "static", "docs", "beta",
    "shop", "sql", "secure", "demo", "cp", "calendar", "wiki", "web", "media", "email",
    "images", "img", "www1", "intranet", "portal", "video", "sip", "dns2", "api", "cdn",
    "stats", "dns1", "ns4", "www3", "dns", "search", "staging", "server", "mx1", "chat",
    "wap", "my", "svn", "mail1", "sites", "proxy", "ads", "host", "crm", "cms", "backup",
    "mx2", "lyncdiscover", "info", "apps", "download", "remote", "db", "forums", "store",
    "relay", "files", "newsletter", "app", "live", "owa", "en", "start", "sms", "office",
    "exchange", "ipv4", "mail3", "help", "blogs", "helpdesk", "web1", "home", "library",
    "ftp2", "ntp", "monitor", "login", "service", "correo", "www4", "moodle", "webconf",
    "radio", "track", "dev2", "pubsub", "us", "if", "events", "testing", "sms2", "status",
    "ssl", "fr", "auth", "openvpn", "client", "elearning", "members", "uk", "promo", "git",
    "gitlab", "gitea", "jenkins", "jira", "confluence", "sandbox", "preview", "alpha",
    "internal", "public", "static1", "static2", "cdn1", "cdn2", "panel", "manage", "console",
    "dashboard", "jobs", "careers", "kibana", "grafana", "prometheus", "elastic", "redis",
    "mongo", "postgres", "kafka", "rabbitmq", "phpmyadmin", "pma", "mysql2", "ssh", "smtp2",
    "register", "signup", "billing", "pay", "payment", "checkout", "cart", "auth2", "sso",
    "oauth", "ldap", "ad", "proxy2", "vpn2", "vpn1", "asterisk", "voip", "cloud", "saas",
    "app1", "app2", "app3", "service1", "service2", "edge", "tunnel", "firewall", "fw",
    "gateway", "router", "switch", "ap", "wifi", "guest", "iot", "camera", "nas", "storage",
    "backup1", "backup2", "snapshot", "metrics", "logs", "syslog", "logging", "trace",
    "ci", "cd", "build", "deploy", "release", "staging1", "staging2", "uat", "qa", "stage",
    "prod", "production", "dev1", "test1", "test2", "test3",
]


async def _query(resolver, sub: str, domain: str) -> str | None:
    fqdn = f"{sub}.{domain}"
    try:
        ans = await resolver.resolve(fqdn, "A", raise_on_no_answer=False)
        if ans.rrset and len(ans) > 0:
            return fqdn
    except Exception:
        pass
    return None


async def brute(domain: str, wordlist: list[str] = None, concurrency: int = 100) -> set[str]:
    words = wordlist or DEFAULT_WORDLIST
    log.info(f"DNS brute: {len(words)} kandidat untuk {domain}")

    resolver = dns.asyncresolver.Resolver()
    resolver.timeout = 3
    resolver.lifetime = 3
    # Pakai resolver public agar lebih cepat & tidak hammer DNS lokal
    resolver.nameservers = ["8.8.8.8", "1.1.1.1", "9.9.9.9"]

    sem = asyncio.Semaphore(concurrency)

    async def _bounded(w):
        async with sem:
            return await _query(resolver, w, domain)

    results = await asyncio.gather(*[_bounded(w) for w in words])
    found = {r for r in results if r}
    log.info(f"DNS brute: {len(found)} subdomain hidup")
    return found
