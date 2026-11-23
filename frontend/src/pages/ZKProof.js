// ZKProof.js — Zero-Knowledge Selective Disclosure page.
//
// Two modes:
//   Generate (student) — load cert, configure what to reveal, get a proof URL
//   Verify (employer)  — paste a proof, see only disclosed attributes
//
// URL: /zkproof?proof=BASE64 auto-switches to Verify mode.
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ATTRIBUTE_LABELS, ATTRIBUTE_FIELDS, RANGE_FIELDS,
  generateZKAttributes, saveZKKey, loadZKKey,
  generateSelectiveProof, verifySelectiveProof,
  encodeProof, decodeProof,
} from '../utils/zkProof';
import { getCertificate } from '../utils/demoStore';

// ============================================================
// Main component
// ============================================================
function ZKProof() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState('generate');

  useEffect(() => {
    if (searchParams.get('proof')) setMode('verify');
  }, [searchParams]);

  return (
    <>
      <h1 className="section-title">🔏 Zero-Knowledge Selective Disclosure</h1>
      <p className="section-sub">
        Prove specific claims about your certificate without revealing all your details.
      </p>

      {/* ---- Explainer ---- */}
      <div className="card zk-explainer">
        <div className="zk-explainer-grid">
          <div>
            <div className="zk-explainer-icon">🧠</div>
            <strong>The Problem</strong>
            <p>An employer needs to verify you have CGPA ≥ 8.5. Should you hand over your entire transcript? Your name, year, all grades?</p>
          </div>
          <div>
            <div className="zk-explainer-icon">🔏</div>
            <strong>The Solution</strong>
            <p>You generate a <em>selective disclosure proof</em> — a cryptographic token that says "CGPA ≥ 8.5 ✅" and nothing else.</p>
          </div>
          <div>
            <div className="zk-explainer-icon">⛓️</div>
            <strong>The Guarantee</strong>
            <p>Every claim is backed by a SHA-256 <em>commitment</em> anchored to your on-chain certificate. Hidden fields are provably indistinguishable.</p>
          </div>
        </div>
      </div>

      {/* ---- Mode tabs ---- */}
      <div className="mode-toggle">
        <button type="button"
          className={`mode-btn${mode === 'generate' ? ' active' : ''}`}
          onClick={() => setMode('generate')}>
          🎓 Student — Generate Proof
        </button>
        <button type="button"
          className={`mode-btn${mode === 'verify' ? ' active' : ''}`}
          onClick={() => setMode('verify')}>
          🏢 Employer — Verify Proof
        </button>
      </div>

      {mode === 'generate' && <GenerateMode />}
      {mode === 'verify'   && <VerifyMode initialProofStr={searchParams.get('proof')} />}
    </>
  );
}

