import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function WalletConnect({ onConnected }) {
  const [address, setAddress] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask not detected! Please install MetaMask extension.");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    try {
      setIsConnecting(true);

      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Create provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const net = await provider.getNetwork();

      setAddress(userAddress);
      
      // Properly identify network - ethers.js doesn't recognize Ganache
      let networkName = net.name;
      if (net.chainId === 1337n || net.chainId === 1337) {
        networkName = "ganache";
      } else if (net.chainId === 31337n || net.chainId === 31337) {
        networkName = "localhost";
      }
      setNetwork(networkName);

      // Notify parent component
      onConnected(provider);

      console.log("Connected:", userAddress);
      console.log("Network:", networkName, "Chain ID:", net.chainId);

    } catch (error) {
      console.error("Connection error:", error);
      alert("Failed to connect: " + (error.message || error));
    } finally {
      setIsConnecting(false);
    }
  }

  // Auto-reconnect if already connected
  useEffect(() => {
    async function checkConnection() {
      if (window.ethereum && window.ethereum.selectedAddress) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const userAddress = await signer.getAddress();
          const net = await provider.getNetwork();
          
          setAddress(userAddress);
          
          // Properly identify network
          let networkName = net.name;
          if (net.chainId === 1337n || net.chainId === 1337) {
            networkName = "ganache";
          } else if (net.chainId === 31337n || net.chainId === 31337) {
            networkName = "localhost";
          }
          setNetwork(networkName);
          onConnected(provider);
        } catch (e) {
          console.log("Auto-connect failed:", e);
        }
      }
    }
    checkConnection();
  }, [onConnected]);

  // Listen for account/network changes
  useEffect(() => {
    if (!window.ethereum) return;

    function handleAccountsChanged(accounts) {
      if (accounts.length === 0) {
        setAddress(null);
        setNetwork(null);
      } else {
        window.location.reload();
      }
    }

    function handleChainChanged() {
      window.location.reload();
    }

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        style={{
          padding: "10px 20px",
          fontSize: 15,
          fontWeight: "bold",
          background: address ? "#4CAF50" : "#2196F3",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: isConnecting ? "wait" : "pointer"
        }}
      >
        {isConnecting
          ? "🔄 Connecting..."
          : address
          ? `✅ ${address.substring(0, 6)}...${address.substring(38)}`
          : "🦊 Connect MetaMask"}
      </button>
      
      {network && (
        <span
          style={{
            padding: "6px 12px",
            background: (network === "sepolia" || network === "ganache" || network === "localhost") ? "#e7f3ff" : "#fff3cd",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500
          }}
        >
          {(network === "sepolia" || network === "ganache" || network === "localhost") ? "✅" : "⚠️"} {network}
        </span>
      )}
    </div>
  );
}