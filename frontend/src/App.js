import React, { useState } from "react";
import { Routes, Route, NavLink, Link } from "react-router-dom";

import Home               from "./pages/Home";
import IssueCertificate   from "./pages/IssueCertificate";
import VerifyCertificate  from "./pages/VerifyCertificate";
import Analytics          from "./pages/Analytics";
import ZKProof            from "./pages/ZKProof";

import { connectWallet } from "./utils/contract";

const shorten = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

function App() {
  const [address, setAddress] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { address } = await connectWallet();
      setAddress(address);
    } catch (err) {
      alert(err.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <>
      {/* Demo-mode banner — shown only when REACT_APP_DEMO_MODE=true */}
      {process.env.REACT_APP_DEMO_MODE === "true" && (
        <div className="demo-banner">
          🧪 Demo Mode — blockchain &amp; IPFS are simulated locally for this walkthrough
        </div>
      )}

      {/* ---------- Navbar ---------- */}
      <nav className="navbar">
        <Link to="/" className="brand">
          <span role="img" aria-label="shield">🛡️</span> CertChain
        </Link>

        <div className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/issue">Issue</NavLink>
          <NavLink to="/verify">Verify</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          <NavLink to="/zkproof">ZK Proof</NavLink>

          <button type="button" className="wallet-pill" onClick={handleConnect} disabled={connecting}>
            {connecting
              ? "Connecting..."
              : address
                ? `🦊 ${shorten(address)}`
                : "Connect Wallet"}
          </button>
        </div>
      </nav>

      {/* ---------- Routed pages ---------- */}
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/issue" element={<IssueCertificate walletAddress={address} />} />
          <Route path="/verify"    element={<VerifyCertificate />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/zkproof"   element={<ZKProof />} />
        </Routes>
      </div>

      <div className="footer">
        Decentralized Academic Certificate Verification · Blockchain + IPFS + ERC-721 · Review 2 (50%)
      </div>
    </>
  );
}

export default App;
