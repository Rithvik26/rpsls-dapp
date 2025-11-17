import { ethers } from "ethers";

/**
 * Generate a cryptographically secure 256-bit salt
 * Returns a hex string (32 bytes = 256 bits)
 */
export function generateSalt() {
  const randomBytes = ethers.randomBytes(32);
  return ethers.hexlify(randomBytes);
}

/**
 * Create commitment hash matching RPS.sol's keccak256(uint8, uint256)
 * 
 * RPS.sol expects: keccak256(_c1, _salt)
 * Where _c1 is Move enum (uint8) and _salt is uint256
 * 
 * IMPORTANT: Move values are 1-5 (not 0-4):
 * - Null = 0 (invalid)
 * - Rock = 1
 * - Paper = 2
 * - Scissors = 3
 * - Spock = 4
 * - Lizard = 5
 * 
 * @param {number} moveIndex - The move (1-5, NOT 0-4)
 * @param {string} saltHex - The 256-bit salt as hex string
 * @returns {string} - The keccak256 hash as hex string
 */
export function createCommitment(moveIndex, saltHex) {
  // Validate move is in valid range
  if (moveIndex < 1 || moveIndex > 5) {
    throw new Error("Move must be 1-5 (Rock, Paper, Scissors, Spock, Lizard)");
  }

  // Ensure salt is properly formatted
  let salt = saltHex;
  if (!salt.startsWith("0x")) {
    salt = "0x" + salt;
  }

  // Convert salt hex to uint256 (remove 0x, pad to 64 chars if needed)
  const saltClean = salt.slice(2).padStart(64, "0");
  const saltBigInt = BigInt("0x" + saltClean);

  // Encode as Solidity would: abi.encode(uint8, uint256)
  // In Solidity 0.4.26, keccak256(a, b) does packed encoding
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abiCoder.encode(
    ["uint8", "uint256"],
    [moveIndex, saltBigInt]
  );

  return ethers.keccak256(encoded);
}

/**
 * Convert UI move index (0-4) to contract Move enum (1-5)
 * UI: Rock=0, Paper=1, Scissors=2, Spock=3, Lizard=4
 * Contract: Rock=1, Paper=2, Scissors=3, Spock=4, Lizard=5
 */
export function uiMoveToContract(uiMove) {
  return uiMove + 1;
}

/**
 * Convert contract Move enum (1-5) to UI index (0-4)
 */
export function contractMoveToUI(contractMove) {
  return contractMove - 1;
}

/**
 * Get move name from UI index
 */
export function getMoveName(uiMove) {
  const moves = ["Rock", "Paper", "Scissors", "Spock", "Lizard"];
  return moves[uiMove] || "Unknown";
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Format ETH amount for display
 */
export function formatEth(weiAmount) {
  try {
    return ethers.formatEther(weiAmount);
  } catch {
    return "0";
  }
}

/**
 * Parse ETH amount from user input
 */
export function parseEth(ethAmount) {
  try {
    return ethers.parseEther(ethAmount);
  } catch {
    throw new Error("Invalid ETH amount");
  }
}