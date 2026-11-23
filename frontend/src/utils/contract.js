// contract.js — Connects React to MetaMask and the smart contract (v2).
//
// New in v2:
//   - issueCertificate now accepts fileHash + studentWallet
//   - verifyCertificate now returns fileHash + tokenId
//   - Analytics helper reads demo localStorage or blockchain events

import { ethers } from "ethers";
import {
  isDemoMode, DEMO_ADDRESS, fakeTxHash,
  saveCertificate, getCertificate, nextTokenId, getDemoStats
} from "./demoStore";

import CONTRACT_ABI from "../contract-abi.json";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

const NETWORKS = {
  31337: {
    chainIdHex       : "0x7a69",
    chainName        : "Hardhat Localhost",
    rpcUrls          : ["http://127.0.0.1:8545"],
    nativeCurrency   : { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: []
  },
  80002: {
    chainIdHex       : "0x13882",
    chainName        : "Polygon Amoy Testnet",
    rpcUrls          : ["https://rpc-amoy.polygon.technology"],
    nativeCurrency   : { name: "MATIC", symbol: "MATIC", decimals: 18 },
    blockExplorerUrls: ["https://amoy.polygonscan.com/"]
  },
  80001: {
    chainIdHex       : "0x13881",
    chainName        : "Polygon Mumbai Testnet",
    rpcUrls          : ["https://rpc-mumbai.maticvigil.com/"],
    nativeCurrency   : { name: "MATIC", symbol: "MATIC", decimals: 18 },
    blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
  }
};

const TARGET_CHAIN_ID = Number(process.env.REACT_APP_CHAIN_ID) || 31337;
const TARGET_NETWORK  = NETWORKS[TARGET_CHAIN_ID] || NETWORKS[31337];

const connectMetaMask = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install it from metamask.io.");
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("No wallet accounts found. Please unlock MetaMask.");
  }

  const userAddress = accounts[0];
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });

  if (currentChainId !== TARGET_NETWORK.chainIdHex) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TARGET_NETWORK.chainIdHex }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId          : TARGET_NETWORK.chainIdHex,
            chainName        : TARGET_NETWORK.chainName,
            nativeCurrency   : TARGET_NETWORK.nativeCurrency,
            rpcUrls          : TARGET_NETWORK.rpcUrls,
            blockExplorerUrls: TARGET_NETWORK.blockExplorerUrls
          }]
        });
      } else {
        throw new Error(`Network switch failed: ${switchError.message}`);
      }
    }
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer   = await provider.getSigner();
  return { provider, signer, address: userAddress };
};

const getContract = (signerOrProvider) => {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address missing. Set REACT_APP_CONTRACT_ADDRESS in .env.");
  }
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
};

// ---------------------------------------------------------------
// EXPORTED: issueCertificate
//
// Parameters:
//   studentName   → string
//   collegeName   → string
//   cid           → IPFS CID from uploadToIPFS()
//   certId        → unique certificate ID
//   fileHash      → SHA-256 hex hash of the PDF (from hashFile.js)
//   studentWallet → student's wallet address for NFT mint (optional)
//
// Returns: { txHash, certId, tokenId }
// ---------------------------------------------------------------
export const issueCertificate = async (
  studentName, collegeName, cid, certId,
  fileHash = "", studentWallet = ""
) => {
  if (!studentName || !collegeName || !cid || !certId) {
    throw new Error("studentName, collegeName, CID, and certId are all required.");
  }

  if (isDemoMode()) {
    if (getCertificate(certId)) {
      throw new Error(`Enrollment Number "${certId}" already exists.`);
    }
    const tokenId = nextTokenId();
    saveCertificate(certId, {
      studentName, collegeName, ipfsCID: cid,
      fileHash,
      issuedBy : DEMO_ADDRESS,
      issuedAt : Date.now(),
      isValid  : true,
      tokenId
    });
    const txHash = fakeTxHash();
    console.log(`🧪 [DEMO] Stored cert locally. Token #${tokenId}. Fake tx: ${txHash}`);
    return { txHash, certId, tokenId };
  }

  const { signer } = await connectMetaMask();
  const contract   = getContract(signer);

  try {
    const tx = await contract.issueCertificate(
      certId, studentName, collegeName, cid,
      fileHash,
      studentWallet || ethers.ZeroAddress
    );
    const receipt = await tx.wait();
    // Extract tokenId from CertificateIssued event
    const event   = receipt.logs
      .map((log) => { try { return contract.interface.parseLog(log); } catch (_) { return null; } })
      .find((e) => e?.name === "CertificateIssued");
    const tokenId = event ? Number(event.args.tokenId) : null;
    return { txHash: tx.hash, certId, tokenId };
  } catch (error) {
    if (error.code === "ACTION_REJECTED") {
      throw new Error("Transaction rejected in MetaMask.");
    } else if (error.message?.includes("not a whitelisted college")) {
      throw new Error("Your wallet is not whitelisted. Ask the contract owner to add it.");
    } else if (error.message?.includes("already exists")) {
      throw new Error(`Enrollment Number "${certId}" already exists on-chain.`);
    } else {
      throw new Error(`Failed to issue: ${error.message}`);
    }
  }
};

