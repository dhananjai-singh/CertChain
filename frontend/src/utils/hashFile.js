// Compute a SHA-256 hash of a File object using the browser's built-in Web Crypto API.
// Returns a hex string prefixed with "0x", e.g. "0xabcdef12..."
// This is the SAME algorithm IPFS uses internally — now running in your browser code.
export const hashFileSHA256 = async (file) => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

// Compute SHA-256 of a plain string (used for batch mode where no PDF is uploaded).
export const hashTextSHA256 = async (text) => {
  const buffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
