#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["pdfplumber"]
# ///
"""Extract IDX free float data from IDX PDF into SQLite float_data table."""

import re
import sqlite3
import sys
from pathlib import Path

import pdfplumber

PDF = Path(__file__).parent.parent / "data/202602_ff.pdf"
DB = Path(__file__).parent.parent / "data/ownership.db"

TICKER_RE = re.compile(r"^[A-Z]{2,6}$")


def parse_pct(s: str) -> float | None:
    if not s:
        return None
    s = s.strip().replace("\n", "").rstrip("%").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def parse_int(s: str) -> int | None:
    if not s:
        return None
    s = s.strip().replace("\n", "").replace(".", "").replace(",", "")
    try:
        return int(s)
    except ValueError:
        return None


def extract(pdf_path: Path) -> list[tuple]:
    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages, 1):
            print(f"\r  page {i}/{total}", end="", flush=True)
            table = page.extract_table()
            if not table:
                continue
            for row in table:
                if not row or len(row) < 8:
                    continue
                code = row[1]
                if not code:
                    continue
                code = str(code).strip().replace("\n", "").upper()
                if not TICKER_RE.match(code):
                    continue

                company_name = (
                    str(row[2]).strip().replace("\n", " ") if row[2] else None
                )
                free_float_pct = parse_pct(str(row[3])) if row[3] else None
                free_float_shares = parse_int(str(row[6])) if row[6] else None
                num_shareholders = parse_int(str(row[7])) if row[7] else None

                if free_float_pct is None or free_float_shares is None:
                    continue

                total_shares = (
                    int(free_float_shares / (free_float_pct / 100))
                    if free_float_pct > 0
                    else None
                )

                rows.append(
                    (
                        code,
                        company_name,
                        free_float_pct,
                        free_float_shares,
                        num_shareholders,
                        total_shares,
                    )
                )
    print()
    return rows


def load(db_path: Path, rows: list[tuple]) -> None:
    con = sqlite3.connect(db_path)
    con.execute("DROP TABLE IF EXISTS float_data")
    con.execute(
        """
        CREATE TABLE float_data (
            share_code       TEXT PRIMARY KEY,
            company_name     TEXT,
            free_float_pct   REAL,
            free_float_shares INTEGER,
            num_shareholders INTEGER,
            total_shares     INTEGER
        )
        """
    )
    con.executemany("INSERT INTO float_data VALUES (?,?,?,?,?,?)", rows)
    con.commit()
    con.close()


if __name__ == "__main__":
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else PDF
    db = Path(sys.argv[2]) if len(sys.argv) > 2 else DB

    print(f"Extracting: {pdf}")
    rows = extract(pdf)
    print(f"Rows extracted: {len(rows)}")

    print(f"Writing: {db}")
    load(db, rows)
    print("Done.")