// ---------------------------------------------------------------
// EXPORTED: verifyCertificate
//
// Returns: { studentName, collegeName, ipfsCID, fileHash,
//            issuedBy, issuedAt, isValid, tokenId }
// ---------------------------------------------------------------
export const verifyCertificate = async (certId) => {
  if (!certId || !certId.trim()) {
    throw new Error("Certificate ID is required.");
  }

  if (isDemoMode()) {
    const found = getCertificate(certId.trim());
    if (!found) throw new Error(`No certificate found with ID: "${certId}".`);
    return {
      studentName : found.studentName,
      collegeName : found.collegeName,
      ipfsCID     : found.ipfsCID,
      fileHash    : found.fileHash  || "",
      issuedBy    : found.issuedBy,
      issuedAt    : new Date(found.issuedAt),
      isValid     : found.isValid,
      tokenId     : found.tokenId  || null
    };
  }

  let provider;
  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
  } else {
    provider = new ethers.JsonRpcProvider(TARGET_NETWORK.rpcUrls[0]);
  }

  const contract = getContract(provider);

  try {
    const result = await contract.verifyCertificate(certId.trim());
    return {
      studentName : result[0],
      collegeName : result[1],
      ipfsCID     : result[2],
      fileHash    : result[3],
      issuedBy    : result[4],
      issuedAt    : new Date(Number(result[5]) * 1000),
      isValid     : result[6],
      tokenId     : Number(result[7])
    };
  } catch (error) {
    if (error.message?.includes("No certificate found")) {
      throw new Error(`No certificate found with ID: "${certId}".`);
    }
    throw new Error(`Verification failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------
// EXPORTED: connectWallet
// ---------------------------------------------------------------
export const connectWallet = async () => {
  if (isDemoMode()) {
    console.log("🧪 [DEMO] Connected demo college wallet.");
    return { address: DEMO_ADDRESS };
  }
  const { address } = await connectMetaMask();
  return { address };
};

// ---------------------------------------------------------------
// EXPORTED: getAnalyticsData
// Returns stats for the Analytics dashboard.
// In demo mode: reads localStorage.
// In live mode: queries on-chain events (read from provider).
// ---------------------------------------------------------------
export const getAnalyticsData = async () => {
  // Always merge localStorage (batch certs) with on-chain events
  const localStats = getDemoStats();

  if (isDemoMode()) {
    return localStats;
  }

  // Live mode: query on-chain events, merge with localStorage batch certs
  let provider;
  try {
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      provider = new ethers.JsonRpcProvider(TARGET_NETWORK.rpcUrls[0]);
    }
  } catch (_) {
    return localStats;
  }

  try {
    const contract = getContract(provider);

    const [issuedLogs, revokedLogs] = await Promise.all([
      contract.queryFilter(contract.filters.CertificateIssued()),
      contract.queryFilter(contract.filters.CertificateRevoked())
    ]);

    // Guard: log.args can be undefined if ABI mismatch or malformed log
    const safeStr = (v) => (!v || typeof v === 'object') ? '' : String(v);
    const safeNum = (v) => (!v || typeof v === 'object') ? 0  : Number(v);

    const validIssued = issuedLogs.filter(l => l.args);

    const chainIssued  = validIssued.length;
    const chainRevoked = revokedLogs.filter(l => l.args).length;

    // Merge on-chain counts with localStorage counts
    const totalIssued  = chainIssued  + localStats.totalIssued;
    const totalRevoked = chainRevoked + localStats.totalRevoked;
    const activeCount  = totalIssued  - totalRevoked;

    // Build byCollege from both sources
    const byCollege = { ...localStats.byCollege };
    validIssued.forEach(log => {
      const name = safeStr(log.args.collegeName) || 'Unknown';
      byCollege[name] = (byCollege[name] || 0) + 1;
    });

    // Recent: chain events + local, sorted newest first, take 10
    const chainRecent = validIssued.slice(-10).reverse().map(log => ({
      certId      : safeStr(log.args.certId),
      studentName : safeStr(log.args.studentName),
      collegeName : safeStr(log.args.collegeName),
      issuedAt    : safeNum(log.args.issuedAt) * 1000,
      tokenId     : safeNum(log.args.tokenId),
    }));

    const recent = [...chainRecent, ...localStats.recent]
      .sort((a, b) => b.issuedAt - a.issuedAt)
      .slice(0, 10);

    return { totalIssued, totalRevoked, activeCount, byCollege, recent };
  } catch (_) {
    // If on-chain query fails for any reason, fall back to local data
    return localStats;
  }
};
