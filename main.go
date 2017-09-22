package main

import (
	"crypto/tls"
	"flag"
	"fmt"
	"log"
	"net/http"
	"time"

	"golang.org/x/crypto/acme/autocert"

	"github.com/gorilla/mux"
	"github.com/urfave/negroni"
)

func main() {
	var UseTLS bool
	var Domain string
	var CertDir string
	var SecurePort int
	var InsecurePort int

	flag.BoolVar(&UseTLS, "tls", false, "Use Let's Encrypt")
	flag.StringVar(&Domain, "domain", "ee.microsoft.play-with-docker.com", "Domain in which the site is hosted")
	flag.StringVar(&CertDir, "cert-dir", "", "Dir in which to store let's encrypt certificates")
	flag.IntVar(&SecurePort, "secure-port", 443, "Port to use for TLS connections")
	flag.IntVar(&InsecurePort, "port", 80, "Port to use for plain http connections")

	flag.Parse()

	r := mux.NewRouter()
	r.HandleFunc("/ping", Ping).Methods("GET")

	n := negroni.Classic()
	n.UseHandler(r)

	if UseTLS {
		httpServer := http.Server{
			Addr:              fmt.Sprintf("0.0.0.0:%d", SecurePort),
			Handler:           n,
			IdleTimeout:       30 * time.Second,
			ReadHeaderTimeout: 5 * time.Second,
		}
		certManager := autocert.Manager{
			Prompt:     autocert.AcceptTOS,
			HostPolicy: autocert.HostWhitelist(Domain),
			Cache:      autocert.DirCache(CertDir),
		}

		httpServer.TLSConfig = &tls.Config{
			GetCertificate: certManager.GetCertificate,
		}
		go func() {
			http.HandleFunc("/", func(rw http.ResponseWriter, r *http.Request) {
				http.Redirect(rw, r, fmt.Sprintf("https://%s", r.Host), http.StatusMovedPermanently)
			})
			log.Printf("Starting redirect server on port %d\n", InsecurePort)
			log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", InsecurePort), nil))
		}()

		log.Printf("Listening on port %d\n", SecurePort)
		log.Fatal(httpServer.ListenAndServeTLS("", ""))
	} else {
		httpServer := http.Server{
			Addr:              fmt.Sprintf("0.0.0.0:%d", InsecurePort),
			Handler:           n,
			IdleTimeout:       30 * time.Second,
			ReadHeaderTimeout: 5 * time.Second,
		}

		log.Printf("Listening on port %d\n", InsecurePort)
		log.Fatal(httpServer.ListenAndServe())
	}
}

func Ping(rw http.ResponseWriter, req *http.Request) {
}
