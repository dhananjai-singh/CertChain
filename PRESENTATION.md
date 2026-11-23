# Review 2 — Presentation Guide
### Decentralized Academic Certificate Verification System

---

## 1. 30-second elevator pitch
"Fake degrees are a huge problem — employers can't easily tell a real certificate
from a Photoshopped one. My system lets a college issue a certificate that is
recorded on a **blockchain**, so it can never be edited or deleted. The actual PDF
is stored on **IPFS** (decentralized storage), and the blockchain stores its
fingerprint. Anyone — an employer — can scan a **QR code** and instantly confirm
whether a certificate is genuine, revoked, or fake. No central authority to trust
or bribe."

## 2. The problem it solves
- Paper/PDF certificates are trivially forged.
- Central databases can be hacked, edited, or shut down.
- Verifying a degree today means emailing the university and waiting days.
- **Blockchain solves this**: records are immutable, public, and always available.

## 3. How it works (the data flow — know this cold)
1. **College logs in** with MetaMask (its wallet = its identity).
2. College **uploads the certificate PDF** → it goes to **IPFS via Pinata** →
   IPFS returns a **CID** (a content hash that uniquely fingerprints that file).
3. The **smart contract** stores: student name, college name, certificate ID,
   the IPFS CID, the issuer's address, a timestamp, and a validity flag — all
   on-chain.
4. A **QR code** is generated containing a verification URL with the certificate ID.
5. An **employer scans the QR** → the site calls the smart contract's read
   function → shows **Genuine / Revoked / Not Found**, plus a link to the PDF on IPFS.

> Key insight to state: "The PDF itself is NOT on the blockchain (too expensive).
> Only its **hash/CID** is. If anyone changes even one byte of the PDF, its CID
> changes, so it won't match what's on-chain — that's how tampering is detected."

## 4. Tech stack (and why each)
| Layer | Tech | Why |
|---|---|---|
| Smart contract | **Solidity** | The language for Ethereum/Polygon contracts |
| Dev/test/deploy | **Hardhat** | Compile, test, deploy, local blockchain |
| Access control | **OpenZeppelin Ownable** | Battle-tested owner/whitelist pattern |
| Blockchain | **Polygon** (Amoy testnet / local) | Cheap, fast, EVM-compatible vs Ethereum |
| File storage | **IPFS via Pinata** | Decentralized; storing PDFs on-chain is infeasible |
| Frontend | **React + React Router** | Component UI + Issue/Verify pages |
| Chain bridge | **ethers.js v6** | JS library to call the contract from the browser |
| Wallet/login | **MetaMask** | Signs transactions; the college's identity |
| QR | **qrcode** | Generates the scannable verification code |

## 5. What's DONE (Review 2 — ~50%)
- **Smart contract is fully written and compiles** (`CertificateVerification.sol`):
  - `issueCertificate`, `verifyCertificate`, `revokeCertificate`
  - College **whitelist**: `addCollege` / `removeCollege` / `isCollegeWhitelisted`
  - Events, input validation, duplicate-prevention, owner-only & college-only guards
- **Hardhat project** configured, contract **deploys successfully** (verified on a
  local chain), deploy script auto-whitelists and syncs the frontend.
- **React frontend** complete: Home, **Issue** (PDF → IPFS → record → QR),
  **Verify** (manual + auto-verify from QR), wallet connect, network handling.
- **ethers.js + Pinata integration code** written for the real chain + IPFS.
- Running today in a **demo mode** so the full UX flow is smooth end-to-end.

## 6. What's LEFT (final review — the other ~50%)
- **Live on-chain transactions** end-to-end through MetaMask on **Polygon Amoy**
  testnet (contract is deploy-ready; wiring the live signed transactions + real
  Pinata uploads into the running UI is the main remaining integration).
- **Revoke Certificate UI** — the contract function exists; needs a front-end button.
- **College admin panel** — UI for the owner to whitelist colleges (`addCollege`).
- **Certificate history** via reading contract **events**; in-app **PDF preview**.
- Polish: error states, loading UX, deployed/hosted build, Polygonscan verification.

