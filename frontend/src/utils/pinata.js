// ============================================================
// pinata.js — Utility for uploading PDF files to IPFS via Pinata
//
// What this file does:
//   1. Takes a PDF file object from the React UI
//   2. Sends it to Pinata's pinFileToIPFS API endpoint
//   3. Returns the IPFS CID (hash) of the uploaded file
//
// The CID returned here is what gets stored on the blockchain
// when a college issues a certificate.
// ============================================================

import axios from "axios";
import { isDemoMode, fakeCid, rememberBlob, getBlobUrl } from "./demoStore";

// ============================================================
// PINATA API CREDENTIALS
// These are loaded from your .env file in the frontend folder.
// Create a file at: certificate-verification/frontend/.env
// and add your Pinata API keys there.
//
// NEVER hardcode these keys directly in the code.
// NEVER commit the .env file to Git.
// ============================================================
const PINATA_API_KEY        = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_API_SECRET     = process.env.REACT_APP_PINATA_API_SECRET;

// ============================================================
// Pinata's API endpoint for uploading files to IPFS.
// This is a standard Pinata endpoint — no need to change it.
// ============================================================
const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

// ============================================================
// MAIN FUNCTION: uploadToIPFS
//
// Parameters:
//   file → A File object (the PDF selected by the user in the UI)
//
// Returns:
//   A string — the IPFS CID of the uploaded file
//   e.g. "QmXyz123abc..."
//
// Throws:
//   An error if the upload fails (network issue, bad API key, etc.)
// ============================================================
export const uploadToIPFS = async (file) => {

  // ----------------------------------------------------------
  // STEP 1: Validate that a file was actually passed in.
  // Better to catch this early than get a confusing API error.
  // ----------------------------------------------------------
  if (!file) {
    throw new Error("No file provided. Please select a PDF to upload.");
  }

  // ----------------------------------------------------------
  // STEP 2: Validate that the file is a PDF.
  // We only want PDF files for certificate storage.
  // file.type gives us the MIME type e.g. "application/pdf"
  // ----------------------------------------------------------
  if (file.type !== "application/pdf") {
    throw new Error("Invalid file type. Only PDF files are accepted.");
  }

  // ----------------------------------------------------------
  // DEMO MODE: skip the real Pinata upload. Return a CID-like
  // string and keep an in-memory URL so the file can still be
  // previewed during the walkthrough. No network call, no keys.
  // ----------------------------------------------------------
  if (isDemoMode()) {
    const cid = fakeCid(file);
    rememberBlob(cid, file);
    console.log(`🧪 [DEMO] Skipped real IPFS upload. Fake CID: ${cid}`);
    return cid;
  }

  // ----------------------------------------------------------
  // STEP 3: Validate that API credentials are available.
  // If the .env file is missing or keys are wrong, fail early
  // with a clear message rather than a mysterious API error.
  // ----------------------------------------------------------
  if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    throw new Error(
      "Pinata API credentials are missing. Check your frontend .env file."
    );
  }

  // ----------------------------------------------------------
  // STEP 4: Build the FormData payload.
  // Pinata's API expects a multipart/form-data request.
  // FormData is the browser's built-in way to package files
  // for multipart uploads — works exactly like an HTML form.
  // ----------------------------------------------------------
  const formData = new FormData();

  // Append the actual PDF file under the key "file"
  formData.append("file", file);

  // ----------------------------------------------------------
  // STEP 5: Add optional Pinata metadata.
  // This gives the file a readable name inside your Pinata
  // dashboard instead of showing just a raw hash.
  // pinataOptions sets wrapWithDirectory to false so the CID
  // points directly to the file, not a folder wrapping it.
  // ----------------------------------------------------------
  const metadata = JSON.stringify({
    name: `certificate_${file.name}_${Date.now()}`,  // Unique readable name
    keyvalues: {
      uploadedAt : new Date().toISOString(),
      fileType   : "certificate-pdf"
    }
  });
  formData.append("pinataMetadata", metadata);

  const pinataOptions = JSON.stringify({
    wrapWithDirectory: false   // CID points directly to the file
  });
  formData.append("pinataOptions", pinataOptions);

  // ----------------------------------------------------------
  // STEP 6: Send the POST request to Pinata's API.
  // We pass the API key and secret in the request headers.
  // axios handles the multipart/form-data Content-Type
  // automatically when we pass a FormData object.
  // ----------------------------------------------------------
  try {
    console.log("📤 Uploading PDF to IPFS via Pinata...");

    const response = await axios.post(PINATA_UPLOAD_URL, formData, {
      headers: {
        "pinata_api_key"        : PINATA_API_KEY,
        "pinata_secret_api_key" : PINATA_API_SECRET,
        // Note: Do NOT manually set Content-Type here.
        // axios sets it automatically with the correct boundary
        // for multipart/form-data when FormData is used.
      },
      // ----------------------------------------------------------
      // Optional: Track upload progress for large PDF files.
      // You can use this to show a progress bar in the UI later.
      // ----------------------------------------------------------
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`  Upload progress: ${percent}%`);
      }
    });

    // ----------------------------------------------------------
    // STEP 7: Extract and return the CID from the response.
    // Pinata returns a JSON object where IpfsHash is the CID.
    // Example response:
    // {
    //   IpfsHash: "QmXyz123abc...",
    //   PinSize: 204800,
    //   Timestamp: "2024-01-01T00:00:00.000Z"
    // }
    // ----------------------------------------------------------
    const cid = response.data.IpfsHash;

    console.log(`✅ Upload successful! CID: ${cid}`);
    console.log(`🔗 View on IPFS: https://gateway.pinata.cloud/ipfs/${cid}`);

    return cid;

  } catch (error) {

    // ----------------------------------------------------------
    // ERROR HANDLING: Give clear, specific error messages.
    // axios wraps HTTP errors in error.response — we check that
    // first before falling back to a generic message.
    // ----------------------------------------------------------
    if (error.response) {
      // The request was made and Pinata returned an error status
      const status  = error.response.status;
      const message = error.response.data?.error?.details
                   || error.response.data?.error
                   || "Unknown Pinata API error";

      if (status === 401) {
        throw new Error("Pinata authentication failed. Check your API key and secret.");
      } else if (status === 403) {
        throw new Error("Pinata access forbidden. Your API key may not have upload permissions.");
      } else {
        throw new Error(`Pinata API error (${status}): ${message}`);
      }

    } else if (error.request) {
      // The request was made but no response came back (network issue)
      throw new Error("Network error: Could not reach Pinata. Check your internet connection.");

    } else {
      // Something else went wrong (validation, setup, etc.)
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
};

// ============================================================
// HELPER EXPORT: getIPFSGatewayURL
//
// Takes a CID and returns a full URL to view the file in a browser.
// Useful for the frontend to show a "View Certificate" link.
//
// Usage: getIPFSGatewayURL("QmXyz123...") 
//        → "https://gateway.pinata.cloud/ipfs/QmXyz123..."
// ============================================================
export const getIPFSGatewayURL = (cid) => {
  if (!cid) return "";
  // In demo mode, return the in-memory blob URL so the link opens
  // the actual uploaded PDF instead of a non-resolving gateway URL.
  if (isDemoMode()) {
    return getBlobUrl(cid) || `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
};
