import React, { useState } from "react";
import { CONTRACT_ABI } from "../utils/contractABI";
import { ethers } from "ethers";

const MOVES = ["Rock", "Paper", "Scissors", "Spock", "Lizard"];

export default function GameReveal({ provider }) {
  const [contractAddress, setContractAddress] = useState("");
  const [move, setMove] = useState(1); // Contract move 1-5
  const [salt, setSalt] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);

  /**
   * Upload secret file and auto-fill move and salt
   */
  async function handleUploadSecret(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const secret = JSON.parse(text);

      if (!secret.move || !secret.salt) {
        throw new Error("Invalid secret file format");
      }

      setMove(Number(secret.move));
      setSalt(secret.salt);

      // Try to auto-fill contract address if available
      if (secret.contractAddress) {
        setContractAddress(secret.contractAddress);
      }

      alert(`✅ Secret loaded!\nMove: ${secret.moveName || MOVES[secret.move - 1]}`);
    } catch (error) {
      console.error("Secret file error:", error);
      alert("❌ Invalid secret file: " + error.message);
    }
  }

  /**
   * Load secret from localStorage
   */
  function handleLoadFromStorage() {
    try {
      const savedSecret = localStorage.getItem("rps_secret");
      if (!savedSecret) {
        alert("ℹ️ No secret found in localStorage.");
        return;
      }

      const secret = JSON.parse(savedSecret);
      setMove(Number(secret.move));
      setSalt(secret.salt);

      alert(`✅ Secret loaded from localStorage!\nMove: ${secret.moveName}`);
    } catch (error) {
      console.error("Load error:", error);
      alert("❌ Error loading secret: " + error.message);
    }
  }

  /**
   * Reveal move by calling solve(uint8 _c1, uint256 _salt)
   */
  async function handleReveal() {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      alert("⚠️ Please enter a valid contract address!");
      return;
    }

    if (!salt) {
      alert("⚠️ Please load your secret first!");
      return;
    }

    if (move < 1 || move > 5) {
      alert("⚠️ Invalid move! Must be 1-5.");
      return;
    }

    try {
      setIsRevealing(true);

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

      // Convert salt to uint256
      let saltBigInt;
      try {
        const saltClean = salt.startsWith("0x") ? salt.slice(2) : salt;
        saltBigInt = BigInt("0x" + saltClean);
        
        console.log("Salt conversion:");
        console.log("  Raw salt:", salt);
        console.log("  Cleaned:", saltClean);
        console.log("  As BigInt:", saltBigInt.toString());
      } catch (e) {
        console.error("Salt conversion error:", e);
        alert("⚠️ Invalid salt format!");
        setIsRevealing(false);
        return;
      }

      console.log("Revealing move...");
      console.log("Contract:", contractAddress);
      console.log("Move value:", move, "Type:", typeof move);
      console.log("Move name:", MOVES[move - 1]);
      console.log("Salt BigInt:", saltBigInt.toString());
      
      // Verify values are correct
      if (!move || move < 1 || move > 5) {
        alert("⚠️ Invalid move value: " + move);
        setIsRevealing(false);
        return;
      }
      
      if (!saltBigInt || saltBigInt === 0n) {
        alert("⚠️ Invalid salt value");
        setIsRevealing(false);
        return;
      }

      // Call solve(uint8 _c1, uint256 _salt)
      console.log("Calling solve with:", Number(move), saltBigInt);
      
      const tx = await contract.solve(
        Number(move),
        saltBigInt,
        {
          gasLimit: 500000
        }
      );

      console.log("Transaction sent:", tx.hash);
      alert(`⏳ Revealing...\nTx: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed!");

      // Try to determine winner from events/logs
      // The contract sends ETH directly, so check transaction logs
      alert(
        `✅ Move Revealed!\n\n` +
        `Your move: ${MOVES[move - 1]}\n` +
        `Transaction: ${tx.hash}\n\n` +
        `Check the contract balance or events to see the winner!`
      );

      // Save reveal to localStorage
      const reveals = JSON.parse(localStorage.getItem("rps_reveals") || "[]");
      reveals.push({
        contractAddress,
        move,
        moveName: MOVES[move - 1],
        revealedAt: new Date().toISOString(),
        txHash: tx.hash
      });
      localStorage.setItem("rps_reveals", JSON.stringify(reveals));

      // Clear form
      setSalt("");

    } catch (error) {
      console.error("Reveal error:", error);
      
      // Check for specific errors
      if (error.message?.includes("invalid move")) {
        alert("❌ Invalid move or salt! The commitment doesn't match.");
      } else if (error.message?.includes("J2 must have played")) {
        alert("❌ Player 2 has not played yet!");
      } else {
        alert("❌ Reveal failed: " + (error.reason || error.message));
      }
    } finally {
      setIsRevealing(false);
    }
  }

  /**
   * Load saved games
   */
  function loadSavedGames() {
    const games = JSON.parse(localStorage.getItem("rps_games") || "[]");
    if (games.length === 0) {
      alert("ℹ️ No saved games found.");
      return;
    }

    const gameList = games
      .map(
        (g, i) =>
          `${i + 1}. ${g.contractAddress}\n   Move: ${g.moveName}\n   Created: ${g.createdAt}`
      )
      .join("\n\n");

    alert(`📋 Your Games:\n\n${gameList}`);
  }

  return (
    <div className="container">
      <h3>🔓 Reveal Move (Player 1)</h3>

      <div style={{ marginBottom: 10 }}>
        <label>
          <strong>Game Contract Address:</strong>
          <input
            type="text"
            placeholder="0x..."
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
          />
        </label>
        <div style={{ marginTop: 4 }}>
          <button onClick={loadSavedGames} style={{ fontSize: 12 }}>
            📋 Show My Games
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <strong>Load Secret:</strong>
          <div style={{ marginTop: 4 }}>
            <input
              type="file"
              accept=".json"
              onChange={handleUploadSecret}
              style={{ fontSize: 12 }}
            />
          </div>
        </label>
        <div style={{ marginTop: 4 }}>
          <button onClick={handleLoadFromStorage} style={{ fontSize: 12 }}>
            📂 Load from localStorage
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <strong>Move (1-5):</strong>
          <select
            value={move}
            onChange={(e) => setMove(Number(e.target.value))}
            style={{ width: "100%", marginTop: 4 }}
          >
            <option value={1}>Rock (1)</option>
            <option value={2}>Paper (2)</option>
            <option value={3}>Scissors (3)</option>
            <option value={4}>Spock (4)</option>
            <option value={5}>Lizard (5)</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <strong>Salt (hex):</strong>
          <input
            type="text"
            placeholder="0x..."
            value={salt}
            onChange={(e) => setSalt(e.target.value)}
            style={{ width: "100%", marginTop: 4, fontFamily: "monospace", fontSize: 11 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={handleReveal}
          disabled={isRevealing || !salt}
          style={{
            background: isRevealing ? "#ccc" : "#FF5722",
            color: "white",
            fontWeight: "bold"
          }}
        >
          {isRevealing ? "⏳ Revealing..." : "🔓 Reveal Move"}
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        ℹ️ Only Player 1 can reveal. You must use the exact move and salt from game creation.
      </div>
    </div>
  );
}