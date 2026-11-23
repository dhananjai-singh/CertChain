// ============================================================
// Load environment variables from the .env file.
// This lets us safely use secrets like PRIVATE_KEY and RPC_URL
// without hardcoding them into the code.
// You'll create the .env file separately — never commit it to Git!
// ============================================================
require("dotenv").config();

// ============================================================
// Import the Hardhat Toolbox plugin.
// This gives us useful features like:
//   - Contract compilation
//   - Testing with Mocha/Chai
//   - Gas usage reports
//   - Etherscan/Polygonscan verification support
// ============================================================
require("@nomicfoundation/hardhat-toolbox");

// ============================================================
// Pull our secrets from the .env file into variables.
// If these are missing, we fall back to empty strings
// (the deploy will fail safely rather than crash weirdly).
// ============================================================
const MUMBAI_RPC_URL  = process.env.MUMBAI_RPC_URL  || "";
const PRIVATE_KEY     = process.env.PRIVATE_KEY      || "";
const POLYGONSCAN_KEY = process.env.POLYGONSCAN_KEY  || "";

// Only treat PRIVATE_KEY as a real account if it's a valid 32-byte hex key.
// This lets `npx hardhat compile` and local testing work even while .env
// still holds the placeholder value (avoids the "private key too short" error).
const isValidKey = /^0x[0-9a-fA-F]{64}$/.test(
  PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`
);
const ACCOUNTS = isValidKey
  ? [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`]
  : [];

// ============================================================
// Main Hardhat configuration export.
// Everything Hardhat needs to know lives inside this object.
// ============================================================
module.exports = {

  // ----------------------------------------------------------
  // SOLIDITY COMPILER SETTINGS
  // Must match (or be compatible with) the pragma in your .sol file.
  // We also enable the optimizer to reduce gas costs on deployment.
  // ----------------------------------------------------------
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,   // Turns on bytecode optimization
        runs: 200        // 200 is the standard balance between
                         // deploy cost and runtime call cost
      }
    }
  },

  // ----------------------------------------------------------
  // NETWORK DEFINITIONS
  // We define two networks:
  //   1. hardhat  → local in-memory blockchain for quick testing
  //   2. mumbai   → Polygon Mumbai public testnet for real deployment
  // ----------------------------------------------------------
  networks: {

    // Local Hardhat network — spins up automatically when you run tests.
    // No setup needed, it resets every time.
    hardhat: {
      chainId: 31337   // Standard local Hardhat chain ID
    },

    // Polygon Mumbai Testnet — the original project target (Chain ID 80001).
    // NOTE: Polygon sunset Mumbai in 2024, so its faucets/RPCs are offline.
    // Kept here for reference; use `amoy` or `localhost` for live demos.
    mumbai: {
      url: MUMBAI_RPC_URL,                         // RPC endpoint (from Alchemy or Infura)
      accounts: ACCOUNTS,  // Wallet key (empty = safe for compile)
      chainId: 80001                               // Official Chain ID for Polygon Mumbai
    },

    // Polygon Amoy Testnet — Mumbai's live replacement (Chain ID 80002).
    // Use this for an actual on-chain testnet deployment in the final phase.
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: ACCOUNTS,
      chainId: 80002
    }
  },

  // ----------------------------------------------------------
  // ETHERSCAN / POLYGONSCAN VERIFICATION
  // After deploying, you can verify your contract source code
  // on Polygonscan so anyone can read it publicly.
  // Run: npx hardhat verify --network mumbai <CONTRACT_ADDRESS>
  // ----------------------------------------------------------
  etherscan: {
    apiKey: {
      polygonMumbai: POLYGONSCAN_KEY   // API key from polygonscan.com
    }
  },

  // ----------------------------------------------------------
  // PATHS (optional but explicit is better)
  // Tells Hardhat where to find/store project files.
  // ----------------------------------------------------------
  paths: {
    sources:   "./contracts",   // Where .sol files live
    tests:     "./test",        // Where test files live
    cache:     "./cache",       // Hardhat's internal cache
    artifacts: "./artifacts"    // Compiled contract output (ABI + bytecode)
  }

};
