# Migration · v0.1 → v0.2

This release is **additive** and backwards-compatible. The DB schema is unchanged — your existing `heimdallr.db` keeps working.

## Files added (new)

```
app/collectors/_ddg.py              # shared DuckDuckGo HTML helper
app/collectors/dorks_catalog.py     # ~120-dork library
app/collectors/google_dork.py       # new collector
app/templates/partials/target_bar.html   # switcher + add-target form
MIGRATION.md                        # this file
```

## Files replaced (overwrite existing)

```
app/config.py                       # + GOOGLE_DORK_* settings
app/collectors/__init__.py          # register GoogleDorkCollector
app/routers/api.py                  # + target CRUD, ?target= on read endpoints
app/routers/dashboard.py            # + ?target= resolution, target list
app/core/scheduler.py               # scan ALL active targets
app/templates/dashboard.html        # include target bar
.env.example                        # + GOOGLE_DORK_* keys
README.md                           # updated
```

## Files unchanged (do NOT touch)

```
app/db.py, app/models.py, app/schemas.py, app/main.py
app/collectors/base.py, crtsh.py, github_dork.py, leakcheck.py,
                xposedornot.py, pastebin.py
app/core/orchestrator.py, enrichment.py, severity.py
app/templates/base.html
app/templates/partials/findings_table.html
app/templates/partials/stats_cards.html
app/templates/partials/scan_runs.html
app/static/css/custom.css
scripts/init_db.py, run_scan.py
requirements.txt
```

## Apply the update

From the project root (where `venv/` is), extract the zip over your existing files:

```bash
unzip -o /path/to/HeimdallrOsint_v0.2.zip -d /tmp/heimdallr_v2 && cp -rn /tmp/heimdallr_v2/heimdallr_v2/. .
```

Note: `-o` overwrites *existing* files in the zip but `cp -rn` (no-clobber) for safety if you've made edits — swap to `cp -rf` if you want to force overwrite.

## Append new `.env` keys

Your `.env` is preserved. Add these lines at the bottom:

```bash
# --- Google Dork (via DuckDuckGo HTML, no API key) ---
GOOGLE_DORK_ENABLED=true
GOOGLE_DORK_TIERS=1,2,3
GOOGLE_DORK_DELAY_SECONDS=1.8
GOOGLE_DORK_MAX_RESULTS=8
```

Or just copy the new keys from the updated `.env.example`.

## Restart

```bash
# from venv
uvicorn app.main:app --reload
```

On first scan post-upgrade, the `google_dork` collector will take ~4 min (all 3 tiers). Monitor the log for:

```
GoogleDork: 120 dorks active (tiers=[1, 2, 3]) / 120 total catalog
```

If DDG soft-blocks:

```
DDG blocked for query ... — backing off 15s
GoogleDork: aborting — 4 consecutive DDG blocks
```

→ Drop `GOOGLE_DORK_TIERS=1,2` or increase `GOOGLE_DORK_DELAY_SECONDS=3.0`.
