package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

func initDB(path string) {
	var err error
	db, err = sql.Open("sqlite3", path+"?mode=ro&_journal_mode=WAL")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Printf("Connected to database: %s", path)
}

func queryStats() (Stats, error) {
	var s Stats
	err := db.QueryRow(`SELECT COUNT(*), COUNT(DISTINCT share_code), COUNT(DISTINCT investor_name) FROM ownership`).
		Scan(&s.TotalRows, &s.TotalTickers, &s.TotalInvestors)
	if err != nil {
		return s, err
	}
	err = db.QueryRow(`SELECT COUNT(DISTINCT investor_name) FROM ownership WHERE local_foreign='L'`).Scan(&s.LocalInvestors)
	if err != nil {
		return s, err
	}
	err = db.QueryRow(`SELECT COUNT(DISTINCT investor_name) FROM ownership WHERE local_foreign='A'`).Scan(&s.ForeignInvestors)
	return s, err
}

func querySearch(q string) (SearchResult, error) {
	var r SearchResult
	q = strings.TrimSpace(q)
	if q == "" {
		r.Tickers = []TickerMatch{}
		r.Investors = []InvestorMatch{}
		return r, nil
	}
	qUpper := strings.ToUpper(q)
	pattern := "%" + q + "%"
	patternPrefix := q + "%"
	patternUpper := "%" + qUpper + "%"
	patternUpperPrefix := qUpper + "%"

	rows, err := db.Query(`
		SELECT DISTINCT o.share_code, o.issuer_name, f.free_float_pct, f.total_shares
		FROM ownership o
		LEFT JOIN float_data f ON o.share_code = f.share_code
		WHERE o.share_code LIKE ? OR o.issuer_name LIKE ?
		ORDER BY
			CASE
				WHEN UPPER(o.share_code) = ? THEN 0
				WHEN UPPER(o.share_code) LIKE ? THEN 1
				WHEN UPPER(o.share_code) LIKE ? THEN 2
				WHEN o.issuer_name LIKE ? THEN 3
				WHEN o.issuer_name LIKE ? THEN 4
				ELSE 5
			END,
			o.share_code ASC
		LIMIT 10`, patternUpper, pattern, qUpper, patternUpperPrefix, patternUpper, patternPrefix, pattern)
	if err != nil {
		return r, err
	}
	defer rows.Close()
	for rows.Next() {
		var t TickerMatch
		var ff sql.NullFloat64
		var ts sql.NullInt64
		if err := rows.Scan(&t.ShareCode, &t.IssuerName, &ff, &ts); err != nil {
			return r, err
		}
		if ff.Valid {
			t.FreeFloatPct = &ff.Float64
		}
		if ts.Valid {
			t.TotalShares = &ts.Int64
		}
		r.Tickers = append(r.Tickers, t)
	}

	rows2, err := db.Query(`
		SELECT investor_name, COUNT(DISTINCT share_code) as holdings
		FROM ownership
		WHERE investor_name LIKE ?
		GROUP BY investor_name
		ORDER BY
			CASE
				WHEN investor_name = ? THEN 0
				WHEN investor_name LIKE ? THEN 1
				WHEN investor_name LIKE ? THEN 2
				ELSE 3
			END,
			holdings DESC,
			investor_name ASC
		LIMIT 10`, pattern, q, patternPrefix, pattern)
	if err != nil {
		return r, err
	}
	defer rows2.Close()
	for rows2.Next() {
		var i InvestorMatch
		if err := rows2.Scan(&i.InvestorName, &i.Holdings); err != nil {
			return r, err
		}
		r.Investors = append(r.Investors, i)
	}

	if r.Tickers == nil {
		r.Tickers = []TickerMatch{}
	}
	if r.Investors == nil {
		r.Investors = []InvestorMatch{}
	}
	return r, nil
}

