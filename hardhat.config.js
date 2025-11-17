require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.4.26",
  networks: {
    hardhat: {
      chainId: 1337  // Changed from 31337
    }
  }
};