# HeimdallrOsint · v0.2

> _"Heimdall sees through all mist and beyond the Bifröst."_
>
> Corporate OSINT & Exposure Monitor — proactive threat-intelligence sentinel that watches what leaks about your domains across the public internet.

## What's new in v0.2

- **Multi-target UI** — add domains at runtime via the dashboard (no more editing `.env`), switch between them, delete them
- **Massive Google Dork collector (`google_dork`)** — ~120 dork patterns across 12 categories and 3 tiers, powered by DuckDuckGo HTML (no API key required)
- **Multi-target scheduler** — every interval, scans ALL active targets sequentially

## Collectors

| Collector | Source | Requires | Yields |
|---|---|---|---|
| `crtsh` | Certificate Transparency logs | — | subdomain enumeration |
| `xposedornot` | XposedOrNot breach DB | — | domain-level breach hits |
| `leakcheck` | LeakCheck API | `LEAKCHECK_API_KEY` | credential leak hits |
| `github_dork` | GitHub code search | `GITHUB_TOKEN` | secrets / `.env` / SSH keys in public repos |
| **`google_dork`** *(new)* | DuckDuckGo HTML | — | ~120 dork patterns across 12 categories |
| `pastebin` | DuckDuckGo → paste sites | — | Pastebin / paste.ee / ghostbin / rentry mentions |

## The dork catalog (tier layout)

```
tier 1 — ~30 critical-signal dorks      always on
  credentials  │ plaintext passwords, AWS keys, private keys in text/log
  config       │ .env, wp-config, web.config, YAML/INI with "password"
  database     │ .sql dumps, .sqlite, .mdb
  vcs          │ exposed .git/, .svn/, .DS_Store

tier 2 — ~40 important-signal dorks     default on
  backup       │ .bak, .old, backup-folder zips/tars
  logs         │ access.log, error.log with credentials/tokens
  admin_panel  │ /admin, /administrator, login pages
  error_leak   │ SQL syntax errors, stack traces, PHP warnings
  dir_listing  │ open "index of" pages
  cloud_storage│ S3 / Azure Blob / GCS mentions
  document     │ "confidential" PDFs, internal XLSX

tier 3 — ~50 comprehensive dorks        default on (noisier)
  devtools     │ phpMyAdmin, phpinfo, Jenkins, Kibana
  api_exposure │ swagger, graphql introspection, openapi.json
  cms          │ wp-admin, joomla, drupal, magento
  personnel    │ org charts, employee docs, LinkedIn profiles
  cross_site   │ pastebin.com / gist / trello / stackoverflow / scribd leaks
  iot_webcam   │ open AXIS / webcam feeds on subdomains
  ... (and more)
```

Full catalog: `app/collectors/dorks_catalog.py` — edit freely to add/remove patterns.

## Configuration (`.env`)

Every setting is optional except `TARGET_DOMAIN` (default seed). New v0.2 keys:

```bash
# Google Dork via DuckDuckGo HTML
GOOGLE_DORK_ENABLED=true
GOOGLE_DORK_TIERS=1,2,3        # disable t3 if DDG blocks too often
GOOGLE_DORK_DELAY_SECONDS=1.8  # throttle between queries
GOOGLE_DORK_MAX_RESULTS=8      # hits parsed per dork
```

Scan-time estimates (w/ default throttle):
- Tier 1 only       → ~1 min
- Tier 1+2          → ~2.5 min
- Tier 1+2+3        → ~4 min  ← most exhaustive; DDG may soft-block

If DDG soft-blocks (CAPTCHA / empty results 4× in a row), the collector aborts gracefully and logs a warning — no crash, no partial false data.

## UI flow

1. Start the app → default target from `.env` is seeded in DB.
2. In the **Target Bar**, type a new domain in **"Add Target & Scan"** → click **Watch** → scan starts immediately, browser redirects to that target's dashboard.
3. Use **"Switch Target"** dropdown to change which target's findings are displayed.
4. Click **"✕ stop watching"** to delete a target and its findings.
5. **"Trigger Scan"** in header re-scans the currently-viewed target on demand.

The scheduler scans **all active targets** on every interval tick (sequential).

## API additions (v0.2)

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/targets` | List all targets |
| `POST` | `/api/targets` | Add target (form or JSON); auto-scans |
| `DELETE` | `/api/targets/{domain}` | Remove target + cascade findings |
| `GET`  | `/api/target?target=domain.com` | Detail for a specific target |
| `POST` | `/api/scan?target=domain.com` | Trigger scan for a specific target |
| `GET`  | `/api/findings?target=domain.com&...` | Filter by target |
| `GET`  | `/api/stats?target=domain.com` | Stats for a specific target |

All read endpoints now accept an optional `?target=` query param and fall back to the configured default when omitted.

## Realistic caveats

- **DDG ≠ Google.** Recall is lower. For Fortune-500 coverage you'll want a real Google Custom Search API integration — the code has the `BaseCollector` shape to drop one in next to `google_dork.py`.
- **Dork hits ≠ confirmed exposures.** Every finding needs analyst triage. Many Tier 3 results will be false positives (mentions, unrelated content).
- **GitHub PAT matters.** Without one, the `github_dork` collector self-disables — and that's genuinely the highest-signal collector for secret exposure.

## Updating from v0.1

See `MIGRATION.md` in this release bundle.