## 7. Live demo steps (do this on screen)
1. Show **Home** — explain the flow using the "How it works" steps.
2. **Issue** → upload `samples/certificate_VIT2024CSE001.pdf`, ID `VIT2024CSE001`,
   "Dhananjai Pratap", "VIT University" → **Issue** → show the **QR code**.
3. **Verify** → enter `VIT2024CSE001` → **Genuine**, details match the PDF.
4. **Verify** → enter `FAKE999` → **Not Verified** → "forgery is caught."

---

## 8. Questions he might ask — and strong answers

**Q: Why blockchain instead of a normal database?**
A: A database has an owner who can edit or delete records, and it can be hacked or
go offline. A blockchain record is **immutable** (can't be changed), **distributed**
(no single point of failure), and **publicly auditable**. For trust-critical data
like degrees, that's exactly what you want.

**Q: Do you store the PDF on the blockchain?**
A: No — that would be enormously expensive (gas cost scales with data). I store the
PDF on **IPFS** and put only its **CID (content hash)** on-chain. The hash both
locates the file and acts as a tamper-proof fingerprint.

**Q: How does this actually detect a fake/tampered certificate?**
A: Two ways. (1) The certificate ID must exist on-chain and be marked valid — a made-up
ID returns "Not Found." (2) IPFS CIDs are content-addressed: if someone edits the PDF,
its CID changes, so it no longer matches the CID stored on-chain.

**Q: What stops a random person from issuing fake certificates?**
A: A **whitelist**. Only wallet addresses approved by the contract owner (via
`addCollege`) can call `issueCertificate`. This is enforced by the
`onlyWhitelistedCollege` modifier in Solidity — non-whitelisted wallets are rejected
by the contract itself.

**Q: What is a smart contract / how does the whitelist work technically?**
A: A smart contract is code deployed on the blockchain that runs exactly as written.
Mine uses OpenZeppelin's `Ownable` so the deployer is the owner. The owner maps
approved addresses to `true` in a `mapping(address => bool)`. A Solidity **modifier**
checks `require(whitelistedColleges[msg.sender])` before issuing, so the rule is
enforced on-chain, not in the frontend (which could be bypassed).

**Q: Can a certificate be revoked or deleted?**
A: It can be **revoked**, not deleted — we never erase blockchain history. `revokeCertificate`
flips an `isValid` flag to false, and only the **college that issued it** can revoke it
(checked via `msg.sender == issuedBy`). Verification then shows "Revoked."

**Q: Why Polygon and not Ethereum?**
A: Polygon is EVM-compatible (same Solidity, same tools) but transactions cost a tiny
fraction of Ethereum's gas fees and confirm faster — practical for issuing many
certificates. I target the Polygon **Amoy** testnet (Mumbai was retired by Polygon in 2024).

**Q: What's gas / who pays?**
A: Gas is the fee to run a write transaction. **Issuing** is a write, so the college
pays a small gas fee. **Verifying** is a read-only call — it's **free** and needs no wallet.

**Q: What does ethers.js / MetaMask do here?**
A: MetaMask holds the college's private key and signs transactions; it's the login.
ethers.js is the JavaScript library that lets my React app talk to the contract —
encoding function calls, sending them through MetaMask, and reading results back.

**Q: What is IPFS / what's a CID?**
A: IPFS is a peer-to-peer file storage network. Instead of a URL pointing to a server,
files are addressed by a **CID** — a hash of the content itself. Same file = same CID;
changed file = different CID. Pinata is a service that "pins" (keeps hosting) my file on IPFS.

**Q: What are the limitations / future work?**
A: Live testnet wiring and the revoke/admin UIs are the remaining 50%. Future ideas:
batch issuance, role-based access for multiple departments, hashing the PDF on-chain as
an extra integrity check, and a hosted public deployment.

**Q: Why is it in "demo mode" right now?**
A: To show the complete user flow smoothly without depending on live wallet popups and
network latency during the review. The real contract is written and deploys to the chain
— connecting the live signed transactions and IPFS uploads into this UI is my final-review
milestone.

---

### One-line honest summary for the teacher
"The backend (smart contract) and the full frontend are built; today I'm demonstrating
the complete flow in a local demo mode. The remaining work is wiring the live blockchain
transactions and IPFS uploads end-to-end, plus the revoke and admin screens — that's my
final review."