func queryTickers() ([]Ticker, error) {
	rows, err := db.Query(`
		SELECT sc.share_code,
			(
				SELECT o2.issuer_name
				FROM ownership o2
				WHERE o2.share_code = sc.share_code
				GROUP BY o2.issuer_name
				ORDER BY COUNT(*) DESC, o2.issuer_name ASC
				LIMIT 1
			) AS issuer_name,
			f.free_float_pct,
			f.total_shares
		FROM (SELECT DISTINCT share_code FROM ownership) sc
		LEFT JOIN float_data f ON sc.share_code = f.share_code
		ORDER BY sc.share_code`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tickers []Ticker
	for rows.Next() {
		var t Ticker
		var ff sql.NullFloat64
		var ts sql.NullInt64
		if err := rows.Scan(&t.ShareCode, &t.IssuerName, &ff, &ts); err != nil {
			return nil, err
		}
		if ff.Valid {
			t.FreeFloatPct = &ff.Float64
		}
		if ts.Valid {
			t.TotalShares = &ts.Int64
		}
		tickers = append(tickers, t)
	}
	return tickers, nil
}

func queryTickerDetail(code string) (*TickerDetail, error) {
	code = strings.ToUpper(code)
	var td TickerDetail
	var ff sql.NullFloat64
	var ts sql.NullInt64
	err := db.QueryRow(`
		SELECT DISTINCT o.share_code, o.issuer_name, f.free_float_pct, f.total_shares
		FROM ownership o
		LEFT JOIN float_data f ON o.share_code = f.share_code
		WHERE o.share_code = ?`, code).
		Scan(&td.ShareCode, &td.IssuerName, &ff, &ts)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if ff.Valid {
		td.FreeFloatPct = &ff.Float64
	}
	if ts.Valid {
		td.TotalShares = &ts.Int64
	}

	rows, err := db.Query(`SELECT investor_name, investor_type, local_foreign, COALESCE(nationality,''), total_holding_shares, percentage FROM ownership WHERE share_code = ? ORDER BY percentage DESC`, code)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var s Shareholder
		if err := rows.Scan(&s.InvestorName, &s.InvestorType, &s.LocalForeign, &s.Nationality, &s.TotalHoldingShares, &s.Percentage); err != nil {
			return nil, err
		}
		td.Shareholders = append(td.Shareholders, s)
	}
	if td.Shareholders == nil {
		td.Shareholders = []Shareholder{}
	}
	return &td, nil
}

func queryTickerLF(code string) (*TickerLF, error) {
	code = strings.ToUpper(code)
	var lf TickerLF
	err := db.QueryRow(`SELECT DISTINCT share_code, issuer_name FROM ownership WHERE share_code = ?`, code).
		Scan(&lf.ShareCode, &lf.IssuerName)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	rows, err := db.Query(`
		SELECT investor_type,
			COALESCE(SUM(CASE WHEN local_foreign='L' THEN total_holding_shares ELSE 0 END), 0) as local_shares,
			COALESCE(SUM(CASE WHEN local_foreign='A' THEN total_holding_shares ELSE 0 END), 0) as foreign_shares,
			COALESCE(SUM(CASE WHEN local_foreign='L' THEN percentage ELSE 0 END), 0) as local_pct,
			COALESCE(SUM(CASE WHEN local_foreign='A' THEN percentage ELSE 0 END), 0) as foreign_pct
		FROM ownership WHERE share_code = ?
		GROUP BY investor_type
		ORDER BY (local_pct + foreign_pct) DESC
	`, code)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var b LFBreakdown
		if err := rows.Scan(&b.InvestorType, &b.LocalShares, &b.ForeignShares, &b.LocalPct, &b.ForeignPct); err != nil {
			return nil, err
		}
		lf.Breakdown = append(lf.Breakdown, b)
		lf.TotalLocal += b.LocalPct
		lf.TotalForeign += b.ForeignPct
	}
	if lf.Breakdown == nil {
		lf.Breakdown = []LFBreakdown{}
	}
	return &lf, nil
}

func queryInvestorDetail(name string) (*InvestorDetail, error) {
	rows, err := db.Query(`SELECT share_code, issuer_name, investor_type, local_foreign, total_holding_shares, percentage FROM ownership WHERE investor_name = ? ORDER BY percentage DESC`, name)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var id InvestorDetail
	id.InvestorName = name
	for rows.Next() {
		var h Holding
		if err := rows.Scan(&h.ShareCode, &h.IssuerName, &h.InvestorType, &h.LocalForeign, &h.TotalHoldingShares, &h.Percentage); err != nil {
			return nil, err
		}
		id.Holdings = append(id.Holdings, h)
	}
	if len(id.Holdings) == 0 {
		return nil, nil
	}
	return &id, nil
}

