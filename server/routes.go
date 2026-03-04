package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func setupRoutes(mux *http.ServeMux, clientDir string) {
	mux.HandleFunc("GET /api/stats", handleStats)
	mux.HandleFunc("GET /api/search", handleSearch)
	mux.HandleFunc("GET /api/tickers", handleTickers)
	mux.HandleFunc("GET /api/tickers/{code}", handleTickerDetail)
	mux.HandleFunc("GET /api/tickers/{code}/local-foreign", handleTickerLF)
	mux.HandleFunc("GET /api/investors/{name}", handleInvestorDetail)
	mux.HandleFunc("GET /api/conglomerates", handleConglomerates)
	mux.HandleFunc("GET /api/conglomerates/{id}", handleConglomerateDetail)
	mux.HandleFunc("GET /api/network", handleNetwork)

	if clientDir != "" {
		fs := http.FileServer(http.Dir(clientDir))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			// SPA fallback: if the file doesn't exist, serve index.html
			path := filepath.Join(clientDir, r.URL.Path)
			if _, err := os.Stat(path); os.IsNotExist(err) && r.URL.Path != "/" {
				http.ServeFile(w, r, filepath.Join(clientDir, "index.html"))
				return
			}
			fs.ServeHTTP(w, r)
		})
	}
}
