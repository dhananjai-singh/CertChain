// IssueCertificate.js — College-facing page (v2).
//
// Two modes:
//   Single — one certificate at a time with PDF upload + file hash
//   Batch  — CSV upload, preview table, bulk issuance with progress bar
import React, { useState } from "react";
import { uploadToIPFS, getIPFSGatewayURL } from "../utils/pinata";
import { issueCertificate } from "../utils/contract";
import { hashFileSHA256, hashTextSHA256 } from "../utils/hashFile";
import { saveCertificate, nextTokenId, getCertificate, fakeTxHash, DEMO_ADDRESS } from "../utils/demoStore";
import QRCode from "qrcode";

// Simple CSV parser — handles quoted fields, trims whitespace.
const parseCSV = (text) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] || "" }), {});
    });
};

// Template CSV content the user can download.
const CSV_TEMPLATE =
  "enrollmentNo,studentName,collegeName\n" +
  "23BCE5001,Dhananjai Pratap,VIT University\n" +
  "23BAI1993,Ananya Sharma,VIT University\n" +
  "23BRS1224,Rohan Mehta,VIT University\n";

function IssueCertificate() {
  const [mode, setMode] = useState("single");

  // ---- Single mode ----
  const [certId, setCertId]           = useState("");
  const [studentName, setStudentName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [file, setFile]               = useState(null);
  const [fileHash, setFileHash]       = useState("");
  const [hashLoading, setHashLoading] = useState(false);

  // ---- Batch mode ----
  const [csvRows, setCsvRows]         = useState([]);
  const [batchProgress, setBatchProgress] = useState(null);
  const [batchDone, setBatchDone]     = useState(false);

  // ---- Shared ----
  const [status, setStatus]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  const resetMessages = () => { setError(""); setStatus(""); setResult(null); };

  // ---- File selection → compute SHA-256 ----
  const handleFileChange = async (e) => {
    const f = e.target.files[0] || null;
    setFile(f);
    setFileHash("");
    if (!f) return;
    setHashLoading(true);
    try {
      const hash = await hashFileSHA256(f);
      setFileHash(hash);
    } finally {
      setHashLoading(false);
    }
  };

  // ---- Single issue ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!certId || !studentName || !collegeName || !file) {
      setError("Please fill in all fields and choose a PDF file.");
      return;
    }

    try {
      setLoading(true);

      setStatus("📤 Uploading PDF to IPFS…");
      const cid = await uploadToIPFS(file);

      setStatus("⛓️ Recording certificate on the blockchain…");
      const { txHash, tokenId } = await issueCertificate(
        studentName, collegeName, cid, certId, fileHash
      );

      setStatus("🔳 Generating QR code…");
      const verifyUrl = `${window.location.origin}/verify?certId=${encodeURIComponent(certId)}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 440, margin: 2 });

      setResult({ cid, txHash, qrDataUrl, verifyUrl, tokenId });
      setStatus("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const a = document.createElement("a");
    a.href = result.qrDataUrl;
    a.download = `certificate-${certId}-qr.png`;
    a.click();
  };

  // ---- CSV upload ----
  const handleCsvUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const text = await f.text();
    const rows = parseCSV(text);
    setCsvRows(rows);
    setBatchProgress(null);
    setBatchDone(false);
  };

  const downloadTemplate = () => {
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`;
    a.download = "certificate_batch_template.csv";
    a.click();
  };

  // ---- Batch issue — stores directly to local store, no MetaMask popup per row ----
  const handleBatchIssue = async () => {
    setBatchProgress({ done: 0, total: csvRows.length, results: [] });
    setBatchDone(false);
    const results = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const { enrollmentNo: rowId, studentName: sName, collegeName: cName } = row;

      if (!rowId || !sName || !cName) {
        results.push({ enrollmentNo: rowId || `row-${i + 1}`, ok: false, msg: "Missing fields" });
        setBatchProgress({ done: i + 1, total: csvRows.length, results: [...results] });
        continue;
      }

      try {
        if (getCertificate(rowId)) throw new Error("Enrollment number already exists.");
        const batchHash = await hashTextSHA256(`${rowId}|${sName}|${cName}`);
        const fakeBatchCid = `QmBATCH${rowId.replace(/\W/g, "").slice(0, 20)}`;
        const tokenId = nextTokenId();
        saveCertificate(rowId, {
          studentName: sName, collegeName: cName,
          ipfsCID: fakeBatchCid, fileHash: batchHash,
          issuedBy: DEMO_ADDRESS, issuedAt: Date.now(),
          isValid: true, tokenId,
        });
        const txHash = fakeTxHash();
        results.push({ enrollmentNo: rowId, ok: true, tokenId, txHash });
      } catch (err) {
        results.push({ enrollmentNo: rowId, ok: false, msg: err.message });
      }

      // Small delay so the progress bar is visible
      await new Promise(r => setTimeout(r, 300));
      setBatchProgress({ done: i + 1, total: csvRows.length, results: [...results] });
    }

    setBatchDone(true);
  };

  return (
    <>
      <h1 className="section-title">🎓 Issue a Certificate</h1>
      <p className="section-sub">
        Upload a PDF, anchor it on-chain with a SHA-256 fingerprint, and get a QR code.
        Each certificate also mints a Soulbound NFT.
      </p>

      {/* ---- Mode toggle ---- */}
      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-btn${mode === "single" ? " active" : ""}`}
          onClick={() => { setMode("single"); resetMessages(); }}
        >
          Single Issue
        </button>
        <button
          type="button"
          className={`mode-btn${mode === "batch" ? " active" : ""}`}
          onClick={() => { setMode("batch"); resetMessages(); }}
        >
          Batch CSV Import
        </button>
      </div>

      {/* =================== SINGLE MODE =================== */}
      {mode === "single" && (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="certId">Enrollment Number</label>
              <input
                id="certId" type="text" value={certId}
                onChange={(e) => setCertId(e.target.value)}
                placeholder="e.g. 23BCE5001"
              />
              <div className="hint">The student's enrollment number. Cannot be reused.</div>
            </div>

            <div className="form-group">
              <label htmlFor="studentName">Student Name</label>
              <input
                id="studentName" type="text" value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Dhananjai Pratap"
              />
            </div>

            <div className="form-group">
              <label htmlFor="collegeName">College Name</label>
              <input
                id="collegeName" type="text" value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="e.g. VIT University"
              />
            </div>

            <div className="form-group">
              <label htmlFor="file">Certificate PDF</label>
              <input
                id="file" type="file" accept="application/pdf"
                onChange={handleFileChange}
              />
              {hashLoading && (
                <div className="hint" style={{ color: "var(--brand)" }}>
                  ⚙️ Computing SHA-256 fingerprint…
                </div>
              )}
              {fileHash && !hashLoading && (
                <div className="file-hash-display">
                  <span className="file-hash-label">SHA-256 Fingerprint</span>
                  <span className="file-hash-value mono">{fileHash}</span>
                  <span className="file-hash-note">
                    This hash will be stored on-chain to enable tamper detection.
                  </span>
                </div>
              )}
            </div>

            {error  && <div className="alert alert-error">{error}</div>}
            {status && <div className="alert alert-info">{status}</div>}

            <button type="submit" className="btn btn-block" disabled={loading}>
              {loading
                ? <><span className="spinner" /> Processing…</>
                : "Issue Certificate"}
            </button>
          </form>
        </div>
      )}

      {/* ---- Single success panel ---- */}
      {mode === "single" && result && (
        <div className="result valid">
          <h2>✅ Certificate Issued Successfully</h2>

          {result.tokenId && (
            <div className="nft-banner">
              <span className="nft-icon">🎫</span>
              <div>
                <strong>Soulbound NFT Token #{result.tokenId}</strong>
                <div style={{ fontSize: "0.85rem", marginTop: 3 }}>
                  Minted as a non-transferable ERC-721 token (CertChain Degree / CERT).
                </div>
              </div>
            </div>
          )}

          <div className="detail-row">
            <span className="k">Enrollment Number</span>
            <span className="v mono">{certId}</span>
          </div>
          <div className="detail-row">
            <span className="k">IPFS CID</span>
            <span className="v mono">{result.cid}</span>
          </div>
          <div className="detail-row">
            <span className="k">PDF on IPFS</span>
            <span className="v">
              <a href={getIPFSGatewayURL(result.cid)} target="_blank" rel="noreferrer">
                View uploaded certificate ↗
              </a>
            </span>
          </div>
          <div className="detail-row">
            <span className="k">SHA-256 Hash</span>
            <span className="v mono" style={{ fontSize: "0.8rem" }}>{fileHash || "—"}</span>
          </div>
          <div className="detail-row">
            <span className="k">Transaction</span>
            <span className="v mono">{result.txHash}</span>
          </div>
          <div className="detail-row">
            <span className="k">Verify link</span>
            <span className="v"><a href={result.verifyUrl}>{result.verifyUrl}</a></span>
          </div>

          <div className="qr-block">
            <img src={result.qrDataUrl} alt="Certificate verification QR code" />
            <div style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-outline" onClick={downloadQR}>
                ⬇ Download QR Code
              </button>
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              Print this QR on the certificate. Employers scan it to verify.
            </p>
          </div>
        </div>
      )}

      {/* =================== BATCH MODE =================== */}
      {mode === "batch" && (
        <div className="card">
          <div className="batch-header">
            <div>
              <h3 style={{ margin: 0 }}>Bulk Certificate Issuance</h3>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                Upload a CSV with <code>enrollmentNo, studentName, collegeName</code> columns.
                Each row is issued as a separate on-chain certificate.
              </p>
            </div>
            <button type="button" className="btn btn-outline" onClick={downloadTemplate}>
              ⬇ Download Template
            </button>
          </div>

          <div className="form-group" style={{ marginTop: 20 }}>
            <label htmlFor="csvFile">Upload CSV File</label>
            <input
              id="csvFile" type="file" accept=".csv,text/csv"
              onChange={handleCsvUpload}
            />
          </div>

          {csvRows.length > 0 && (
            <>
              <div className="csv-preview">
                <table className="csv-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Enrollment No.</th>
                      <th>Student Name</th>
                      <th>College</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i}>
                        <td className="muted">{i + 1}</td>
                        <td className="mono">{row.enrollmentNo}</td>
                        <td>{row.studentName}</td>
                        <td>{row.collegeName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!batchProgress && (
                <button
                  type="button"
                  className="btn btn-block"
                  onClick={handleBatchIssue}
                  style={{ marginTop: 16 }}
                >
                  Issue All {csvRows.length} Certificates
                </button>
              )}
            </>
          )}

          {/* ---- Batch progress ---- */}
          {batchProgress && (
            <div style={{ marginTop: 20 }}>
              <div className="progress-label">
                Issuing {batchProgress.done} / {batchProgress.total}…
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
                />
              </div>

              {batchDone && (
                <div className="alert alert-success" style={{ marginTop: 14 }}>
                  ✅ Batch complete! {batchProgress.results.filter((r) => r.ok).length} issued,{" "}
                  {batchProgress.results.filter((r) => !r.ok).length} failed.
                </div>
              )}

              <div className="batch-results">
                {batchProgress.results.map((r, i) => (
                  <div key={i} className={`batch-result-row ${r.ok ? "ok" : "fail"}`}>
                    <span className="mono">{r.enrollmentNo}</span>
                    {r.ok
                      ? <span>✅ Issued {r.tokenId ? `· NFT #${r.tokenId}` : ""}</span>
                      : <span>❌ {r.msg}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default IssueCertificate;
