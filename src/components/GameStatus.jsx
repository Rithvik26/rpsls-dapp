import React, { useState } from "react";
import { CONTRACT_ABI } from "../utils/contractABI";
import { formatEth } from "../utils/hashHelpers";
import { ethers } from "ethers";

const MOVES = ["Null", "Rock", "Paper", "Scissors", "Spock", "Lizard"];
const TIMEOUT_MINUTES = 5;

export default function GameStatus({ provider }) {
  const [contractAddress, setContractAddress] = useState("");
  const [gameState, setGameState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCallingTimeout, setIsCallingTimeout] = useState(false);

  /**
   * Load complete game state from contract
   */
  async function loadGameState() {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      alert("⚠️ Please enter a valid contract address!");
      return;
    }

    try {
      setIsLoading(true);
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

      const [j1, j2, c1Hash, c2, stake, lastAction, timeout] = await Promise.all([
        contract.j1(),
        contract.j2(),
        contract.c1Hash(),
        contract.c2(),
        contract.stake(),
        contract.lastAction(),
        contract.TIMEOUT()
      ]);

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      const c2Number = Number(c2);
      const stakeNumber = BigInt(stake);
      const lastActionNumber = Number(lastAction);
      const timeoutSeconds = Number(timeout);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeSinceLastAction = currentTime - lastActionNumber;
      const isTimedOut = timeSinceLastAction > timeoutSeconds;

      // Determine game phase
      let phase = "Unknown";
      let canTimeout = false;
      let timeoutFunction = null;

      if (stakeNumber === 0n) {
        phase = "Game Completed (stake withdrawn)";
      } else if (c2Number === 0) {
        phase = "Waiting for Player 2 to join";
        if (isTimedOut) {
          canTimeout = true;
          timeoutFunction = "j2Timeout"; // j1 can claim timeout
        }
      } else {
        phase = "Player 2 joined, waiting for Player 1 to reveal";
        if (isTimedOut) {
          canTimeout = true;
          timeoutFunction = "j1Timeout"; // j2 can claim timeout
        }
      }

      const state = {
        j1,
        j2,
        c1Hash,
        c2: c2Number,
        c2Name: MOVES[c2Number] || "Not played",
        stake: formatEth(stakeNumber),
        stakeWei: stakeNumber,
        lastAction: lastActionNumber,
        lastActionDate: new Date(lastActionNumber * 1000).toLocaleString(),
        timeout: timeoutSeconds,
        timeSinceLastAction,
        isTimedOut,
        canTimeout,
        timeoutFunction,
        phase,
        isJ1: signerAddress.toLowerCase() === j1.toLowerCase(),
        isJ2: signerAddress.toLowerCase() === j2.toLowerCase(),
        userAddress: signerAddress
      };

      setGameState(state);
      console.log("Game state loaded:", state);

    } catch (error) {
      console.error("Error loading game state:", error);
      alert("❌ Error loading game state: " + error.message);
      setGameState(null);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Call timeout function (j1Timeout or j2Timeout)
   */
  async function callTimeout() {
    if (!gameState || !gameState.canTimeout) {
      alert("⚠️ Cannot call timeout!");
      return;
    }

    try {
      setIsCallingTimeout(true);

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

      console.log(`Calling ${gameState.timeoutFunction}...`);

      let tx;
      if (gameState.timeoutFunction === "j1Timeout") {
        // j2 calls this to claim win if j1 didn't reveal
        if (!gameState.isJ2) {
          alert("⚠️ Only Player 2 can call j1Timeout!");
          setIsCallingTimeout(false);
          return;
        }
        tx = await contract.j1Timeout({ gasLimit: 150000 });
      } else if (gameState.timeoutFunction === "j2Timeout") {
        // j1 calls this to reclaim stake if j2 didn't join
        if (!gameState.isJ1) {
          alert("⚠️ Only Player 1 can call j2Timeout!");
          setIsCallingTimeout(false);
          return;
        }
        tx = await contract.j2Timeout({ gasLimit: 150000 });
      }

      console.log("Transaction sent:", tx.hash);
      alert(`⏳ Calling timeout...\nTx: ${tx.hash}`);

      await tx.wait();
      console.log("✅ Timeout claimed!");

      alert(
        `✅ Timeout Claimed!\n\n` +
        `You should have received ${gameState.stake} ETH (or 2x if winner).\n` +
        `Transaction: ${tx.hash}`
      );

      // Reload game state
      await loadGameState();

    } catch (error) {
      console.error("Timeout error:", error);
      alert("❌ Timeout call failed: " + (error.reason || error.message));
    } finally {
      setIsCallingTimeout(false);
    }
  }

  /**
   * Check who won (if game is complete)
   */
  function analyzeWinner() {
    if (!gameState) return null;

    // If stake is 0, game is over
    if (gameState.stakeWei === 0n) {
      return "Game completed - stake withdrawn";
    }

    return null;
  }

  return (
    <div className="container">
      <h3>📊 Game Status & Timeouts</h3>

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
          <button onClick={loadGameState} disabled={isLoading}>
            {isLoading ? "⏳ Loading..." : "🔍 Load Game State"}
          </button>
        </div>
      </div>

      {gameState && (
        <div style={{ marginTop: 12 }}>
          <div style={{ padding: 10, background: "#f0f0f0", borderRadius: 6, marginBottom: 10 }}>
            <h4 style={{ marginTop: 0 }}>Game Info</h4>
            <div style={{ fontSize: 13, fontFamily: "monospace" }}>
              <div><strong>Phase:</strong> {gameState.phase}</div>
              <div><strong>Player 1:</strong> {gameState.j1}</div>
              <div><strong>Player 2:</strong> {gameState.j2}</div>
              <div><strong>Stake:</strong> {gameState.stake} ETH</div>
              <div><strong>P1 Commitment:</strong> {gameState.c1Hash}</div>
              <div><strong>P2 Move:</strong> {gameState.c2Name}</div>
              <div><strong>Last Action:</strong> {gameState.lastActionDate}</div>
              <div>
                <strong>Time Since Last Action:</strong>{" "}
                {Math.floor(gameState.timeSinceLastAction / 60)} minutes
              </div>
              <div>
                <strong>Timeout Period:</strong> {TIMEOUT_MINUTES} minutes
              </div>
            </div>

            {gameState.isJ1 && (
              <div style={{ marginTop: 8, color: "blue", fontSize: 12 }}>
                ℹ️ You are Player 1
              </div>
            )}
            {gameState.isJ2 && (
              <div style={{ marginTop: 8, color: "green", fontSize: 12 }}>
                ℹ️ You are Player 2
              </div>
            )}
          </div>

          {gameState.canTimeout && (
            <div style={{ padding: 10, background: "#fff3cd", borderRadius: 6, marginBottom: 10 }}>
              <h4 style={{ marginTop: 0, color: "#856404" }}>⏰ Timeout Available!</h4>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                The opponent has exceeded the {TIMEOUT_MINUTES}-minute timeout period. You can claim
                the stake.
              </div>
              <div>
                <button
                  onClick={callTimeout}
                  disabled={isCallingTimeout}
                  style={{
                    background: isCallingTimeout ? "#ccc" : "#ffc107",
                    color: "#000",
                    fontWeight: "bold"
                  }}
                >
                  {isCallingTimeout ? "⏳ Claiming..." : "⏰ Claim Timeout Win"}
                </button>
              </div>
              <div style={{ fontSize: 11, marginTop: 8, color: "#666" }}>
                Function: {gameState.timeoutFunction}
              </div>
            </div>
          )}

          {!gameState.canTimeout && gameState.stakeWei > 0n && (
            <div style={{ padding: 10, background: "#d4edda", borderRadius: 6 }}>
              <div style={{ fontSize: 13, color: "#155724" }}>
                ✅ Game is active. No timeout yet.
              </div>
            </div>
          )}

          {gameState.stakeWei === 0n && (
            <div style={{ padding: 10, background: "#d1ecf1", borderRadius: 6 }}>
              <div style={{ fontSize: 13, color: "#0c5460" }}>
                🏁 Game completed! Stakes have been distributed.
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        ℹ️ Monitor game progress and claim timeout wins if opponent doesn't respond within{" "}
        {TIMEOUT_MINUTES} minutes.
      </div>
    </div>
  );
}