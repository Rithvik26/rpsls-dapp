import React, { useState } from "react";
import WalletConnect from "./components/WalletConnect";
import GameCreation from "./components/GameCreation";
import GameJoin from "./components/GameJoin";
import GameReveal from "./components/GameReveal";
import GameStatus from "./components/GameStatus";
import "./App.css";

export default function App() {
  const [provider, setProvider] = useState(null);
  const [currentGameAddress, setCurrentGameAddress] = useState("");

  function handleGameCreated(contractAddress) {
    setCurrentGameAddress(contractAddress);
    console.log("New game created:", contractAddress);
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "#333" }}>
          🎮 Rock Paper Scissors Lizard Spock
        </h1>
        <p style={{ color: "#666", fontSize: 14, margin: "8px 0 0 0" }}>
          Decentralized Game on Ethereum - Kleros Recruitment Exercise
        </p>
      </div>

      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <WalletConnect onConnected={(prov) => setProvider(prov)} />
      </div>

      {!provider && (
        <div style={{ textAlign: "center", padding: 40, background: "#f8f9fa", borderRadius: 8 }}>
          <p style={{ fontSize: 16, color: "#666" }}>
            👆 Connect your MetaMask wallet to start playing
          </p>
        </div>
      )}

      {provider && (
        <>
          {currentGameAddress && (
            <div
              style={{
                padding: 12,
                background: "#e7f3ff",
                borderRadius: 6,
                marginBottom: 16,
                textAlign: "center"
              }}
            >
              <strong>Latest Game:</strong>{" "}
              <span style={{ fontFamily: "monospace", fontSize: 13 }}>{currentGameAddress}</span>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
              marginBottom: 16
            }}
          >
            <GameCreation provider={provider} onGameCreated={handleGameCreated} />
            <GameJoin provider={provider} />
            <GameReveal provider={provider} />
          </div>

          <div style={{ marginTop: 16 }}>
            <GameStatus provider={provider} />
          </div>

          <div
            style={{
              marginTop: 24,
              padding: 16,
              background: "#f8f9fa",
              borderRadius: 8,
              fontSize: 13
            }}
          >
            <h4 style={{ marginTop: 0 }}>📖 How to Play</h4>
            <ol style={{ lineHeight: 1.8, paddingLeft: 20 }}>
              <li>
                <strong>Player 1 (Create):</strong> Choose your move, generate salt, download secret
                file, and deploy a new game contract with your stake.
              </li>
              <li>
                <strong>Player 2 (Join):</strong> Enter the game contract address, choose your move,
                and send your stake to join.
              </li>
              <li>
                <strong>Player 1 (Reveal):</strong> Upload your secret file (or load from
                localStorage) and reveal your move to determine the winner.
              </li>
              <li>
                <strong>Both Players:</strong> Monitor game status and claim timeout wins if opponent
                doesn't respond within 5 minutes.
              </li>
            </ol>

            <h4>🎯 Game Rules</h4>
            <ul style={{ lineHeight: 1.8, paddingLeft: 20 }}>
              <li>Rock crushes Scissors and Lizard</li>
              <li>Paper covers Rock and disproves Spock</li>
              <li>Scissors cuts Paper and decapitates Lizard</li>
              <li>Spock vaporizes Rock and smashes Scissors</li>
              <li>Lizard eats Paper and poisons Spock</li>
            </ul>

            <h4>⚠️ Important Notes</h4>
            <ul style={{ lineHeight: 1.8, paddingLeft: 20 }}>
              <li>
                Each game creates a <strong>new smart contract</strong> - this is not a factory
                pattern
              </li>
              <li>
                <strong>Save your secret file!</strong> You cannot reveal without it
              </li>
              <li>Secrets are also backed up to localStorage automatically</li>
              <li>5-minute timeout protection for both players</li>
              <li>Winner receives both stakes (tie returns stakes)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}