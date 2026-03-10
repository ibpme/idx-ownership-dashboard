#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["requests"]
# ///
"""Fetch company profiles from IDX for all tickers in ownership.db and cache in SQLite."""

import json
import sqlite3
import sys
import time
from pathlib import Path

import requests

DB = Path(__file__).parent.parent / "data/ownership.db"
IDX_URL = "https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail"

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat/",
    }
)


def get_tickers(con: sqlite3.Connection) -> list[str]:
    rows = con.execute("SELECT DISTINCT share_code FROM ownership ORDER BY share_code").fetchall()
    return [r[0] for r in rows]


def fetch_profile(code: str) -> dict | None:
    try:
        resp = SESSION.get(IDX_URL, params={"KodeEmiten": code, "language": "en-en"}, timeout=15)
        if resp.status_code != 200 or not resp.text.strip():
            return None
        return resp.json()
    except Exception:
        return None


def members_json(entries: list[dict]) -> str:
    return json.dumps([{"name": m.get("Nama", ""), "title": m.get("Jabatan", "")} for m in entries])


def setup_table(con: sqlite3.Connection) -> None:
    con.execute("""
        CREATE TABLE IF NOT EXISTS company_profiles (
            share_code      TEXT PRIMARY KEY,
            name            TEXT,
            sector          TEXT,
            sub_sector      TEXT,
            industry        TEXT,
            address         TEXT,
            website         TEXT,
            email           TEXT,
            phone           TEXT,
            listing_date    TEXT,
            listing_board   TEXT,
            directors       TEXT,
            commissioners   TEXT,
            audit_committee TEXT,
            fetched_at      TEXT DEFAULT (datetime('now'))
        )
    """)
    con.commit()


def upsert(con: sqlite3.Connection, code: str, data: dict) -> None:
    profiles = data.get("Profiles") or []
    p = profiles[0] if profiles else {}

    listing_date = p.get("TanggalPencatatan", "") or ""
    if "T" in listing_date:
        listing_date = listing_date.split("T")[0]

    con.execute(
        """
        INSERT INTO company_profiles
            (share_code, name, sector, sub_sector, industry, address, website, email,
             phone, listing_date, listing_board, directors, commissioners, audit_committee,
             fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(share_code) DO UPDATE SET
            name=excluded.name, sector=excluded.sector, sub_sector=excluded.sub_sector,
            industry=excluded.industry, address=excluded.address, website=excluded.website,
            email=excluded.email, phone=excluded.phone, listing_date=excluded.listing_date,
            listing_board=excluded.listing_board, directors=excluded.directors,
            commissioners=excluded.commissioners, audit_committee=excluded.audit_committee,
            fetched_at=excluded.fetched_at
        """,
        (
            code,
            p.get("NamaEmiten", ""),
            p.get("Sektor", ""),
            p.get("SubSektor", ""),
            p.get("Industri", ""),
            p.get("Alamat", ""),
            p.get("Website", ""),
            p.get("Email", ""),
            p.get("Telepon", ""),
            listing_date,
            p.get("PapanPencatatan", ""),
            members_json(data.get("Direktur") or []),
            members_json(data.get("Komisaris") or []),
            members_json(data.get("KomiteAudit") or []),
        ),
    )
    con.commit()


if __name__ == "__main__":
    db_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DB

    con = sqlite3.connect(db_path)
    setup_table(con)

    tickers = get_tickers(con)
    print(f"Found {len(tickers)} tickers in {db_path}")

    done = {r[0] for r in con.execute("SELECT share_code FROM company_profiles WHERE name != ''").fetchall()}
    remaining = [t for t in tickers if t not in done]
    print(f"Already fetched: {len(done)}  Remaining: {len(remaining)}")

    ok = failed = 0
    for i, code in enumerate(remaining, 1):
        print(f"\r  [{i}/{len(remaining)}] {code:<8}", end="", flush=True)
        data = fetch_profile(code)
        if data and data.get("Profiles"):
            upsert(con, code, data)
            ok += 1
        else:
            failed += 1
        time.sleep(0.3)

    con.close()
    print(f"\nDone. fetched={ok}  failed={failed}  skipped={len(done)}")
