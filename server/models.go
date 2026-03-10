package main

type Stats struct {
	TotalRows      int `json:"total_rows"`
	TotalTickers   int `json:"total_tickers"`
	TotalInvestors int `json:"total_investors"`
	LocalInvestors int `json:"local_investors"`
	ForeignInvestors int `json:"foreign_investors"`
}

type SearchResult struct {
	Tickers   []TickerMatch   `json:"tickers"`
	Investors []InvestorMatch `json:"investors"`
}

type TickerMatch struct {
	ShareCode    string   `json:"share_code"`
	IssuerName   string   `json:"issuer_name"`
	FreeFloatPct *float64 `json:"free_float_pct"`
	TotalShares  *int64   `json:"total_shares"`
}

type InvestorMatch struct {
	InvestorName string `json:"investor_name"`
	Holdings     int    `json:"holdings"`
}

type Ticker struct {
	ShareCode    string   `json:"share_code"`
	IssuerName   string   `json:"issuer_name"`
	FreeFloatPct *float64 `json:"free_float_pct"`
	TotalShares  *int64   `json:"total_shares"`
}

type Shareholder struct {
	InvestorName      string  `json:"investor_name"`
	InvestorType      string  `json:"investor_type"`
	LocalForeign      string  `json:"local_foreign"`
	Nationality       string  `json:"nationality"`
	TotalHoldingShares int64  `json:"total_holding_shares"`
	Percentage        float64 `json:"percentage"`
}

type TickerDetail struct {
	ShareCode    string        `json:"share_code"`
	IssuerName   string        `json:"issuer_name"`
	FreeFloatPct *float64      `json:"free_float_pct"`
	TotalShares  *int64        `json:"total_shares"`
	Shareholders []Shareholder `json:"shareholders"`
}

type Holding struct {
	ShareCode          string  `json:"share_code"`
	IssuerName         string  `json:"issuer_name"`
	InvestorType       string  `json:"investor_type"`
	LocalForeign       string  `json:"local_foreign"`
	TotalHoldingShares int64   `json:"total_holding_shares"`
	Percentage         float64 `json:"percentage"`
}

type InvestorDetail struct {
	InvestorName string    `json:"investor_name"`
	Holdings     []Holding `json:"holdings"`
}

type LFBreakdown struct {
	InvestorType string  `json:"investor_type"`
	LocalShares  int64   `json:"local_shares"`
	ForeignShares int64  `json:"foreign_shares"`
	LocalPct     float64 `json:"local_pct"`
	ForeignPct   float64 `json:"foreign_pct"`
}

type TickerLF struct {
	ShareCode  string        `json:"share_code"`
	IssuerName string        `json:"issuer_name"`
	Breakdown  []LFBreakdown `json:"breakdown"`
	TotalLocal   float64     `json:"total_local_pct"`
	TotalForeign float64     `json:"total_foreign_pct"`
}

type ConglomerateSummary struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	TickerCount int    `json:"ticker_count"`
}

type ConglomerateTicker struct {
	ShareCode    string  `json:"share_code"`
	IssuerName   string  `json:"issuer_name"`
	InvestorName string  `json:"investor_name"`
	Percentage   float64 `json:"percentage"`
}

type ConglomerateDetail struct {
	ID      string               `json:"id"`
	Name    string               `json:"name"`
	Tickers []ConglomerateTicker `json:"tickers"`
}

type GraphNode struct {
	ID   string `json:"id"`
	Type string `json:"type"` // "ticker" or "investor"
	Name string `json:"name"`
}

type GraphLink struct {
	Source     string  `json:"source"`
	Target     string  `json:"target"`
	Percentage float64 `json:"percentage"`
}

type NetworkGraph struct {
	Nodes []GraphNode `json:"nodes"`
	Links []GraphLink `json:"links"`
}

type BoardMember struct {
	Name  string `json:"name"`
	Title string `json:"title"`
}

type CompanyProfile struct {
	ShareCode      string        `json:"share_code"`
	Name           string        `json:"name"`
	Sector         string        `json:"sector"`
	SubSector      string        `json:"sub_sector"`
	Industry       string        `json:"industry"`
	Address        string        `json:"address"`
	Website        string        `json:"website"`
	Email          string        `json:"email"`
	Phone          string        `json:"phone"`
	ListingDate    string        `json:"listing_date"`
	ListingBoard   string        `json:"listing_board"`
	Directors      []BoardMember `json:"directors"`
	Commissioners  []BoardMember `json:"commissioners"`
	AuditCommittee []BoardMember `json:"audit_committee"`
}
