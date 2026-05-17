package main

import (
	"log"
	"net/http"
	"os"

	"github.com/junho-baek/owncanvas/generation/internal/generation"
)

func main() {
	addr := os.Getenv("OWNCANVAS_GENERATION_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8787"
	}

	server := generation.NewServer(
		generation.NewService(generation.NewProviderFromEnvironment(), generation.ServiceOptions{
			MaxConcurrency: 3,
		}),
	)

	log.Printf("OwnCanvas generation service listening on http://%s", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatal(err)
	}
}
