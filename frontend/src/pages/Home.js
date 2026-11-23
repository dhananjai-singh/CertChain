// ============================================================
// Home.js — Landing page.
//
// Explains the system at a glance and routes the two audiences:
//   - Colleges  → Issue a certificate
//   - Employers → Verify a certificate
// Purely presentational; no blockchain calls here.
// ============================================================
import React from "react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <>
      <div className="hero">
        <span className="badge-chain">⛓️ Blockchain · IPFS · MetaMask</span>
        <h1>Tamper-proof Academic Certificates</h1>
        <p>
          Colleges issue certificates on the blockchain; anyone can verify them
          in seconds by scanning a QR code. No central authority, no forgery.
        </p>
      </div>

      {/* Two entry points */}
      <div className="action-grid">
        <div className="card action-card">
          <h3>🎓 For Colleges</h3>
          <p>
            Connect your whitelisted wallet, upload a certificate PDF to IPFS,
            and record it permanently on-chain. A QR code is generated instantly.
          </p>
          <Link to="/issue" className="btn">Issue a Certificate →</Link>
        </div>

        <div className="card action-card">
          <h3>🔍 For Employers</h3>
          <p>
            Scan the QR code or enter a certificate ID. We query the blockchain
            and tell you immediately whether it is genuine, fake, or revoked.
          </p>
          <Link to="/verify" className="btn btn-outline">Verify a Certificate →</Link>
        </div>
      </div>

      {/* How it works */}
      <div className="card">
        <h2 className="section-title">How it works</h2>
        <p className="section-sub">From upload to verification in five steps.</p>

        <div className="steps">
          <div className="step">
            <span className="num">1</span>
            <div><strong>College logs in</strong> with MetaMask. Only whitelisted
              college wallets are allowed to issue.</div>
          </div>
          <div className="step">
            <span className="num">2</span>
            <div><strong>PDF is uploaded to IPFS</strong> via Pinata, which returns
              a content hash (CID) that uniquely fingerprints the file.</div>
          </div>
          <div className="step">
            <span className="num">3</span>
            <div><strong>Details are recorded on-chain</strong> — student name,
              college, certificate ID, and the IPFS CID — through the smart contract.</div>
          </div>
          <div className="step">
            <span className="num">4</span>
            <div><strong>A QR code is generated</strong> containing a verification
              link for that certificate ID.</div>
          </div>
          <div className="step">
            <span className="num">5</span>
            <div><strong>Employers scan & verify.</strong> The site reads the
              blockchain and shows the certificate as valid or fake — instantly.</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;