func queryConglomerates() []ConglomerateSummary {
	var results []ConglomerateSummary
	for _, g := range conglomerateGroups {
		count := countConglomerateTickers(g)
		results = append(results, ConglomerateSummary{
			ID:          g.ID,
			Name:        g.Name,
			TickerCount: count,
		})
	}
	return results
}

func countConglomerateTickers(g ConglomerateGroup) int {
	where, args := buildConglomerateWhere(g)
	var count int
	err := db.QueryRow(fmt.Sprintf(`SELECT COUNT(DISTINCT share_code) FROM ownership WHERE %s`, where), args...).Scan(&count)
	if err != nil {
		return 0
	}
	return count
}

func queryConglomerateDetail(id string) *ConglomerateDetail {
	var group *ConglomerateGroup
	for _, g := range conglomerateGroups {
		if g.ID == id {
			group = &g
			break
		}
	}
	if group == nil {
		return nil
	}

	where, args := buildConglomerateWhere(*group)
	rows, err := db.Query(fmt.Sprintf(`SELECT share_code, issuer_name, investor_name, percentage FROM ownership WHERE %s ORDER BY share_code, percentage DESC`, where), args...)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var detail ConglomerateDetail
	detail.ID = group.ID
	detail.Name = group.Name
	for rows.Next() {
		var t ConglomerateTicker
		if err := rows.Scan(&t.ShareCode, &t.IssuerName, &t.InvestorName, &t.Percentage); err != nil {
			continue
		}
		detail.Tickers = append(detail.Tickers, t)
	}
	if detail.Tickers == nil {
		detail.Tickers = []ConglomerateTicker{}
	}
	return &detail
}

func buildConglomerateWhere(g ConglomerateGroup) (string, []interface{}) {
	clauses := make([]string, len(g.Patterns))
	args := make([]interface{}, len(g.Patterns))
	for i, p := range g.Patterns {
		clauses[i] = "investor_name LIKE ?"
		args[i] = "%" + p + "%"
	}
	return strings.Join(clauses, " OR "), args
}

