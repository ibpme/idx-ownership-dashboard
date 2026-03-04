# idx-ownership Project

Web app for exploring shareholders holding >1% in all IDX-listed companies.

## Data Source

- **File:** `data/20260303_SemuaEmitenSaham_PengumumanBursa_32040413_lamp1.pdf`
- **Issuer:** KSEI (PT Kustodian Sentral Efek Indonesia)
- **Data date:** 27 Feb 2026; published per OJK decision No. 1/KDK.04/2026
- **Content:** 73-page PDF → extracted to SQLite via `scripts/extract.py`

## Architecture

- **ETL:** `scripts/extract.py` — Python (pdfplumber, uv-managed) → `data/ownership.db` (SQLite)
- **Server:** Go 1.25 + go-sqlite3, stdlib `net/http` (no framework). Opens DB read-only with WAL.
- **Client:** Vanilla TypeScript + Vite, d3-force for network graph. Hash-based SPA router.
- **Build:** `Makefile` — `make build` (client+server), `make run`, `make dev-server`/`make dev-client`

## Schema (single `ownership` table)

`date TEXT | share_code TEXT | issuer_name TEXT | investor_name TEXT | investor_type TEXT | local_foreign TEXT | nationality TEXT | domicile TEXT | holdings_scripless INT | holdings_scrip INT | total_holding_shares INT | percentage REAL`

Indexes: `idx_share_code`, `idx_investor_name`

- `INVESTOR_TYPE`: CP=Corporate, ID=Individual, IB=Bank, SC=Securities, PF=Pension Fund, OT=Other, IS=Insurance
- `LOCAL_FOREIGN`: L=Local, A=Foreign

## API Endpoints (all GET, JSON)

| Route                               | Handler                    | Purpose                                           |
| ----------------------------------- | -------------------------- | ------------------------------------------------- |
| `/api/stats`                        | `handleStats`              | Aggregate counts                                  |
| `/api/search?q=`                    | `handleSearch`             | Fuzzy search tickers + investors (LIKE, limit 10) |
| `/api/tickers`                      | `handleTickers`            | All distinct tickers                              |
| `/api/tickers/{code}`               | `handleTickerDetail`       | Shareholders for a ticker                         |
| `/api/tickers/{code}/local-foreign` | `handleTickerLF`           | L/F breakdown by investor type                    |
| `/api/investors/{name}`             | `handleInvestorDetail`     | All holdings for an investor                      |
| `/api/conglomerates`                | `handleConglomerates`      | 18 hardcoded business groups                      |
| `/api/conglomerates/{id}`           | `handleConglomerateDetail` | Tickers in a conglomerate                         |
| `/api/network?ticker=&investor=`    | `handleNetwork`            | Force-graph nodes+links (cap 200 nodes)           |

## Client Pages (hash routes)

| Hash                  | Component            | Description                                |
| --------------------- | -------------------- | ------------------------------------------ |
| `#/`                  | `main.ts`            | Hero + search + stats bar                  |
| `#/ticker/:code`      | `ticker-detail.ts`   | Shareholder table + L/F bar                |
| `#/investor/:name`    | `investor-detail.ts` | Holdings table                             |
| `#/local-foreign`     | `local-foreign.ts`   | All tickers L/F comparison (batched fetch) |
| `#/conglomerates`     | `conglomerates.ts`   | Card grid of business groups               |
| `#/conglomerates/:id` | `conglomerates.ts`   | Conglomerate detail table                  |
| `#/network`           | `network-graph.ts`   | d3-force interactive graph                 |

## Key Files

```
scripts/extract.py      # PDF → SQLite ETL
server/main.go          # Entry point, flags: -addr -db -client
server/db.go            # All SQL queries
server/handlers.go      # HTTP handlers (JSON)
server/routes.go        # Route registration, CORS, logging, SPA fallback
server/models.go        # Go structs (JSON-tagged)
server/conglomerates.go # 18 conglomerate group definitions (pattern matching)
client/src/main.ts      # SPA entry, route definitions
client/src/api.ts       # fetch wrapper (/api prefix)
client/src/router.ts    # Hash-based router with :param support
client/src/types.ts     # TypeScript interfaces (mirrors server models)
client/src/utils.ts     # formatShares, investorTypeLabel, debounce, el()
client/src/components/table.ts  # Generic sortable table renderer
```

## Dev Commands

```sh
make dev-server          # go run . -addr :8080 -db ../data/ownership.db
make dev-client          # vite dev server (proxies /api in dev)
make build               # yarn build + go build → bin/server
make run                 # ./bin/server -client client/dist -db data/ownership.db
uv run scripts/extract.py  # Re-extract PDF → SQLite
```

## Conventions

- Server: stdlib only (no router lib), Go 1.22+ `PathValue` for route params
- Client: No framework — vanilla DOM manipulation, CSS in single `style.css`
- Use `uv run --with <pkg>` for ad-hoc Python scripts (no pip install)
- Conglomerate groups are hardcoded pattern-match lists in `conglomerates.go`
