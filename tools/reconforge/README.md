# ⚡ ReconForge

Automated reconnaissance framework untuk pentesting — **passive + active** dalam satu pipeline.

## Bukti Eksekusi (target: hackerone.com)

```
=== PHASE 1: PASSIVE RECON [hackerone.com] ===
[passive] whois lookup
[passive] DNS records (A/AAAA/MX/NS/TXT/SOA/CNAME)
[passive] subdomain enumeration (10 sources)
  [crt.sh]         0   [hackertarget] 10   [alienvault] 0
  [rapiddns]      18   [urlscan]       3   [anubis]    15
  [bufferover]     0   [wayback]       0
[passive] total unique subdomains: 25

=== PHASE 2: ACTIVE RECON [hackerone.com] ===
[active] DNS bruteforce: 232 kandidat → 4 hidup
[active] DNS resolve all: 12/25 resolved
[active] HTTP/HTTPS alive probe: 12/12 alive
[active] port scan top 12 hosts × 25 ports
[active] vuln heuristics on 12 live hosts
[active] total findings: 45

→ Total runtime: ~45 detik
```

**Real attack surface ditemukan:**
- `api.hackerone.com` → 200 OK behind Cloudflare (API endpoint)
- `mta-sts.*.hackerone.com` → CNAME `hacker0x01.github.io` (GitHub Pages takeover candidate)
- `support.hackerone.com` → Freshdesk (3rd-party SaaS dependency)
- `gslink.hackerone.com` → CloudFront
- `pmbounces.hackerone.com` → Postmark email infra
- Missing security headers per host

## Arsitektur

```
reconforge/
├── core/
│   ├── orchestrator.py    # pipeline runner (passive → active)
│   ├── database.py        # SQLite (state-aware, resumable)
│   ├── runner.py          # async HTTP helpers
│   ├── config.py          # API keys, threading
│   └── logger.py          # rich console
├── passive/
│   ├── subdomain.py       # 10 sources: crt.sh, OTX, HackerTarget,
│   │                      # RapidDNS, URLScan, Anubis, BufferOver,
│   │                      # Wayback, SecurityTrails*, VirusTotal*
│   ├── dns_records.py     # A/AAAA/MX/NS/TXT/SOA/CNAME
│   ├── whois_lookup.py    # python-whois
│   └── wayback.py         # archive URL harvest + sensitive file detect
├── active/
│   ├── dns_brute.py       # 232 default wordlist via 8.8.8.8/1.1.1.1
│   ├── alive.py           # HTTP/HTTPS probe + classification
│   │                      # → status, title, server, tech, cdn, redirect
│   ├── port_scan.py       # async TCP connect (top 25 ports + banner)
│   └── vuln_scan.py       # heuristics:
│                          # - subdomain takeover (15 services)
│                          # - sensitive paths (.env, .git, actuator,
│                          #   swagger, server-status, dll)
│                          # - missing security headers
│                          # - server version disclosure
├── report/
│   └── html_report.py     # interactive HTML + JSON export
└── templates/report.html.j2  # cyber minimalist theme (#0066ff)
```

\* = butuh API key (set env var: `SHODAN_API_KEY`, `SECURITYTRAILS_KEY`, `VIRUSTOTAL_KEY`, `GITHUB_TOKEN`)

## Klasifikasi Subdomain Otomatis

Tiap subdomain di-tag dengan kondisi:

| Kondisi | Definisi |
|---|---|
| `resolved=1` | DNS A record resolve |
| `resolved=0` | NXDOMAIN / no A record |
| `http_alive=1` | port 80 respond HTTP |
| `https_alive=1` | port 443 respond HTTPS |
| `cdn` | Cloudflare/Akamai/Fastly/CloudFront/dll |
| `tech` | nginx/apache/wordpress/django/dll |
| `interesting_tag` | admin/dev/staging/api/jenkins/dll |
| `open_ports` | hasil scan TCP top 25 |
| `cname` | CNAME chain (untuk takeover detection) |

## Pakai

```bash
pip install -r requirements.txt

# Full pipeline (passive + active)
python recon.py -d target.com

# Passive saja (zero touch — tidak kontak target)
python recon.py -d target.com --mode passive

# Tweak concurrency
python recon.py -d target.com --concurrency 100

# Output
ls output/
  target.com.db              # SQLite (resumable)
  target.com_report.html     # interactive HTML
  target.com_report.json     # machine-readable
```

## Findings Severity

| Level | Contoh |
|---|---|
| **critical** | `.env` exposed dengan credentials, Spring heapdump |
| **high** | Subdomain takeover, `.git/config` exposed |
| **medium** | phpinfo, server-status apache |
| **low** | API docs (swagger), `.DS_Store` |
| **info** | missing headers, login pages, version disclosure |

## Roadmap

- [ ] Diff mode (compare run sebelumnya → asset baru)
- [ ] JS file analysis (linkfinder regex untuk endpoints/secrets)
- [ ] Parameter discovery (paramspider integration)
- [ ] Screenshot via Playwright headless
- [ ] Slack/Telegram notifier untuk new findings
- [ ] nuclei template runner sebagai opt-in deep mode
- [ ] Resume mode (`--resume` skip yang udah selesai)

## Catatan Etis

Tool ini hanya untuk **target dengan otorisasi**. Demo eksekusi di atas
menggunakan `hackerone.com` karena mereka punya public bug bounty yang
eksplisit mengizinkan recon. Jangan gunakan terhadap target tanpa izin tertulis.
