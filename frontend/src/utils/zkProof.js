// zkProof.js — Zero-Knowledge Selective Disclosure using SHA-256 commitments.
//
// Cryptographic scheme: Hash commitments
//
//   C(field, value) = SHA-256( field + ":" + value + "||" + nonce )
//
//   The nonce is a 32-byte random secret held only by the prover (student).
//   Commitments are public — they can be stored on-chain.
//
// Three disclosure modes per attribute:
//   hidden   — verifier sees only the commitment; learns nothing about the value
//   reveal   — prover opens the commitment: reveals (value, nonce)
//              verifier checks: SHA256(field:value||nonce) == C  ✓
//   range    — prover reveals (value, nonce); verifier checks commitment AND value op threshold
//              UI shows only "CGPA ≥ 8.5 ✅" — hides the exact number in the display
//
// Note: a production ZK range proof (Bulletproof / Groth16) would not reveal
// the exact value even in the proof data. This implementation reveals it for
// pedagogical clarity while demonstrating the commitment and selectivity mechanics.

const STORAGE_PREFIX = 'zk_key_';

export const ATTRIBUTE_LABELS = {
  name    : 'Full Name',
  college : 'College',
  degree  : 'Degree Programme',
  cgpa    : 'CGPA (0–10)',
  gradYear: 'Graduation Year',
};

export const ATTRIBUTE_FIELDS  = ['name', 'college', 'degree', 'cgpa', 'gradYear'];
export const RANGE_FIELDS       = new Set(['cgpa', 'gradYear']);

// ---- Crypto helpers --------------------------------------------------------

const randomNonce = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return '0x' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

const sha256Hex = async (text) => {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return '0x' + Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');
};

const computeCommitment = (field, value, nonce) =>
  sha256Hex(`${field}:${String(value)}||${nonce}`);

const compare = (value, op, threshold) => {
  const v = Number(value), t = Number(threshold);
  if (op === '>')  return v > t;
  if (op === '>=') return v >= t;
  if (op === '<')  return v < t;
  if (op === '<=') return v <= t;
  return String(value) === String(threshold);
};

// ---- Public API ------------------------------------------------------------

// Generate a commitment for every attribute.
// Returns { commitments, nonces } — nonces are private, commitments are public.
export const generateZKAttributes = async (attributes) => {
  const nonces = {}, commitments = {};
  for (const [field, value] of Object.entries(attributes)) {
    nonces[field] = randomNonce();
    commitments[field] = await computeCommitment(field, value, nonces[field]);
  }
  return { commitments, nonces };
};

// Persist the ZK key (attributes + nonces + commitments) in localStorage.
// In production this would live in the student's wallet / secure enclave.
export const saveZKKey = (certId, attributes, nonces, commitments) =>
  localStorage.setItem(
    STORAGE_PREFIX + certId,
    JSON.stringify({ attributes, nonces, commitments, savedAt: Date.now() })
  );

export const loadZKKey = (certId) => {
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + certId)); }
  catch { return null; }
};

// Generate a selective disclosure proof.
//
//   disclosureConfig = {
//     reveal     : ['college'],
//     rangeClaims: [{ field: 'cgpa', op: '>=', threshold: 8.5 }]
//   }
export const generateSelectiveProof = async (
  certId, attributes, nonces, commitments, disclosureConfig
) => {
  const revealSet   = new Set(disclosureConfig.reveal || []);
  const rangeCfgMap = Object.fromEntries(
    (disclosureConfig.rangeClaims || []).map(r => [r.field, r])
  );

  const proof = {
    version: '1',
    certId,
    generatedAt: Date.now(),
    commitments,
    disclosures : {},
    rangeClaims : {},
    hiddenFields: [],
  };

  for (const [field, value] of Object.entries(attributes)) {
    if (revealSet.has(field)) {
      proof.disclosures[field] = { value, nonce: nonces[field] };
    } else if (rangeCfgMap[field]) {
      const cfg = rangeCfgMap[field];
      proof.rangeClaims[field] = {
        op: cfg.op, threshold: cfg.threshold,
        value: Number(value), nonce: nonces[field],
      };
    } else {
      proof.hiddenFields.push(field);
    }
  }

  return proof;
};

// Verify a selective disclosure proof.
// Returns { valid, results } where results is a map field → result object.
export const verifySelectiveProof = async (proof) => {
  const results = {};
  let allValid = true;

  // Full disclosures — open the commitment
  for (const [field, disc] of Object.entries(proof.disclosures)) {
    const expected = proof.commitments[field];
    const actual   = await computeCommitment(field, disc.value, disc.nonce);
    const valid = actual.toLowerCase() === expected.toLowerCase();
    results[field] = { type: 'disclosed', value: disc.value, valid };
    if (!valid) allValid = false;
  }

  // Range claims — verify commitment AND threshold
  for (const [field, claim] of Object.entries(proof.rangeClaims)) {
    const expected     = proof.commitments[field];
    const actual       = await computeCommitment(field, claim.value, claim.nonce);
    const commitmentOk = actual.toLowerCase() === expected.toLowerCase();
    const rangeOk      = compare(claim.value, claim.op, claim.threshold);
    const valid = commitmentOk && rangeOk;
    results[field] = {
      type: 'range',
      claim: `${ATTRIBUTE_LABELS[field] || field} ${claim.op} ${claim.threshold}`,
      value: claim.value,
      satisfied: rangeOk,
      commitmentValid: commitmentOk,
      valid,
    };
    if (!valid) allValid = false;
  }

  // Hidden fields — only the commitment is known
  for (const field of proof.hiddenFields) {
    results[field] = { type: 'hidden', commitment: proof.commitments[field] };
  }

  return { valid: allValid, results };
};

// Encode proof as URL-safe base64
export const encodeProof = (proof) =>
  btoa(JSON.stringify(proof))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Decode URL-safe base64 proof
export const decodeProof = (str) => {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4
      ? padded + '='.repeat(4 - (padded.length % 4)) : padded;
    return JSON.parse(atob(pad));
  } catch { return null; }
};