func queryNetwork(ticker, investor string, depth int) NetworkGraph {
	const (
		maxNodes            = 200
		tickerInvestorLimit = 5
		investorTickerLimit = 10
	)
	var graph NetworkGraph
	nodeIndex := make(map[string]int)
	nodeType := make(map[string]string)
	linkSet := make(map[string]bool)

	addNode := func(id, ntype, name string) {
		if idx, ok := nodeIndex[id]; ok {
			if name != "" && graph.Nodes[idx].Name != name {
				graph.Nodes[idx].Name = name
			}
			return
		}
		nodeIndex[id] = len(graph.Nodes)
		nodeType[id] = ntype
		graph.Nodes = append(graph.Nodes, GraphNode{ID: id, Type: ntype, Name: name})
	}

	addLink := func(source, target string, pct float64) {
		key := source + "|" + target
		if linkSet[key] {
			return
		}
		linkSet[key] = true
		graph.Links = append(graph.Links, GraphLink{Source: source, Target: target, Percentage: pct})
	}

	if ticker == "" && investor == "" {
		return graph
	}

	rootID := ""
	if ticker != "" {
		ticker = strings.ToUpper(ticker)
		rootID = "t:" + ticker
		addNode(rootID, "ticker", ticker)
	} else {
		rootID = "i:" + investor
		addNode(rootID, "investor", investor)
	}

	type inv struct {
		name   string
		pct    float64
		issuer string
	}
	type tick struct {
		code string
		name string
		pct  float64
	}

	fetchInvestors := func(code string, limit int) ([]inv, string) {
		query := `SELECT investor_name, percentage, issuer_name FROM ownership WHERE share_code = ? ORDER BY percentage DESC`
		if limit > 0 {
			query = fmt.Sprintf("%s LIMIT %d", query, limit)
		}
		rows, err := db.Query(query, code)
		if err != nil {
			return nil, ""
		}
		defer rows.Close()
		var issuerName string
		var investors []inv
		for rows.Next() {
			var name string
			var pct float64
			var issuer string
			if err := rows.Scan(&name, &pct, &issuer); err != nil {
				continue
			}
			if issuerName == "" {
				issuerName = issuer
			}
			investors = append(investors, inv{name: name, pct: pct, issuer: issuer})
		}
		return investors, issuerName
	}

	fetchTickers := func(name string, limit int) []tick {
		query := `SELECT share_code, issuer_name, percentage FROM ownership WHERE investor_name = ? ORDER BY percentage DESC`
		if limit > 0 {
			query = fmt.Sprintf("%s LIMIT %d", query, limit)
		}
		rows, err := db.Query(query, name)
		if err != nil {
			return nil
		}
		defer rows.Close()
		var tickers []tick
		for rows.Next() {
			var t tick
			if err := rows.Scan(&t.code, &t.name, &t.pct); err != nil {
				continue
			}
			tickers = append(tickers, t)
		}
		return tickers
	}

	frontier := []string{rootID}
	expanded := make(map[string]bool)
	hitCap := false

	for level := 0; level < depth && len(frontier) > 0; level++ {
		nextSet := make(map[string]bool)
		for _, id := range frontier {
			if expanded[id] {
				continue
			}
			expanded[id] = true
			if len(graph.Nodes) >= maxNodes {
				hitCap = true
				break
			}
			switch nodeType[id] {
			case "ticker":
				code := strings.TrimPrefix(id, "t:")
				limit := tickerInvestorLimit
				if id == rootID {
					limit = 0
				}
				investors, issuerName := fetchInvestors(code, limit)
				if issuerName != "" {
					addNode(id, "ticker", code+"\n"+issuerName)
				}
				for _, i := range investors {
					invID := "i:" + i.name
					addNode(invID, "investor", i.name)
					addLink(invID, id, i.pct)
					if !expanded[invID] {
						nextSet[invID] = true
					}
					if len(graph.Nodes) >= maxNodes {
						hitCap = true
						break
					}
				}
			case "investor":
				name := strings.TrimPrefix(id, "i:")
				limit := investorTickerLimit
				if id == rootID {
					limit = 0
				}
				tickers := fetchTickers(name, limit)
				addNode(id, "investor", name)
				for _, t := range tickers {
					code := strings.ToUpper(t.code)
					tid := "t:" + code
					addNode(tid, "ticker", code+"\n"+t.name)
					addLink(id, tid, t.pct)
					if !expanded[tid] {
						nextSet[tid] = true
					}
					if len(graph.Nodes) >= maxNodes {
						hitCap = true
						break
					}
				}
			}
			if hitCap {
				break
			}
		}
		if hitCap {
			break
		}
		frontier = frontier[:0]
		for id := range nextSet {
			frontier = append(frontier, id)
		}
	}

	if graph.Nodes == nil {
		graph.Nodes = []GraphNode{}
	}
	if graph.Links == nil {
		graph.Links = []GraphLink{}
	}
	return graph
}

func queryCompanyProfile(code string) (*CompanyProfile, error) {
	var p CompanyProfile
	var directors, commissioners, auditCommittee string
	err := db.QueryRow(`
		SELECT share_code, name, sector, sub_sector, industry, address, website,
		       email, phone, listing_date, listing_board, directors, commissioners, audit_committee
		FROM company_profiles WHERE share_code = ?`, code).
		Scan(&p.ShareCode, &p.Name, &p.Sector, &p.SubSector, &p.Industry,
			&p.Address, &p.Website, &p.Email, &p.Phone, &p.ListingDate, &p.ListingBoard,
			&directors, &commissioners, &auditCommittee)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	json.Unmarshal([]byte(directors), &p.Directors)
	json.Unmarshal([]byte(commissioners), &p.Commissioners)
	json.Unmarshal([]byte(auditCommittee), &p.AuditCommittee)
	if p.Directors == nil {
		p.Directors = []BoardMember{}
	}
	if p.Commissioners == nil {
		p.Commissioners = []BoardMember{}
	}
	if p.AuditCommittee == nil {
		p.AuditCommittee = []BoardMember{}
	}
	return &p, nil
}