// ============================================================
// Generate Mode — 3-step wizard
// ============================================================
function GenerateMode() {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [certId, setCertId]     = useState('');
  const [certFound, setCertFound] = useState(false);
  const [attrs, setAttrs] = useState({
    name: '', college: '', degree: '', cgpa: '', gradYear: ''
  });

  // Step 2 state — per-field type: 'hide' | 'reveal' | 'range'
  const [discType, setDiscType] = useState({
    name: 'reveal', college: 'reveal', degree: 'reveal', cgpa: 'range', gradYear: 'hide'
  });
  const [rangeOp,  setRangeOp]  = useState({ cgpa: '>=', gradYear: '>=' });
  const [rangeVal, setRangeVal] = useState({ cgpa: '8.5', gradYear: '2020' });

  // Step 3 state
  const [proof,    setProof]    = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [copied,   setCopied]   = useState(false);

  const [zkKey,    setZkKey]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Try to load cert from demo localStorage
  const handleLoadCert = () => {
    setError('');
    if (!certId.trim()) { setError('Enter an enrollment number.'); return; }
    const cert = getCertificate(certId.trim());
    if (cert) {
      setCertFound(true);
      setAttrs(prev => ({
        ...prev,
        name   : cert.studentName || prev.name,
        college: cert.collegeName  || prev.college,
      }));
    } else {
      setCertFound(false);
    }
    // Also check if we already have a ZK key stored
    const existing = loadZKKey(certId.trim());
    if (existing) {
      setZkKey(existing);
      setAttrs(existing.attributes);
      setStep(2);
    }
  };

  const handleInitialize = async () => {
    setError('');
    for (const f of ATTRIBUTE_FIELDS) {
      if (!attrs[f]) { setError(`Please fill in all attributes (${ATTRIBUTE_LABELS[f]} is empty).`); return; }
    }
    setLoading(true);
    try {
      const { commitments, nonces } = await generateZKAttributes(attrs);
      saveZKKey(certId.trim(), attrs, nonces, commitments);
      setZkKey({ attributes: attrs, nonces, commitments });
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const buildDisclosureConfig = () => ({
    reveal: ATTRIBUTE_FIELDS.filter(f => discType[f] === 'reveal'),
    rangeClaims: ATTRIBUTE_FIELDS
      .filter(f => discType[f] === 'range' && RANGE_FIELDS.has(f))
      .map(f => ({ field: f, op: rangeOp[f] || '>=', threshold: parseFloat(rangeVal[f]) || 0 })),
  });

  const handleGenerate = async () => {
    setError('');
    const config = buildDisclosureConfig();
    const revealing = config.reveal.length + config.rangeClaims.length;
    if (revealing === 0) { setError('Reveal at least one field.'); return; }
    setLoading(true);
    try {
      const p = await generateSelectiveProof(
        certId.trim(), zkKey.attributes, zkKey.nonces, zkKey.commitments, config
      );
      const encoded = encodeProof(p);
      setProof(p);
      setProofUrl(`${window.location.origin}/zkproof?proof=${encoded}`);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(proofUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <>
      {/* Step indicator */}
      <div className="zk-steps">
        {['Load Certificate', 'Configure Disclosure', 'Share Proof'].map((label, i) => (
          <div key={i} className={`zk-step${step === i+1 ? ' active' : step > i+1 ? ' done' : ''}`}>
            <div className="zk-step-num">{step > i+1 ? '✓' : i+1}</div>
            <div className="zk-step-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ---- STEP 1 ---- */}
      {step === 1 && (
        <div className="card">
          <h3 style={{ margin: '0 0 18px' }}>Step 1 — Load your certificate &amp; enter attributes</h3>

          <div className="form-group">
            <label>Enrollment Number</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="text" value={certId}
                onChange={e => { setCertId(e.target.value); setCertFound(false); }}
                placeholder="e.g. 23BCE5001" style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-outline"
                style={{ whiteSpace: 'nowrap' }} onClick={handleLoadCert}>
                Load Cert
              </button>
            </div>
            {certFound && (
              <div className="hint" style={{ color: 'var(--success)' }}>
                ✅ Certificate found — name and college pre-filled.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            {ATTRIBUTE_FIELDS.map(field => (
              <div className="form-group" key={field}>
                <label>{ATTRIBUTE_LABELS[field]}</label>
                <input type="text" value={attrs[field]}
                  onChange={e => setAttrs(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={field === 'cgpa' ? '0.0 – 10.0' : field === 'gradYear' ? 'e.g. 2024' : ''}
                  readOnly={certFound && (field === 'name' || field === 'college')}
                  style={certFound && (field === 'name' || field === 'college') ? { background: '#f0fdf4' } : {}}
                />
              </div>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="button" className="btn btn-block" onClick={handleInitialize} disabled={loading}>
            {loading ? <><span className="spinner" /> Generating commitments…</> : '🔐 Initialize ZK Attributes'}
          </button>

          <p className="hint" style={{ marginTop: 12, textAlign: 'center' }}>
            This generates a SHA-256 commitment for each attribute. Your nonces (secret keys) are stored locally — never shared.
          </p>
        </div>
      )}

      {/* ---- STEP 2 ---- */}
      {step === 2 && zkKey && (
        <div className="card">
          <h3 style={{ margin: '0 0 6px' }}>Step 2 — Configure what to disclose</h3>
          <p className="muted" style={{ margin: '0 0 20px' }}>
            Choose what the employer will learn. Hidden fields are provably concealed — they cannot deduce the value from the commitment.
          </p>

          <div className="zk-fields">
            {ATTRIBUTE_FIELDS.map(field => (
              <DisclosureFieldRow
                key={field}
                field={field}
                label={ATTRIBUTE_LABELS[field]}
                value={zkKey.attributes[field]}
                type={discType[field]}
                rangeOp={rangeOp[field] || '>='}
                rangeVal={rangeVal[field] || ''}
                supportsRange={RANGE_FIELDS.has(field)}
                onTypeChange={t => setDiscType(prev => ({ ...prev, [field]: t }))}
                onOpChange={op => setRangeOp(prev => ({ ...prev, [field]: op }))}
                onValChange={v => setRangeVal(prev => ({ ...prev, [field]: v }))}
              />
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={handleGenerate} disabled={loading}>
              {loading ? <><span className="spinner" /> Generating proof…</> : '⚡ Generate Selective Disclosure Proof'}
            </button>
          </div>
        </div>
      )}

      {/* ---- STEP 3 ---- */}
      {step === 3 && proof && (
        <div className="card">
          <h3 style={{ margin: '0 0 18px' }}>Step 3 — Your ZK Proof is ready</h3>

          {/* Proof summary */}
          <div className="zk-proof-summary">
            {ATTRIBUTE_FIELDS.map(field => {
              const type = discType[field];
              if (type === 'reveal') return (
                <div className="zk-summary-row" key={field}>
                  <span className="zk-summary-field">{ATTRIBUTE_LABELS[field]}</span>
                  <span className="zk-summary-badge disclosed">Disclosed</span>
                  <span className="zk-summary-val">{proof.disclosures[field]?.value}</span>
                </div>
              );
              if (type === 'range') {
                const rc = proof.rangeClaims[field];
                return (
                  <div className="zk-summary-row" key={field}>
                    <span className="zk-summary-field">{ATTRIBUTE_LABELS[field]}</span>
                    <span className="zk-summary-badge range">Range Proof</span>
                    <span className="zk-summary-val">
                      {ATTRIBUTE_LABELS[field]} {rc?.op} {rc?.threshold} ✅
                    </span>
                  </div>
                );
              }
              return (
                <div className="zk-summary-row" key={field}>
                  <span className="zk-summary-field">{ATTRIBUTE_LABELS[field]}</span>
                  <span className="zk-summary-badge hidden">Hidden</span>
                  <span className="zk-summary-val muted">[Cryptographically concealed]</span>
                </div>
              );
            })}
          </div>

          {/* Share URL */}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>
              🔗 Shareable Proof URL
            </label>
            <div className="zk-url-row">
              <input
                type="text" readOnly value={proofUrl}
                className="mono"
                style={{ flex: 1, fontSize: '0.78rem', padding: '10px 12px',
                         border: '1px solid var(--border)', borderRadius: 8, background: '#f9f9f9' }}
              />
              <button type="button" className="btn btn-outline"
                style={{ whiteSpace: 'nowrap' }} onClick={copyUrl}>
                {copied ? '✅ Copied!' : '📋 Copy Link'}
              </button>
            </div>
            <div className="hint" style={{ marginTop: 6 }}>
              Share this link with the employer. They can open it to verify your proof without learning your hidden attributes.
            </div>
          </div>

          {/* Raw proof (collapsible) */}
          <details style={{ marginTop: 20 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--brand)' }}>
              View raw proof JSON
            </summary>
            <pre className="zk-proof-json">{JSON.stringify(proof, null, 2)}</pre>
          </details>

          <button type="button" className="btn btn-outline" style={{ marginTop: 16 }}
            onClick={() => { setStep(1); setProof(null); setZkKey(null); }}>
            ← Generate another proof
          </button>
        </div>
      )}
    </>
  );
}

// ============================================================
// Disclosure field row — one attribute in step 2
// ============================================================
function DisclosureFieldRow({ field, label, value, type, rangeOp, rangeVal,
  supportsRange, onTypeChange, onOpChange, onValChange }) {
  return (
    <div className="zk-field-row">
      <div className="zk-field-info">
        <span className="zk-field-name">{label}</span>
        <span className="zk-field-val mono">{value}</span>
      </div>
      <div className="zk-disc-opts">
        <button type="button"
          className={`zk-disc-opt${type === 'hide' ? ' active hide' : ''}`}
          onClick={() => onTypeChange('hide')}>
          🙈 Hide
        </button>
        <button type="button"
          className={`zk-disc-opt${type === 'reveal' ? ' active reveal' : ''}`}
          onClick={() => onTypeChange('reveal')}>
          👁️ Reveal
        </button>
        {supportsRange && (
          <button type="button"
            className={`zk-disc-opt${type === 'range' ? ' active range' : ''}`}
            onClick={() => onTypeChange('range')}>
            📊 Range Proof
          </button>
        )}
      </div>
      {type === 'range' && supportsRange && (
        <div className="zk-range-row">
          <span className="muted" style={{ fontSize: '0.85rem' }}>Prove:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
          <select
            value={rangeOp}
            onChange={e => onOpChange(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value=">">{">"}</option>
            <option value=">=">{">="}</option>
            <option value="<">{"<"}</option>
            <option value="<=">{"<="}</option>
          </select>
          <input
            type="number" step="0.1" value={rangeVal}
            onChange={e => onValChange(e.target.value)}
            style={{ width: 80, padding: '4px 8px', borderRadius: 6,
                     border: '1px solid var(--border)', fontSize: '0.9rem' }}
          />
          <span className="hint" style={{ margin: 0 }}>
            (employer will see only that the threshold is met, not exact value)
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Verify Mode — employer verifies a proof
// ============================================================
function VerifyMode({ initialProofStr }) {
  const [proofStr,  setProofStr]  = useState(initialProofStr || '');
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleVerify = useCallback(async (str) => {
    setError('');
    setResult(null);
    const proof = decodeProof(str.trim());
    if (!proof) { setError('Invalid proof — could not decode.'); return; }
    setLoading(true);
    try {
      const res = await verifySelectiveProof(proof);
      setResult({ proof, ...res });
    } catch (e) {
      setError('Verification error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-verify when URL carries a proof
  useEffect(() => {
    if (initialProofStr) handleVerify(initialProofStr);
  }, [initialProofStr, handleVerify]);

  return (
    <>
      <div className="card">
        <h3 style={{ margin: '0 0 16px' }}>Paste a ZK Proof</h3>
        <div className="form-group">
          <label>Proof (base64 string or paste from URL)</label>
          <textarea
            value={proofStr}
            onChange={e => setProofStr(e.target.value)}
            rows={4}
            placeholder="Paste the proof string here…"
            style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--border)',
                     borderRadius: 10, fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical' }}
          />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button type="button" className="btn btn-block"
          onClick={() => handleVerify(proofStr)} disabled={loading || !proofStr.trim()}>
          {loading ? <><span className="spinner" /> Verifying…</> : '🔍 Verify Proof'}
        </button>
      </div>

      {result && (
        <div className={`result ${result.valid ? 'valid' : 'invalid'}`}>
          <h2>
            {result.valid ? '✅ ZK Proof Verified' : '❌ Invalid Proof'}
          </h2>

          {result.valid && (
            <p style={{ marginTop: -8, marginBottom: 16, fontSize: '0.93rem' }}>
              All disclosed claims are cryptographically valid and consistent with the on-chain commitments.
              Enrollment Number: <strong className="mono">{result.proof.certId}</strong>
            </p>
          )}

          <div className="zk-verify-fields">
            {ATTRIBUTE_FIELDS.map(field => {
              const r = result.results[field];
              if (!r) return null;
              return <VerifyFieldRow key={field} field={field} result={r} />;
            })}
          </div>

          {result.proof.hiddenFields?.length > 0 && (
            <div className="zk-hidden-note">
              <strong>🔒 Privacy note:</strong> {result.proof.hiddenFields.length} attribute
              {result.proof.hiddenFields.length > 1 ? 's were' : ' was'} withheld by the prover.
              You cannot determine their values from the commitments alone — that is the zero-knowledge guarantee.
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ---- Single field result row in the verifier ----
function VerifyFieldRow({ field, result }) {
  const label = ATTRIBUTE_LABELS[field] || field;

  if (result.type === 'hidden') return (
    <div className="zk-vfield">
      <span className="zk-vfield-label">{label}</span>
      <span className="zk-vfield-badge hidden">🙈 Hidden</span>
      <span className="zk-vfield-val muted mono" style={{ fontSize: '0.78rem' }}>
        [REDACTED] — commitment: {result.commitment?.slice(0, 18)}…
      </span>
    </div>
  );

  if (result.type === 'disclosed') return (
    <div className="zk-vfield">
      <span className="zk-vfield-label">{label}</span>
      <span className={`zk-vfield-badge ${result.valid ? 'disclosed' : 'invalid'}`}>
        {result.valid ? '✅ Verified' : '❌ Invalid'}
      </span>
      <span className="zk-vfield-val">{String(result.value)}</span>
    </div>
  );

  if (result.type === 'range') return (
    <div className="zk-vfield">
      <span className="zk-vfield-label">{label}</span>
      <span className={`zk-vfield-badge ${result.valid ? 'range' : 'invalid'}`}>
        {result.valid ? '📊 Proved' : '❌ Failed'}
      </span>
      <span className="zk-vfield-val">
        {result.claim}: <strong>{result.satisfied ? '✅ Satisfied' : '❌ Not satisfied'}</strong>
        {!result.commitmentValid && <span className="muted"> (commitment mismatch)</span>}
      </span>
    </div>
  );

  return null;
}

export default ZKProof;
