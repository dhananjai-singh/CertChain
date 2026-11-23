// Analytics.js — On-chain / demo statistics dashboard.
//
// In demo mode: reads from localStorage via getAnalyticsData().
// In live mode: queries CertificateIssued / CertificateRevoked events.
import React, { useState, useEffect } from "react";
import { getAnalyticsData } from "../utils/contract";
import { isDemoMode } from "../utils/demoStore";

function Analytics() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAnalyticsData();
        setStats(data);
      } catch (err) {
        setError("Failed to load analytics: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <span className="spinner" style={{ borderTopColor: "var(--brand)", borderColor: "rgba(0,0,0,0.1)" }} />
        <p style={{ marginTop: 16, color: "var(--text-muted)" }}>Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error" style={{ marginTop: 24 }}>{error}</div>;
  }

  const maxCollegeCount = Math.max(1, ...Object.values(stats.byCollege));

  return (
    <>
      <h1 className="section-title">📊 Certificate Analytics</h1>
      <p className="section-sub">
        {isDemoMode()
          ? "Statistics derived from this demo session's local data."
          : "Live statistics read directly from on-chain events — no database."}
      </p>

      {/* ---- Stat cards ---- */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number" style={{ color: "var(--brand)" }}>
            {stats.totalIssued}
          </div>
          <div className="stat-label">Total Issued</div>
          <div className="stat-sub">certificates on-chain</div>
        </div>

        <div className="stat-card">
          <div className="stat-number" style={{ color: "var(--success)" }}>
            {stats.activeCount}
          </div>
          <div className="stat-label">Active</div>
          <div className="stat-sub">currently valid</div>
        </div>

        <div className="stat-card">
          <div className="stat-number" style={{ color: "var(--danger)" }}>
            {stats.totalRevoked}
          </div>
          <div className="stat-label">Revoked</div>
          <div className="stat-sub">flagged invalid</div>
        </div>

        <div className="stat-card">
          <div className="stat-number" style={{ color: "#7c3aed" }}>
            {stats.totalIssued}
          </div>
          <div className="stat-label">Soulbound NFTs</div>
          <div className="stat-sub">ERC-721 tokens minted</div>
        </div>
      </div>

      {/* ---- By College bar chart ---- */}
      <div className="card" style={{ marginTop: 8 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 700 }}>
          Certificates by College
        </h2>

        {Object.keys(stats.byCollege).length === 0 ? (
          <p className="muted">No certificates issued yet.</p>
        ) : (
          <div className="bar-chart">
            {Object.entries(stats.byCollege)
              .sort((a, b) => b[1] - a[1])
              .map(([college, count]) => (
                <div className="bar-row" key={college}>
                  <span className="bar-label">{college}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(count / maxCollegeCount) * 100}%` }}
                    />
                    <span className="bar-value">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ---- Recent activity ---- */}
      <div className="card">
        <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 700 }}>
          Recent Issuances
        </h2>

        {stats.recent.length === 0 ? (
          <p className="muted">
            No certificates yet.{" "}
            <a href="/issue">Issue one →</a>
          </p>
        ) : (
          <div className="activity-list">
            {stats.recent.map((cert, i) => (
              <div className="activity-row" key={i}>
                <div className="activity-icon">🎓</div>
                <div className="activity-body">
                  <span className="activity-name">{cert.studentName}</span>
                  <span className="activity-college">{cert.collegeName}</span>
                </div>
                <div className="activity-meta">
                  <span className="activity-id mono">{cert.certId}</span>
                  {cert.tokenId && (
                    <span className="nft-badge-sm">NFT #{cert.tokenId}</span>
                  )}
                  <span className="activity-date">
                    {new Date(cert.issuedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Technical note ---- */}
      <div className="card" style={{ background: "var(--brand-light)", border: "none" }}>
        <h3 style={{ margin: "0 0 10px", color: "var(--brand-dark)" }}>
          How this works
        </h3>
        <p style={{ margin: 0, color: "var(--brand-dark)", fontSize: "0.93rem", lineHeight: 1.6 }}>
          {isDemoMode()
            ? "In demo mode, statistics are aggregated from this session's localStorage store, which simulates the blockchain. "
            : "These statistics are computed by reading CertificateIssued and CertificateRevoked events directly from the blockchain — no separate database or API involved. "}
          In production, a full event indexer (like The Graph) would be used for real-time queries across millions of certificates. Each certificate also mints a <strong>Soulbound ERC-721 NFT</strong> (token name: <em>CertChain Degree / CERT</em>) that is permanently locked to the issuing wallet — it cannot be transferred or sold.
        </p>
      </div>
    </>
  );
}

export default Analytics;
