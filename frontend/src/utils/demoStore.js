// demoStore.js — Local "Demo Mode" backend.
//
// When REACT_APP_DEMO_MODE === "true", the app simulates blockchain + IPFS
// entirely in the browser. Issued certificates live in localStorage.

const STORAGE_KEY        = "demo_certificates";
const TOKEN_COUNTER_KEY  = "demo_token_counter";

// In-memory map of fake CID -> object URL so "View on IPFS" can open the PDF.
const blobUrls = {};

export const isDemoMode = () => process.env.REACT_APP_DEMO_MODE === "true";

export const DEMO_ADDRESS = "0xC011e6eDem0Acc0000000000000000000001234aB";

// Build a CID-like string so the UI shows something realistic.
export const fakeCid = (file) => {
  const seed = `${file?.name || "file"}-${file?.size || 0}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const tail = hash.toString(36).padStart(8, "0");
  return `Qm${tail}DemoCid${tail}xxxxxxxxxxxxxxxxxxxx`.slice(0, 46);
};

export const rememberBlob = (cid, file) => {
  try { blobUrls[cid] = URL.createObjectURL(file); } catch (_) { /* ignore */ }
};

export const getBlobUrl = (cid) => blobUrls[cid] || null;

export const fakeTxHash = () =>
  "0x" + Array.from({ length: 64 }, () =>
    "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

// Auto-incrementing token ID (simulates ERC-721 token minting).
export const nextTokenId = () => {
  const n = parseInt(localStorage.getItem(TOKEN_COUNTER_KEY) || "0") + 1;
  localStorage.setItem(TOKEN_COUNTER_KEY, n.toString());
  return n;
};

// ---- localStorage-backed certificate store ----
const readAll = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch (_) { return {}; }
};

export const saveCertificate = (certId, data) => {
  const all = readAll();
  all[certId] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
};

export const getCertificate    = (certId) => readAll()[certId] || null;

// Returns all certs as an array, sorted newest first.
export const getAllCertificates = () =>
  Object.entries(readAll())
    .map(([certId, data]) => ({ certId, ...data }))
    .sort((a, b) => b.issuedAt - a.issuedAt);

// Aggregate stats for the Analytics dashboard.
export const getDemoStats = () => {
  const all = getAllCertificates();
  const totalIssued  = all.length;
  const totalRevoked = all.filter((c) => !c.isValid).length;
  const activeCount  = totalIssued - totalRevoked;

  const byCollege = all.reduce((acc, c) => {
    const name = c.collegeName || "Unknown";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return { totalIssued, totalRevoked, activeCount, byCollege, recent: all.slice(0, 10) };
};
