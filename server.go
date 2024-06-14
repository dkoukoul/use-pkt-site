package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
)

const serverPort = 8080

type VpnServer struct {
	Name       string `json:"name"`
	Country    string `json:"country"`
	Cost       int    `json:"cost"`
	PKTAddress string `json:"pktaddress"`
	Url        string `json:"url"`
}

type RequestVpnAccess struct {
	Txid string `json:"txid"`
}

type PKTAddress struct {
	Address string `json:"address"`
}

func loadVpnServers() ([]VpnServer, error) {
	fmt.Println("Loading VPN servers")
	jsonFile, err := ioutil.ReadFile("data/servers.json")
	if err != nil {
		return nil, err
	}

	var servers []VpnServer
	json.Unmarshal(jsonFile, &servers)
	fmt.Println(servers)
	return servers, nil
}

func getCredentials(transactionId string, serverName string) (string, error) {
	fmt.Println("Getting credentials from", serverName, " for transaction ID: ", transactionId)
	servers, _ := loadVpnServers()
	for _, server := range servers {
		if server.Name == serverName {
			fmt.Println("Server found: ", server.Name)
			request := RequestVpnAccess{
				Txid: transactionId,
			}
			reqBody, err := json.Marshal(request)
			if err != nil {
				fmt.Println("Error marshalling data: ", err)
				continue
			}

			// Create a new request
			req, err := http.NewRequest("POST", server.Url, bytes.NewBuffer(reqBody))
			if err != nil {
				fmt.Println("Error creating request: ", err)
				continue
			}
			req.Header.Set("Content-Type", "application/json")

			// Send the request and get the response
			client := &http.Client{}
			resp, err := client.Do(req)
			if err != nil {
				fmt.Println("Error sending request: ", err)
				continue
			}
			defer resp.Body.Close()

			// Read the response body
			respBody, err := ioutil.ReadAll(resp.Body)
			if err != nil {
				fmt.Println("Error reading response body: ", err)
				continue
			}

			fmt.Println("Response: ", string(respBody))
			return string(respBody), nil
		}
	}

	return "", nil
}

func main() {
	http.HandleFunc("/api/vpn-servers", func(w http.ResponseWriter, r *http.Request) {
		servers, err := loadVpnServers()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(servers)
	})

	http.HandleFunc("/api/pkt-address", func(w http.ResponseWriter, r *http.Request) {
		address := PKTAddress{Address: "pkt1q0en8v8jzu3gk9cmqlp7h4a4d8sxwtzqqzq"}

		json.NewEncoder(w).Encode(address)
	})

	http.HandleFunc("/api/get-credentials", func(w http.ResponseWriter, r *http.Request) {
		transactionId := r.URL.Query().Get("transactionId")
		serverName := r.URL.Query().Get("serverName")
		if transactionId == "" {
			http.Error(w, "Missing transaction ID", http.StatusBadRequest)
			return
		}

		// Call your function to get the credentials with the transaction ID
		respBody, err := getCredentials(transactionId, serverName)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(respBody)
	})
	fs := http.FileServer(http.Dir("."))
	http.Handle("/", fs)
	fmt.Println("Server started on port ", serverPort)
	http.ListenAndServe(":"+strconv.Itoa(serverPort), nil)
}
