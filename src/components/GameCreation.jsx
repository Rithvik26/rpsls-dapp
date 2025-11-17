import React, { useState } from "react";
import { CONTRACT_ABI, CONTRACT_BYTECODE } from "../utils/contractABI";
import { 
  generateSalt, 
  createCommitment, 
  uiMoveToContract,
  isValidAddress,
  parseEth 
} from "../utils/hashHelpers";
import { ethers } from "ethers";

const MOVES = ["Rock", "Paper", "Scissors", "Spock", "Lizard"];

export default function GameCreation({ provider, onGameCreated }) {
  const [opponent, setOpponent] = useState("");
  const [stake, setStake] = useState("0.0001");
  const [move, setMove] = useState(0); // UI index 0-4
  const [salt, setSalt] = useState("");
  const [commitment, setCommitment] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Generate cryptographic salt and compute commitment
   */
  function handleGenerateSalt() {
    try {
      const newSalt = generateSalt();
      const contractMove = uiMoveToContract(move);
      const hash = createCommitment(contractMove, newSalt);
      
      setSalt(newSalt);
      setCommitment(hash);
      
      // Store in localStorage as backup
      const gameData = {
        move: contractMove,
        moveName: MOVES[move],
        salt: newSalt,
        commitment: hash,
        timestamp: Date.now()
      };
      localStorage.setItem("rps_secret", JSON.stringify(gameData));
      
      alert("✅ Salt generated! Commitment computed. Secret saved to localStorage.");
    } catch (error) {
      console.error("Salt generation error:", error);
      alert("❌ Error generating salt: " + error.message);
    }
  }

  /**
   * Download secret as JSON file
   */
  function handleDownloadSecret() {
    if (!salt) {
      alert("⚠️ Generate salt first!");
      return;
    }

    const secretData = {
      move: uiMoveToContract(move),
      moveName: MOVES[move],
      salt: salt,
      commitment: commitment,
      createdAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(secretData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rps_secret_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    alert("💾 Secret file downloaded! Keep it safe - you'll need it to reveal your move!");
  }

  /**
   * Deploy new RPS contract instance
   * Each game is a separate contract deployment
   */
  async function handleCreateGame() {
    // Validation
    if (!salt || !commitment) {
      alert("⚠️ Generate salt and save secret first!");
      return;
    }

    if (!opponent || !isValidAddress(opponent)) {
      alert("⚠️ Please enter a valid opponent address!");
      return;
    }

    try {
      const stakeAmount = parseEth(stake);
      
      setIsCreating(true);

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Check if opponent is same as creator
      if (opponent.toLowerCase() === signerAddress.toLowerCase()) {
        alert("⚠️ You cannot play against yourself!");
        setIsCreating(false);
        return;
      }

      // Deploy new RPS contract
      // Constructor: RPS(bytes32 _c1Hash, address _j2) payable
      const factory = new ethers.ContractFactory(
        CONTRACT_ABI,
        CONTRACT_BYTECODE,
        signer
      );

      console.log("Deploying game contract...");
      console.log("Commitment:", commitment);
      console.log("Opponent:", opponent);
      console.log("Stake:", ethers.formatEther(stakeAmount), "ETH");

      const contract = await factory.deploy(
        commitment,
        opponent,
        {
          value: stakeAmount,
          gasLimit: 1000000
        }
      );

      console.log("Waiting for deployment...");
      await contract.waitForDeployment();

      const contractAddress = await contract.getAddress();
      console.log("✅ Game deployed at:", contractAddress);

      // Store game info
      const gameInfo = {
        contractAddress,
        j1: signerAddress,
        j2: opponent,
        stake: ethers.formatEther(stakeAmount),
        move: uiMoveToContract(move),
        moveName: MOVES[move],
        salt: salt,
        commitment: commitment,
        createdAt: new Date().toISOString()
      };

      // Save to localStorage
      const games = JSON.parse(localStorage.getItem("rps_games") || "[]");
      games.push(gameInfo);
      localStorage.setItem("rps_games", JSON.stringify(games));
      localStorage.setItem("rps_current_game", contractAddress);

      alert(
        `🎮 Game Created!\n\n` +
        `Contract: ${contractAddress}\n` +
        `Your move: ${MOVES[move]}\n` +
        `Stake: ${ethers.formatEther(stakeAmount)} ETH\n\n` +
        `⚠️ SAVE YOUR SECRET FILE! You need it to reveal your move.`
      );

      // Notify parent component
      if (onGameCreated) {
        onGameCreated(contractAddress);
      }

      // Reset form
      setOpponent("");
      setSalt("");
      setCommitment("");

    } catch (error) {
      console.error("Game creation error:", error);
      alert("❌ Error creating game: " + (error.reason || error.message));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="container">
      <h3>🎮 Create New Game (Player 1)</h3>
      
      <div style={{ marginBottom: 10 }}>
        <label>
          <strong>Opponent Address:</strong>
          <input
            type="text"
            placeholder="0x..."
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <strong>Stake (ETH):</strong>
          <input
            type="text"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          <strong>Your Move:</strong>
          <select
            value={move}
            onChange={(e) => {
              setMove(Number(e.target.value));
              // Clear commitment when move changes
              setSalt("");
              setCommitment("");
            }}
            style={{ width: "100%", marginTop: 4 }}
          >
            {MOVES.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleGenerateSalt} disabled={isCreating}>
          🎲 Generate Salt & Commitment
        </button>
        
        {salt && (
          <button 
            onClick={handleDownloadSecret} 
            style={{ marginLeft: 8 }}
            disabled={isCreating}
          >
            💾 Download Secret
          </button>
        )}
      </div>

      {commitment && (
        <div style={{ marginTop: 12, padding: 10, background: "#f0f0f0", borderRadius: 6 }}>
          <div style={{ fontSize: 12, wordBreak: "break-all" }}>
            <strong>Commitment:</strong><br />
            {commitment}
          </div>
          <div style={{ marginTop: 8 }}>
            <button 
              onClick={handleCreateGame} 
              disabled={isCreating}
              style={{ 
                background: isCreating ? "#ccc" : "#4CAF50", 
                color: "white",
                fontWeight: "bold"
              }}
            >
              {isCreating ? "⏳ Creating..." : "🚀 Deploy Game Contract"}
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        ℹ️ Each game creates a new smart contract. Save your secret file!
      </div>
    </div>
  );
}