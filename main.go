package main

import (
	"crypto/tls"
	"encoding/json"
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
	r.HandleFunc("/", AssignPreprovisionedSession).Methods("GET")
	r.HandleFunc("/{sessionId}", showSession).Methods("GET")
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./docs"))).Methods("GET")

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

func showSession(rw http.ResponseWriter, req *http.Request) {
	http.ServeFile(rw, req, "./docs/index.html")
}
func AssignPreprovisionedSession(rw http.ResponseWriter, req *http.Request) {
	var sessionId string

	sessionCreateResponse := struct {
		SessionId string `json:"session_id"`
	}{}

	req, err := http.NewRequest("POST", "https://microsoft.play-with-docker.com/pre/sessions", nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	if res.StatusCode != 503 {
		json.NewDecoder(res.Body).Decode(&sessionCreateResponse)
		sessionId = sessionCreateResponse.SessionId
	}

	if sessionId == "" {
		req, err := http.NewRequest("POST", "https://microsoft.play-with-docker.com", nil)
		req.Header.Add("X-Requested-With", "XMLHttpRequest")
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			rw.WriteHeader(http.StatusInternalServerError)
			return
		}
		err = json.NewDecoder(res.Body).Decode(&sessionCreateResponse)
		sessionId = sessionCreateResponse.SessionId
	}

	http.Redirect(rw, req, "/"+sessionId, http.StatusFound)
}
