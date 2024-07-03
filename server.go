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
	Address string `json:"address"`
}

type PKTAddress struct {
	Address string `json:"address"`
}

type ExplorerAddressResponse struct {
	UnconfirmedReceived string  `json:"unconfirmedReceived"` // Required
	Balance             string  `json:"balance"`             // Required
	ConfirmedReceived   *string `json:"confirmedReceived,omitempty"`
	Spending            *string `json:"spending,omitempty"`
	Spent               *string `json:"spent,omitempty"`
	Burned              *string `json:"burned,omitempty"`
	RecvCount           *int    `json:"recvCount,omitempty"`
	MineCount           *int    `json:"mineCount,omitempty"`
	SpentCount          *int    `json:"spentCount,omitempty"`
	BalanceCount        *int    `json:"balanceCount,omitempty"`
	Mined24             *string `json:"mined24,omitempty"`
	FirstSeen           *string `json:"firstSeen,omitempty"`
	Transferred         *int    `json:"transferred,omitempty"`
	Address             *string `json:"address,omitempty"`
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

func getAddress(serverName string) (string, error) {
	fmt.Println("Getting PKT Address from", serverName)
	servers, _ := loadVpnServers()
	for _, server := range servers {
		if server.Name == serverName {
			getAddressEndpoint := "api/0.4/server/premium/address/"

			// Send the request and get the response
			client := &http.Client{}
			resp, err := client.Get(server.Url + getAddressEndpoint)
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
	return "", fmt.Errorf("server not found")
}

func getCredentials(address string, serverName string) (string, error) {
	fmt.Println("Getting credentials from", serverName, " for address: ", address)
	if address == "" {
		return "", fmt.Errorf("missing address")
	}
	fmt.Println(address)
	// check if address has balance
	explorerUrl := "https://api.packetscan.io/api/v1/PKT/pkt/address/" + address
	resp, err := http.Get(explorerUrl)
	if err != nil {
		fmt.Println("Error getting address balance: ", err)
		return "", err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading response body: ", err)
		return "", err
	}
	var explorerResp ExplorerAddressResponse

	err = json.Unmarshal(body, &explorerResp)
	if err != nil {
		fmt.Println("Error unmarshalling response body: ", err)
		return "", err
	}

	if explorerResp.Balance != "" && explorerResp.Balance != "0" {
		fmt.Println("The balance is not zero:", explorerResp.Balance)
	} else if explorerResp.UnconfirmedReceived != "" && explorerResp.UnconfirmedReceived != "0" {
		return "", fmt.Errorf("address has no confirmed balance yet")
	} else {
		return "", fmt.Errorf("address has no balance yet")
	}
	servers, _ := loadVpnServers()
	for _, server := range servers {
		if server.Name == serverName {
			fmt.Println("Server found: ", server.Name)
			request := RequestVpnAccess{
				Address: address,
			}
			reqBody, err := json.Marshal(request)
			if err != nil {
				fmt.Println("Error marshalling data: ", err)
				continue
			}
			credentialsEndpoint := "api/0.4/server/vpnaccess/"
			// Create a new request
			req, err := http.NewRequest("POST", server.Url+credentialsEndpoint, bytes.NewBuffer(reqBody))
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

	return "", fmt.Errorf("server not found")
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
		address := r.URL.Query().Get("address")
		serverName := r.URL.Query().Get("serverName")
		if address == "" {
			http.Error(w, "Missing address", http.StatusBadRequest)
			return
		}

		// Call your function to get the credentials with the transaction ID
		respBody, err := getCredentials(address, serverName)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		json.NewEncoder(w).Encode(respBody)
	})

	http.HandleFunc("/api/get-address", func(w http.ResponseWriter, r *http.Request) {
		serverName := r.URL.Query().Get("serverName")
		if serverName == "" {
			http.Error(w, "Missing serverName", http.StatusBadRequest)
			return
		}

		// Call your function to get the address with the server name
		respBody, err := getAddress(serverName)
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
