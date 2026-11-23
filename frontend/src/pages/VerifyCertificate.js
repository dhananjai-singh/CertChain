// VerifyCertificate.js — Employer/verifier page (v2).
//
// New in v2:
//   - Shows NFT token ID badge
//   - Tamper-Detection: optional PDF upload → re-compute SHA-256 →
//     compare against the hash stored on-chain.
//     Green = authentic | Red = file has been modified
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { verifyCertificate } from "../utils/contract";
import { getIPFSGatewayURL } from "../utils/pinata";
import { hashFileSHA256 } from "../utils/hashFile";

function VerifyCertificate() {
  const [searchParams] = useSearchParams();

  const [certId, setCertId]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [cert, setCert]           = useState(null);

  // Tamper check state
  const [tamperFile, setTamperFile]       = useState(null);
  const [tamperStatus, setTamperStatus]   = useState("idle"); // idle | checking | match | mismatch
  const [computedHash, setComputedHash]   = useState("");

  const runVerify = useCallback(async (id) => {
    setError("");
    setCert(null);
    setTamperFile(null);
    setTamperStatus("idle");
    setComputedHash("");

    if (!id || !id.trim()) {
      setError("Please enter a certificate ID.");
      return;
    }

    try {
      setLoading(true);
      const result = await verifyCertificate(id.trim());
      setCert(result);
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const idFromUrl = searchParams.get("certId");
    if (idFromUrl) {
      setCertId(idFromUrl);
      runVerify(idFromUrl);
    }
  }, [searchParams, runVerify]);

  const handleSubmit = (e) => {
    e.preventDefault();
    runVerify(certId);
  };

  // ---- Tamper check: re-hash the uploaded file and compare ----
  const handleTamperFile = async (e) => {
    const f = e.target.files[0] || null;
    setTamperFile(f);
    setTamperStatus("idle");
    setComputedHash("");

    if (!f || !cert?.fileHash) return;

    setTamperStatus("checking");
    try {
      const hash = await hashFileSHA256(f);
      setComputedHash(hash);
      setTamperStatus(
        hash.toLowerCase() === cert.fileHash.toLowerCase() ? "match" : "mismatch"
      );
    } catch {
      setTamperStatus("idle");
    }
  };

  return (
    <>
      <h1 className="section-title">🔍 Verify a Certificate</h1>
      <p className="section-sub">
        Enter an enrollment number (or scan its QR code) to check it against the blockchain.
        No wallet needed — this is a free read-only call.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="certId">Enrollment Number</label>
            <input
              id="certId" type="text" value={certId}
              onChange={(e) => setCertId(e.target.value)}
              placeholder="e.g. 23BCE5001"
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-block" disabled={loading}>
            {loading ? <><span className="spinner" /> Checking blockchain…</> : "Verify"}
          </button>
        </form>
      </div>

      {/* ---- Valid certificate ---- */}
      {cert && cert.isValid && (
        <>
          <div className="result valid">
            <h2>✅ Genuine Certificate</h2>

            {cert.tokenId && (
              <div className="nft-badge">
                🎫 Soulbound NFT Token #{cert.tokenId}
                <span className="nft-badge-sub"> · ERC-721 · Non-transferable</span>
              </div>
            )}

            <CertDetails cert={cert} certId={certId} />
          </div>

          {/* ---- Tamper detection panel ---- */}
          <div className="card tamper-panel">
            <h3 style={{ margin: "0 0 8px" }}>🔐 File Integrity Check</h3>
            <p className="muted" style={{ margin: "0 0 16px" }}>
              Upload the certificate PDF to verify its SHA-256 fingerprint matches
              the hash anchored on-chain. Any modification — even one byte — will
              produce a different hash and trigger a tamper alert.
            </p>

            <input
              type="file"
              accept="application/pdf"
              onChange={handleTamperFile}
            />

            {tamperStatus === "checking" && (
              <div className="alert alert-info" style={{ marginTop: 14 }}>
                ⚙️ Computing SHA-256 fingerprint…
              </div>
            )}

            {tamperStatus === "match" && (
              <div className="alert alert-success" style={{ marginTop: 14 }}>
                <strong>✅ File is authentic and unmodified.</strong><br />
                <span style={{ fontSize: "0.85rem" }}>
                  Computed: <code>{computedHash}</code>
                </span><br />
                <span style={{ fontSize: "0.85rem" }}>
                  On-chain: <code>{cert.fileHash}</code>
                </span>
              </div>
            )}

            {tamperStatus === "mismatch" && (
              <div className="alert alert-error" style={{ marginTop: 14 }}>
                <strong>🚨 TAMPERED — Hash mismatch!</strong><br />
                <span style={{ fontSize: "0.85rem" }}>
                  This file does NOT match the original. The PDF has been modified.
                </span><br />
                <span style={{ fontSize: "0.85rem" }}>
                  Computed: <code>{computedHash}</code>
                </span><br />
                <span style={{ fontSize: "0.85rem" }}>
                  On-chain: <code>{cert.fileHash}</code>
                </span>
              </div>
            )}

            {(tamperStatus === "idle" && cert.fileHash) && (
              <p className="hint" style={{ marginTop: 8 }}>
                On-chain hash: <code className="mono" style={{ fontSize: "0.78rem" }}>
                  {cert.fileHash}
                </code>
              </p>
            )}

            {!cert.fileHash && (
              <p className="hint" style={{ marginTop: 8 }}>
                This certificate was issued without a file hash (legacy) — tamper detection not available.
              </p>
            )}
          </div>
        </>
      )}

      {/* ---- Revoked certificate ---- */}
      {cert && !cert.isValid && (
        <div className="result revoked">
          <h2>⚠️ Revoked Certificate</h2>
          <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
            This certificate exists on-chain but was revoked by the issuing college.
          </p>
          {cert.tokenId && (
            <div className="nft-badge" style={{ borderColor: "#d97706", color: "#92400e" }}>
              🎫 Soulbound NFT Token #{cert.tokenId} · Revoked
            </div>
          )}
          <CertDetails cert={cert} certId={certId} />
        </div>
      )}

      {/* ---- Not found ---- */}
      {error && !loading && (
        <div className="result invalid">
          <h2>❌ Not Verified</h2>
          <p>
            No valid certificate matched this ID on the blockchain.
            It may be fake, mistyped, or never issued.
          </p>
        </div>
      )}
    </>
  );
}

function CertDetails({ cert, certId }) {
  return (
    <>
      <div className="detail-row">
        <span className="k">Enrollment Number</span>
        <span className="v mono">{certId}</span>
      </div>
      <div className="detail-row">
        <span className="k">Student</span>
        <span className="v">{cert.studentName}</span>
      </div>
      <div className="detail-row">
        <span className="k">College</span>
        <span className="v">{cert.collegeName}</span>
      </div>
      <div className="detail-row">
        <span className="k">Issued By</span>
        <span className="v mono">{cert.issuedBy}</span>
      </div>
      <div className="detail-row">
        <span className="k">Issued On</span>
        <span className="v">{cert.issuedAt.toLocaleString()}</span>
      </div>
      <div className="detail-row">
        <span className="k">Certificate PDF</span>
        <span className="v">
          <a href={getIPFSGatewayURL(cert.ipfsCID)} target="_blank" rel="noreferrer">
            View on IPFS ↗
          </a>
        </span>
      </div>
    </>
  );
}

export default VerifyCertificate;
