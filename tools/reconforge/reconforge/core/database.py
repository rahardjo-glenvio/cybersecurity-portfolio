"""SQLite storage — state-aware, resumable."""
import sqlite3
import json
import os
from contextlib import contextmanager
from typing import Optional, Iterable
from datetime import datetime

SCHEMA = """
CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subdomains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL,
    subdomain TEXT NOT NULL,
    source TEXT,
    resolved INTEGER DEFAULT 0,
    ip TEXT,
    cname TEXT,
    http_alive INTEGER DEFAULT 0,
    https_alive INTEGER DEFAULT 0,
    status_code INTEGER,
    title TEXT,
    server TEXT,
    tech TEXT,
    cdn TEXT,
    redirect TEXT,
    content_length INTEGER,
    open_ports TEXT,
    interesting_tag TEXT,
    last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(target_id, subdomain),
    FOREIGN KEY(target_id) REFERENCES targets(id)
);

CREATE TABLE IF NOT EXISTS dns_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL,
    record_type TEXT,
    value TEXT,
    FOREIGN KEY(target_id) REFERENCES targets(id)
);

CREATE TABLE IF NOT EXISTS whois_data (
    target_id INTEGER PRIMARY KEY,
    raw_json TEXT,
    FOREIGN KEY(target_id) REFERENCES targets(id)
);

CREATE TABLE IF NOT EXISTS findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL,
    subdomain TEXT,
    severity TEXT,
    category TEXT,
    title TEXT,
    detail TEXT,
    found_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(target_id) REFERENCES targets(id)
);

CREATE INDEX IF NOT EXISTS idx_sub_target ON subdomains(target_id);
CREATE INDEX IF NOT EXISTS idx_sub_alive ON subdomains(http_alive, https_alive);
"""


class DB:
    def __init__(self, path: str):
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        self.path = path
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    def close(self):
        self.conn.close()

    @contextmanager
    def cursor(self):
        cur = self.conn.cursor()
        try:
            yield cur
            self.conn.commit()
        finally:
            cur.close()

    # --- target ---
    def add_target(self, domain: str) -> int:
        with self.cursor() as c:
            c.execute("INSERT OR IGNORE INTO targets(domain) VALUES (?)", (domain,))
            c.execute("SELECT id FROM targets WHERE domain=?", (domain,))
            return c.fetchone()["id"]

    # --- subdomain ---
    def add_subdomain(self, target_id: int, subdomain: str, source: str):
        with self.cursor() as c:
            c.execute(
                """INSERT OR IGNORE INTO subdomains(target_id, subdomain, source)
                   VALUES (?, ?, ?)""",
                (target_id, subdomain.lower().strip(), source),
            )

    def add_subdomains_bulk(self, target_id: int, items: Iterable[tuple[str, str]]):
        with self.cursor() as c:
            c.executemany(
                """INSERT OR IGNORE INTO subdomains(target_id, subdomain, source)
                   VALUES (?, ?, ?)""",
                [(target_id, s.lower().strip(), src) for s, src in items if s],
            )

    def update_subdomain(self, target_id: int, subdomain: str, **fields):
        if not fields:
            return
        cols = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [target_id, subdomain.lower().strip()]
        with self.cursor() as c:
            c.execute(
                f"UPDATE subdomains SET {cols}, last_seen=CURRENT_TIMESTAMP "
                f"WHERE target_id=? AND subdomain=?",
                vals,
            )

    def get_subdomains(self, target_id: int) -> list[sqlite3.Row]:
        with self.cursor() as c:
            c.execute(
                "SELECT * FROM subdomains WHERE target_id=? ORDER BY subdomain",
                (target_id,),
            )
            return c.fetchall()

    def get_alive_subdomains(self, target_id: int) -> list[sqlite3.Row]:
        with self.cursor() as c:
            c.execute(
                """SELECT * FROM subdomains
                   WHERE target_id=? AND (http_alive=1 OR https_alive=1)""",
                (target_id,),
            )
            return c.fetchall()

    # --- dns ---
    def add_dns_record(self, target_id: int, record_type: str, value: str):
        with self.cursor() as c:
            c.execute(
                "INSERT INTO dns_records(target_id, record_type, value) VALUES (?, ?, ?)",
                (target_id, record_type, value),
            )

    def get_dns_records(self, target_id: int) -> list[sqlite3.Row]:
        with self.cursor() as c:
            c.execute("SELECT * FROM dns_records WHERE target_id=?", (target_id,))
            return c.fetchall()

    # --- whois ---
    def set_whois(self, target_id: int, data: dict):
        with self.cursor() as c:
            c.execute(
                "INSERT OR REPLACE INTO whois_data(target_id, raw_json) VALUES (?, ?)",
                (target_id, json.dumps(data, default=str)),
            )

    def get_whois(self, target_id: int) -> Optional[dict]:
        with self.cursor() as c:
            c.execute("SELECT raw_json FROM whois_data WHERE target_id=?", (target_id,))
            r = c.fetchone()
            return json.loads(r["raw_json"]) if r else None

    # --- findings ---
    def add_finding(self, target_id: int, subdomain: str, severity: str,
                    category: str, title: str, detail: str = ""):
        with self.cursor() as c:
            c.execute(
                """INSERT INTO findings(target_id, subdomain, severity, category, title, detail)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (target_id, subdomain, severity, category, title, detail),
            )

    def get_findings(self, target_id: int) -> list[sqlite3.Row]:
        with self.cursor() as c:
            c.execute(
                "SELECT * FROM findings WHERE target_id=? ORDER BY severity, found_at",
                (target_id,),
            )
            return c.fetchall()

    # --- stats ---
    def stats(self, target_id: int) -> dict:
        with self.cursor() as c:
            c.execute("SELECT COUNT(*) AS n FROM subdomains WHERE target_id=?", (target_id,))
            total = c.fetchone()["n"]
            c.execute("SELECT COUNT(*) AS n FROM subdomains WHERE target_id=? AND resolved=1", (target_id,))
            resolved = c.fetchone()["n"]
            c.execute(
                """SELECT COUNT(*) AS n FROM subdomains
                   WHERE target_id=? AND (http_alive=1 OR https_alive=1)""",
                (target_id,),
            )
            alive = c.fetchone()["n"]
            c.execute(
                """SELECT COUNT(*) AS n FROM subdomains
                   WHERE target_id=? AND interesting_tag IS NOT NULL""",
                (target_id,),
            )
            interesting = c.fetchone()["n"]
            c.execute("SELECT COUNT(*) AS n FROM findings WHERE target_id=?", (target_id,))
            findings = c.fetchone()["n"]
            return {
                "total_subdomains": total,
                "resolved": resolved,
                "alive": alive,
                "interesting": interesting,
                "findings": findings,
            }
