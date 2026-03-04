#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["pdfplumber"]
# ///
"""Extract IDX shareholding data from KSEI PDF into SQLite."""

import sqlite3
import sys
from pathlib import Path
import pdfplumber

PDF = (
    Path(__file__).parent.parent
    / "data/20260303_SemuaEmitenSaham_PengumumanBursa_32040413_lamp1.pdf"
)
DB = Path(__file__).parent.parent / "data/ownership.db"

COLS = (
    "date",
    "share_code",
    "issuer_name",
    "investor_name",
    "investor_type",
    "local_foreign",
    "nationality",
    "domicile",
    "holdings_scripless",
    "holdings_scrip",
    "total_holding_shares",
    "percentage",
)


def parse_int(s: str) -> int | None:
    s = s.strip()
    return int(s.replace(".", "")) if s else None


def parse_float(s: str) -> float | None:
    s = s.strip()
    return float(s.replace(",", ".")) if s else None


def extract(pdf_path: Path) -> list[tuple]:
    rows = []
    header = list(COLS)  # expected header values (lowercased match)
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages, 1):
            print(f"\r  page {i}/{total}", end="", flush=True)
            table = page.extract_table()
            if not table:
                continue
            for row in table:
                if not row or row[0] == "DATE":  # skip header rows
                    continue
                if len(row) != 12:
                    continue
                try:
                    rows.append(
                        (
                            row[0].strip(),  # date
                            row[1].strip(),  # share_code
                            row[2].strip(),  # issuer_name
                            row[3].strip(),  # investor_name
                            row[4].strip(),  # investor_type
                            row[5].strip(),  # local_foreign
                            row[6].strip(),  # nationality
                            row[7].strip(),  # domicile
                            parse_int(row[8]),  # holdings_scripless
                            parse_int(row[9]),  # holdings_scrip
                            parse_int(row[10]),  # total_holding_shares
                            parse_float(row[11]),  # percentage
                        )
                    )
                except (ValueError, AttributeError):
                    continue
    print()
    return rows


def load(db_path: Path, rows: list[tuple]) -> None:
    con = sqlite3.connect(db_path)
    con.execute("DROP TABLE IF EXISTS ownership")
    con.execute(
        """
        CREATE TABLE ownership (
            date                 TEXT,
            share_code           TEXT,
            issuer_name          TEXT,
            investor_name        TEXT,
            investor_type        TEXT,
            local_foreign        TEXT,
            nationality          TEXT,
            domicile             TEXT,
            holdings_scripless   INTEGER,
            holdings_scrip       INTEGER,
            total_holding_shares INTEGER,
            percentage           REAL
        )
    """
    )
    con.execute("CREATE INDEX idx_share_code ON ownership(share_code)")
    con.execute("CREATE INDEX idx_investor_name ON ownership(investor_name)")
    con.executemany(f"INSERT INTO ownership VALUES ({','.join('?'*12)})", rows)
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
