package main

import (
	"flag"
	"log"
	"net/http"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	dbPath := flag.String("db", "../data/ownership.db", "path to SQLite database")
	clientDir := flag.String("client", "", "path to client dist directory (optional)")
	flag.Parse()

	initDB(*dbPath)

	mux := http.NewServeMux()
	setupRoutes(mux, *clientDir)

	handler := logging(cors(mux))

	log.Printf("Server starting on %s", *addr)
	if err := http.ListenAndServe(*addr, handler); err != nil {
		log.Fatal(err)
	}
}
