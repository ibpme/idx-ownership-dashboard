package main

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	stats, err := queryStats()
	if err != nil {
		writeError(w, 500, "failed to query stats")
		return
	}
	writeJSON(w, stats)
}

func handleSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, SearchResult{Tickers: []TickerMatch{}, Investors: []InvestorMatch{}})
		return
	}
	result, err := querySearch(q)
	if err != nil {
		writeError(w, 500, "search failed")
		return
	}
	writeJSON(w, result)
}

func handleTickers(w http.ResponseWriter, r *http.Request) {
	tickers, err := queryTickers()
	if err != nil {
		writeError(w, 500, "failed to query tickers")
		return
	}
	writeJSON(w, tickers)
}

func handleTickerDetail(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	detail, err := queryTickerDetail(code)
	if err != nil {
		writeError(w, 500, "query failed")
		return
	}
	if detail == nil {
		writeError(w, 404, "ticker not found")
		return
	}
	writeJSON(w, detail)
}

func handleTickerLF(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	lf, err := queryTickerLF(code)
	if err != nil {
		writeError(w, 500, "query failed")
		return
	}
	if lf == nil {
		writeError(w, 404, "ticker not found")
		return
	}
	writeJSON(w, lf)
}

func handleInvestorDetail(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	detail, err := queryInvestorDetail(name)
	if err != nil {
		writeError(w, 500, "query failed")
		return
	}
	if detail == nil {
		writeError(w, 404, "investor not found")
		return
	}
	writeJSON(w, detail)
}

func handleConglomerates(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, queryConglomerates())
}

func handleConglomerateDetail(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	detail := queryConglomerateDetail(id)
	if detail == nil {
		writeError(w, 404, "conglomerate not found")
		return
	}
	writeJSON(w, detail)
}

func handleCompanyProfile(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	profile, err := queryCompanyProfile(code)
	if err != nil {
		writeError(w, 500, "query failed")
		return
	}
	if profile == nil {
		writeError(w, 404, "company profile not found")
		return
	}
	writeJSON(w, profile)
}

func handleNetwork(w http.ResponseWriter, r *http.Request) {
	ticker := r.URL.Query().Get("ticker")
	investor := r.URL.Query().Get("investor")
	depth := 2
	if rawDepth := r.URL.Query().Get("depth"); rawDepth != "" {
		if parsed, err := strconv.Atoi(rawDepth); err == nil {
			depth = parsed
		}
	}
	if depth < 1 {
		depth = 1
	}
	if depth > 5 {
		depth = 5
	}
	if ticker == "" && investor == "" {
		writeJSON(w, NetworkGraph{Nodes: []GraphNode{}, Links: []GraphLink{}})
		return
	}
	writeJSON(w, queryNetwork(ticker, investor, depth))
}
