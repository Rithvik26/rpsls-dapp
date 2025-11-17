import React, { useState, useEffect } from "react";
import { CONTRACT_ABI } from "../utils/contractABI";
import { uiMoveToContract, parseEth, formatEth } from "../utils/hashHelpers";
import { ethers } from "ethers";

const MOVES = ["Rock", "Paper", "Scissors", "Spock", "Lizard"];

export default function GameJoin({ provider }) {
  const [contractAddress, setContractAddress] = useState("");
  const [move, setMove] = useState(0); // UI index 0-4
  const [isJoining, setIsJoining] = useState(false);
  const [gameInfo, setGameInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load game info from contract
   */
  async function loadGameInfo() {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      setGameInfo(null);
      return;
    }

    try {
      setIsLoading(true);
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

      const [j1, j2, stake, c2, lastAction] = await Promise.all([
        contract.j1(),
        contract.j2(),
        contract.stake(),
        contract.c2(),
        contract.lastAction()
      ]);

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Check if j2 has already played
      const hasPlayed = Number(c2) !== 0;

      setGameInfo({
        j1,
        j2,
        stake: formatEth(stake),
        c2: Number(c2),
        hasPlayed,
        lastAction: Number(lastAction),
        isJ2: signerAddress.toLowerCase() === j2.toLowerCase()
      });

    } catch (error) {
      console.error("Error loading game info:", error);
      setGameInfo(null);
      alert("⚠️ Could not load game info. Check contract address.");
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Join game by calling play() with stake
   */
  async function handleJoinGame() {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      alert("⚠️ Please enter a valid contract address!");
      return;
    }

    if (!gameInfo) {
      alert("⚠️ Load game info first!");
      return;
    }

    if (gameInfo.hasPlayed) {
      alert("⚠️ Player 2 has already played!");
      return;
    }

    if (!gameInfo.isJ2) {
      alert("⚠️ You are not player 2 of this game!");
      return;
    }

    try {
      setIsJoining(true);

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

      // Convert UI move (0-4) to contract move (1-5)
      const contractMove = uiMoveToContract(move);
      const stakeAmount = parseEth(gameInfo.stake);

      console.log("Joining game...");
      console.log("Contract:", contractAddress);
      console.log("Move:", MOVES[move], "(", contractMove, ")");
      console.log("Stake:", gameInfo.stake, "ETH");

      // Call play(uint8 _c2) payable
      const tx = await contract.play(contractMove, {
        value: stakeAmount,
        gasLimit: 200000
      });

      console.log("Transaction sent:", tx.hash);
      alert(`⏳ Joining game...\nTx: ${tx.hash}`);

      await tx.wait();
      console.log("✅ Transaction confirmed!");

      // Save to localStorage
      const joinData = {
        contractAddress,
        move: contractMove,
        moveName: MOVES[move],
        stake: gameInfo.stake,
        joinedAt: new Date().toISOString(),
        txHash: tx.hash
      };
      const joins = JSON.parse(localStorage.getItem("rps_joins") || "[]");
      joins.push(joinData);
      localStorage.setItem("rps_joins", JSON.stringify(joins));

      alert(
        `✅ Game Joined!\n\n` +
        `Your move: ${MOVES[move]}\n` +
        `Stake: ${gameInfo.stake} ETH\n\n` +
        `Now Player 1 must reveal their move!`
      );

      // Reload game info
      await loadGameInfo();

    } catch (error) {
      console.error("Join error:", error);
      alert("❌ Error joining game: " + (error.reason || error.message));
    } finally {
      setIsJoining(false);
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
      .map((g, i) => `${i + 1}. ${g.contractAddress}\n   Created: ${g.createdAt}`)
      .join("\n\n");

    alert(`📋 Saved Games:\n\n${gameList}`);
  }

  return (
    <div className="container">
      <h3>🎯 Join Game (Player 2)</h3>

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
          <button onClick={loadGameInfo} disabled={isLoading} style={{ fontSize: 12 }}>
            {isLoading ? "⏳ Loading..." : "🔍 Load Game Info"}
          </button>
          <button onClick={loadSavedGames} style={{ marginLeft: 8, fontSize: 12 }}>
            📋 Show Saved Games
          </button>
        </div>
      </div>

      {gameInfo && (
        <div style={{ padding: 10, background: "#f0f0f0", borderRadius: 6, marginBottom: 10 }}>
          <div style={{ fontSize: 12 }}>
            <strong>Game Info:</strong><br />
            Player 1: {gameInfo.j1.substring(0, 10)}...<br />
            Player 2: {gameInfo.j2.substring(0, 10)}...<br />
            Stake: {gameInfo.stake} ETH<br />
            Status: {gameInfo.hasPlayed ? "✅ P2 played" : "⏳ Waiting for P2"}
          </div>
          {!gameInfo.isJ2 && (
            <div style={{ color: "red", marginTop: 4, fontSize: 12 }}>
              ⚠️ You are not Player 2 of this game!
            </div>
          )}
          {gameInfo.hasPlayed && (
            <div style={{ color: "green", marginTop: 4, fontSize: 12 }}>
              ✅ Player 2 has already played! Waiting for P1 to reveal.
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label>
          <strong>Your Move:</strong>
          <select
            value={move}
            onChange={(e) => setMove(Number(e.target.value))}
            style={{ width: "100%", marginTop: 4 }}
            disabled={!gameInfo || gameInfo.hasPlayed}
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
        <button
          onClick={handleJoinGame}
          disabled={isJoining || !gameInfo || gameInfo.hasPlayed || !gameInfo.isJ2}
          style={{
            background: isJoining ? "#ccc" : "#2196F3",
            color: "white",
            fontWeight: "bold"
          }}
        >
          {isJoining ? "⏳ Joining..." : "🎯 Join Game (Pay Stake)"}
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        ℹ️ You must be Player 2 to join. You'll pay the stake amount.
      </div>
    </div>
  );
}