from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

OUTPUT = r"C:\Projects\certificate-verification\CertChain_Advanced_Features.pdf"

# ── Colours ──────────────────────────────────────────────────────────────────
BRAND      = colors.HexColor("#4f46e5")   # indigo
BRAND_DARK = colors.HexColor("#3730a3")
ACCENT     = colors.HexColor("#06b6d4")   # cyan
SUCCESS    = colors.HexColor("#16a34a")
BG_LIGHT   = colors.HexColor("#f8fafc")
BG_CODE    = colors.HexColor("#1e1e2e")   # dark code bg
CODE_TEXT  = colors.HexColor("#cdd6f4")
BORDER     = colors.HexColor("#e2e8f0")
TEXT_MAIN  = colors.HexColor("#1e293b")
TEXT_MUTED = colors.HexColor("#64748b")
WHITE      = colors.white
YELLOW_BG  = colors.HexColor("#fffbeb")
YELLOW_BD  = colors.HexColor("#f59e0b")

# ── Styles ────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def s(name, **kw):
    return ParagraphStyle(name, **kw)

TITLE_STYLE = s("MyTitle",
    fontSize=30, textColor=WHITE, alignment=TA_CENTER,
    fontName="Helvetica-Bold", leading=38, spaceAfter=8)

SUBTITLE_STYLE = s("MySub",
    fontSize=14, textColor=colors.HexColor("#c7d2fe"),
    alignment=TA_CENTER, fontName="Helvetica", leading=20, spaceAfter=6)

BADGE_STYLE = s("Badge",
    fontSize=11, textColor=WHITE, alignment=TA_CENTER,
    fontName="Helvetica-Bold", leading=16)

H1 = s("H1",
    fontSize=20, textColor=BRAND_DARK, fontName="Helvetica-Bold",
    leading=26, spaceBefore=18, spaceAfter=6)

H2 = s("H2",
    fontSize=14, textColor=BRAND, fontName="Helvetica-Bold",
    leading=20, spaceBefore=12, spaceAfter=4)

BODY = s("Body",
    fontSize=10.5, textColor=TEXT_MAIN, fontName="Helvetica",
    leading=16, spaceAfter=6, alignment=TA_JUSTIFY)

BODY_BOLD = s("BodyBold",
    fontSize=10.5, textColor=TEXT_MAIN, fontName="Helvetica-Bold",
    leading=16, spaceAfter=4)

CODE_STYLE = s("Code",
    fontSize=8.5, textColor=CODE_TEXT, fontName="Courier",
    leading=13, spaceAfter=2, backColor=BG_CODE,
    leftIndent=8, rightIndent=8)

MUTED = s("Muted",
    fontSize=9.5, textColor=TEXT_MUTED, fontName="Helvetica",
    leading=14, spaceAfter=4)

TOC_ITEM = s("TOC",
    fontSize=11, textColor=TEXT_MAIN, fontName="Helvetica",
    leading=20, leftIndent=20)

LABEL = s("Label",
    fontSize=9, textColor=WHITE, fontName="Helvetica-Bold",
    leading=12, alignment=TA_CENTER)

PAGE_NUM = s("PageNum",
    fontSize=9, textColor=TEXT_MUTED, fontName="Helvetica",
    leading=12, alignment=TA_CENTER)


# ── Helpers ───────────────────────────────────────────────────────────────────

def code_block(lines):
    """Return a Table that looks like a dark code block."""
    rows = [[Paragraph(line.replace(" ", "&nbsp;").replace("<", "&lt;").replace(">", "&gt;"),
                       CODE_STYLE)]
            for line in lines]
    t = Table(rows, colWidths=[16.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), BG_CODE),
        ("ROUNDEDCORNERS", [6]),
        ("BOX",         (0,0), (-1,-1), 0.5, colors.HexColor("#313244")),
        ("TOPPADDING",  (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING",(0,0), (-1,-1), 10),
    ]))
    return t


def section_badge(number, colour):
    """Coloured number badge for section headings."""
    t = Table([[Paragraph(str(number), LABEL)]], colWidths=[1*cm], rowHeights=[0.7*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), colour),
        ("ROUNDEDCORNERS",[8]),
        ("ALIGN",         (0,0), (-1,-1), "CENTER"),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    return t


def info_box(text, bg=YELLOW_BG, border=YELLOW_BD):
    t = Table([[Paragraph(text, BODY)]], colWidths=[16.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), bg),
        ("BOX",           (0,0), (-1,-1), 1, border),
        ("ROUNDEDCORNERS",[6]),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ("RIGHTPADDING",  (0,0), (-1,-1), 12),
    ]))
    return t


def feature_header(num, title, colour):
    badge = Table([[Paragraph(f"Feature {num}", LABEL)]], colWidths=[2.2*cm], rowHeights=[0.65*cm])
    badge.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), colour),
        ("ROUNDEDCORNERS",[6]),
        ("ALIGN",         (0,0),(-1,-1),"CENTER"),
        ("VALIGN",        (0,0),(-1,-1),"MIDDLE"),
    ]))
    heading = Paragraph(title, H1)
    t = Table([[badge, heading]], colWidths=[2.5*cm, 14*cm])
    t.setStyle(TableStyle([
        ("VALIGN",       (0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",  (0,0),(-1,-1), 0),
        ("RIGHTPADDING", (0,0),(-1,-1), 0),
        ("TOPPADDING",   (0,0),(-1,-1), 0),
        ("BOTTOMPADDING",(0,0),(-1,-1), 0),
    ]))
    return t


# ── Page callbacks ────────────────────────────────────────────────────────────

def title_page_bg(canvas, doc):
    canvas.saveState()
    w, h = A4
    # Deep gradient background
    canvas.setFillColor(BRAND_DARK)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    # Accent strip
    canvas.setFillColor(BRAND)
    canvas.rect(0, h*0.38, w, h*0.62, fill=1, stroke=0)
    # Decorative circles
    canvas.setFillColor(colors.HexColor("#6366f1"))
    canvas.circle(w+40, h-60, 160, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#4338ca"))
    canvas.circle(-40, 80, 120, fill=1, stroke=0)
    canvas.restoreState()


def normal_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    # Top bar
    canvas.setFillColor(BRAND)
    canvas.rect(0, h-1.1*cm, w, 1.1*cm, fill=1, stroke=0)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(WHITE)
    canvas.drawString(1.5*cm, h-0.7*cm, "CertChain — Advanced Feature Documentation")
    canvas.drawRightString(w-1.5*cm, h-0.7*cm, "Blockchain Certificate Verification System")
    # Bottom bar
    canvas.setFillColor(BG_LIGHT)
    canvas.rect(0, 0, w, 0.9*cm, fill=1, stroke=0)
    canvas.setFillColor(BORDER)
    canvas.rect(0, 0.9*cm, w, 0.04*cm, fill=1, stroke=0)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(w/2, 0.3*cm, f"Page {doc.page}")
    canvas.drawString(1.5*cm, 0.3*cm, "Review 2 — Extra Features")
    canvas.drawRightString(w-1.5*cm, 0.3*cm, "VIT University")
    canvas.restoreState()


# ── Story ─────────────────────────────────────────────────────────────────────

story = []

# ════════════════════════════════════════════════════════════════
# TITLE PAGE
# ════════════════════════════════════════════════════════════════
story.append(Spacer(1, 3.5*cm))
story.append(Paragraph("CertChain", TITLE_STYLE))
story.append(Paragraph("Advanced Feature Documentation", SUBTITLE_STYLE))
story.append(Spacer(1, 0.4*cm))

# Divider line
div = Table([[""]], colWidths=[6*cm], rowHeights=[0.08*cm])
div.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1), colors.HexColor("#818cf8"))]))
story.append(div)
story.append(Spacer(1, 0.5*cm))

story.append(Paragraph("Blockchain-Based Certificate Verification System", SUBTITLE_STYLE))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("Review 2 — Extra Features", ParagraphStyle("rev",
    fontSize=12, textColor=colors.HexColor("#a5b4fc"),
    alignment=TA_CENTER, fontName="Helvetica", leading=18)))

story.append(Spacer(1, 2.5*cm))

# Feature count pills
pills_data = [["5", "Extra\nFeatures"], ["SHA-256", "Tamper\nDetection"],
              ["ERC-721", "Soulbound\nNFT"], ["ZK", "Zero-Knowledge\nProof"]]
pill_cells = []
for val, lbl in pills_data:
    cell_content = [
        Paragraph(val, ParagraphStyle("pv", fontSize=18, textColor=WHITE,
                                      fontName="Helvetica-Bold", alignment=TA_CENTER, leading=22)),
        Paragraph(lbl, ParagraphStyle("pl", fontSize=8, textColor=colors.HexColor("#c7d2fe"),
                                      fontName="Helvetica", alignment=TA_CENTER, leading=11)),
    ]
    pill_cells.append(cell_content)

pills_t = Table([pill_cells], colWidths=[3.8*cm]*4)
pills_t.setStyle(TableStyle([
    ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor("#4338ca")),
    ("BOX",           (0,0),(-1,-1), 1, colors.HexColor("#6366f1")),
    ("LINEAFTER",     (0,0),(2,0),   0.5, colors.HexColor("#6366f1")),
    ("ALIGN",         (0,0),(-1,-1), "CENTER"),
    ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
    ("TOPPADDING",    (0,0),(-1,-1), 10),
    ("BOTTOMPADDING", (0,0),(-1,-1), 10),
    ("ROUNDEDCORNERS",[8]),
]))
story.append(pills_t)

story.append(Spacer(1, 2*cm))
story.append(Paragraph("Prepared by: Dhananjai Pratap", ParagraphStyle("auth",
    fontSize=10, textColor=colors.HexColor("#94a3b8"),
    alignment=TA_CENTER, fontName="Helvetica", leading=16)))
story.append(Paragraph("VIT University — B.Tech Computer Science", ParagraphStyle("inst",
    fontSize=10, textColor=colors.HexColor("#94a3b8"),
    alignment=TA_CENTER, fontName="Helvetica", leading=16)))
story.append(Paragraph("2024–25", ParagraphStyle("yr",
    fontSize=10, textColor=colors.HexColor("#94a3b8"),
    alignment=TA_CENTER, fontName="Helvetica", leading=16)))

story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ════════════════════════════════════════════════════════════════
story.append(Spacer(1, 0.6*cm))
story.append(Paragraph("Table of Contents", H1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

toc_items = [
    ("1", "Live Tamper Detection with SHA-256 File Hashing", "3"),
    ("2", "Soulbound NFT — ERC-721 Non-Transferable Token",  "4"),
    ("3", "Analytics Dashboard from On-Chain Events",         "5"),
    ("4", "Batch Issuance via CSV Upload",                    "6"),
    ("5", "Zero-Knowledge Proof — Selective Disclosure",      "7"),
    ("",  "Summary Comparison Table",                         "9"),
]

for num, title, page in toc_items:
    prefix = f"<b>Feature {num} —</b> " if num else "<b>"
    suffix = "</b>" if not num else ""
    dots = "." * max(2, 60 - len(title))
    row_data = [[
        Paragraph(f"{prefix}{title}{suffix}", TOC_ITEM),
        Paragraph(f"<b>{page}</b>", ParagraphStyle("pn",
            fontSize=11, textColor=BRAND, fontName="Helvetica-Bold",
            alignment=TA_CENTER, leading=20)),
    ]]
    row_t = Table(row_data, colWidths=[14.5*cm, 2*cm])
    row_t.setStyle(TableStyle([
        ("LINEBELOW",    (0,0),(0,0), 0.3, BORDER),
        ("TOPPADDING",   (0,0),(-1,-1), 4),
        ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ("LEFTPADDING",  (0,0),(-1,-1), 0),
    ]))
    story.append(row_t)

story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# FEATURE 1 — TAMPER DETECTION
# ════════════════════════════════════════════════════════════════
story.append(Spacer(1, 0.4*cm))
story.append(feature_header(1, "Live Tamper Detection with SHA-256", SUCCESS))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=8))

story.append(Paragraph("Feature Overview", H2))
story.append(Paragraph(
    "When a certificate PDF is issued, the app computes a SHA-256 cryptographic fingerprint "
    "of the file and stores it permanently on the blockchain. During verification, anyone can "
    "upload the PDF — the app recomputes the fingerprint and compares it against the on-chain "
    "value. Any modification — even changing a single byte — produces a completely different "
    "hash and instantly triggers a tamper alert.", BODY))

story.append(Paragraph("How It Works — Simple Explanation", H2))
story.append(info_box(
    "Think of it like a wax seal on an envelope. If anyone opens and reseals it, the seal "
    "looks different. SHA-256 does the same for files — any change, no matter how small, "
    "produces a completely different 64-character fingerprint."))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("Technical Implementation", H2))
story.append(Paragraph(
    "The implementation uses the browser's built-in <b>Web Crypto API</b> — "
    "no external library is required. The hash is computed entirely on the client side "
    "before the transaction is sent.", BODY))

bullets = [
    "file.arrayBuffer() — converts the PDF to raw bytes (0s and 1s)",
    "crypto.subtle.digest('SHA-256', buffer) — browser's native SHA-256 implementation",
    "Result converted to a hex string prefixed with 0x and stored in the Certificate struct",
    "On verify: same function runs on the uploaded file and result compared with cert.fileHash",
]
for b in bullets:
    story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;• {b}", BODY))

story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("Code — frontend/src/utils/hashFile.js", BODY_BOLD))
story.append(code_block([
    "export const hashFileSHA256 = async (file) => {",
    "  const buffer    = await file.arrayBuffer();",
    "  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);",
    "  const hashArray  = Array.from(new Uint8Array(hashBuffer));",
    "  return '0x' + hashArray.map(b => b.toString(16).padStart(2,'0')).join('');",
    "};",
]))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph(
    "<b>Code Reference:</b> frontend/src/utils/hashFile.js · "
    "frontend/src/pages/VerifyCertificate.js (handleTamperFile)", MUTED))

story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# FEATURE 2 — SOULBOUND NFT
# ════════════════════════════════════════════════════════════════
story.append(Spacer(1, 0.4*cm))
story.append(feature_header(2, "Soulbound NFT — ERC-721 Non-Transferable Token", BRAND))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=8))

story.append(Paragraph("Feature Overview", H2))
story.append(Paragraph(
    "Every certificate issued also mints a unique ERC-721 NFT to the student's wallet. "
    "Unlike normal NFTs, this token cannot be transferred or sold — it is permanently bound "
    "to the student's wallet. The token ID is stored in the Certificate struct and displayed "
    "on both the Issue and Verify pages.", BODY))

story.append(Paragraph("How It Works — Simple Explanation", H2))
story.append(info_box(
    "Think of it like a trophy with your name engraved on it. You can display it, but you "
    "cannot sell it to someone else. A normal NFT degree could be bought and sold — defeating "
    "the purpose of credential verification. Soulbound blocks this completely."))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("Technical Implementation", H2))
story.append(Paragraph(
    "The contract inherits OpenZeppelin's ERC721 standard. The <b>_beforeTokenTransfer</b> "
    "hook is overridden — this function runs automatically before every transfer attempt.", BODY))

bullets2 = [
    "from == address(0)  →  this is a mint (creating from nothing) — ALLOWED",
    "from == any wallet  →  this is a transfer — BLOCKED with 'Soulbound: non-transferable'",
    "_safeMint(studentWallet, tokenId) inside issueCertificate() creates the token",
    "OpenZeppelin v4.9.3 used — industry-standard NFT library",
]
for b in bullets2:
    story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;• {b}", BODY))

story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("Code — contract/contracts/CertificateVerification.sol", BODY_BOLD))
story.append(code_block([
    "// Block all transfers — only minting (from == address(0)) is allowed",
    "function _beforeTokenTransfer(",
    "    address from, address to, uint256 tokenId",
    ") override internal {",
    "    require(from == address(0), 'Soulbound: non-transferable');",
    "}",
    "",
    "// Minting inside issueCertificate()",
    "if (studentWallet != address(0)) {",
    "    _safeMint(studentWallet, newTokenId);",
    "}",
]))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph(
    "<b>Code Reference:</b> contract/contracts/CertificateVerification.sol", MUTED))

story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# FEATURE 3 — ANALYTICS
# ════════════════════════════════════════════════════════════════
story.append(Spacer(1, 0.4*cm))
story.append(feature_header(3, "Analytics Dashboard from On-Chain Events", ACCENT))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=8))

story.append(Paragraph("Feature Overview", H2))
story.append(Paragraph(
    "A live dashboard showing total certificates issued, active certificates, revoked "
    "certificates, a breakdown by college (bar chart), and a recent issuance activity feed. "
    "All data is read directly from blockchain events — there is no separate database.", BODY))

story.append(Paragraph("How It Works — Simple Explanation", H2))
story.append(info_box(
    "Every time a certificate is issued, the smart contract fires an 'event' — like a "
    "notification logged permanently on the blockchain. The analytics page reads all those "
    "notifications and counts them. Because it's on the blockchain, the stats cannot be "
    "faked or edited."))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("Technical Implementation", H2))
bullets3 = [
    "Smart contract emits CertificateIssued and CertificateRevoked Solidity events",
    "ethers.js contract.queryFilter() fetches all matching event logs",
    "Stats (total, active, revoked, by college) computed from the log array",
    "Bar chart built with pure CSS — no charting library needed",
    "Recent activity list shows last 10 issuances with NFT badges",
]
for b in bullets3:
    story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;• {b}", BODY))

story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("Solidity Event & JS Query", BODY_BOLD))
story.append(code_block([
    "// Solidity — event emitted on every issuance",
    "event CertificateIssued(",
    "    string certId, string studentName, string collegeName,",
    "    address issuedBy, uint256 issuedAt, uint256 tokenId",
    ");",
    "",
    "// JavaScript — query all past events",
    "const issuedLogs = await contract.queryFilter(",
    "    contract.filters.CertificateIssued()",
    ");",
    "const totalIssued = issuedLogs.length;",
]))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph(
    "<b>Code Reference:</b> frontend/src/pages/Analytics.js · "
    "frontend/src/utils/contract.js (getAnalyticsData)", MUTED))

story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# FEATURE 4 — BATCH CSV
# ════════════════════════════════════════════════════════════════
story.append(Spacer(1, 0.4*cm))
story.append(feature_header(4, "Batch Issuance via CSV Upload", colors.HexColor("#d97706")))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=8))

story.append(Paragraph("Feature Overview", H2))
story.append(Paragraph(
    "Instead of issuing certificates one by one, a college can upload a CSV file containing "
    "multiple student records. The app parses the CSV in the browser, issues each certificate "
    "as a separate blockchain transaction, and shows a real-time progress bar with per-row "
    "success and failure results.", BODY))

story.append(Paragraph("How It Works — Simple Explanation", H2))
story.append(info_box(
    "Like sending bulk SMS — instead of texting 500 students one by one, you upload a list "
    "and the system processes all of them automatically, showing live progress as each "
    "transaction confirms on the blockchain."))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("Technical Implementation", H2))
bullets4 = [
    "Custom CSV parser — no library used; handles quoted fields and trims whitespace",
    "CSV columns: enrollmentNo, studentName, collegeName",
    "Each row calls issueCertificate() on the smart contract as a separate transaction",
    "SHA-256 hash derived from row data (enrollmentNo|studentName|collegeName) — no PDF per row",
    "Progress bar updates in real time after each transaction completes",
    "Download Template button provides a pre-formatted CSV the college can fill in",
]
for b in bullets4:
    story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;• {b}", BODY))

story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("CSV Format & Parser", BODY_BOLD))
story.append(code_block([
    "// CSV Template format",
    "enrollmentNo,studentName,collegeName",
    "23BCE5001,Dhananjai Pratap,VIT University",
    "23BAI1993,Ananya Sharma,VIT University",
    "23BRS1224,Rohan Mehta,VIT University",
    "",
    "// Custom parser (no library)",
    "const parseCSV = (text) => {",
    "  const lines = text.trim().split(/\\r?\\n/);",
    "  const headers = lines[0].split(',').map(h => h.trim());",
    "  return lines.slice(1).map(line => {",
    "    const values = line.split(',').map(v => v.trim());",
    "    return headers.reduce((obj,h,i) =>",
    "      ({...obj, [h]: values[i] || ''}), {});",
    "  });",
    "};",
]))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph(
    "<b>Code Reference:</b> frontend/src/pages/IssueCertificate.js (Batch CSV Import mode)", MUTED))

story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# FEATURE 5 — ZK PROOF
# ════════════════════════════════════════════════════════════════
story.append(Spacer(1, 0.4*cm))
story.append(feature_header(5, "Zero-Knowledge Proof — Selective Disclosure",
                             colors.HexColor("#7c3aed")))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=8))

story.append(Paragraph("Feature Overview", H2))
story.append(Paragraph(
    "A student can generate a cryptographic proof that reveals only selected attributes of "
    "their certificate. For example: prove CGPA is greater than or equal to 8.5 without "
    "revealing the actual CGPA, hide graduation year completely, but reveal college name. "
    "The employer receives a shareable URL and verifies the proof without seeing hidden fields.", BODY))

story.append(Paragraph("How It Works — Simple Explanation", H2))
story.append(info_box(
    "Like showing your age at a bar. The bouncer needs to know you are 18+. He does not need "
    "your name, address, or exact birthdate. You prove the claim without revealing the full "
    "information. Our ZK proof does the same for degree credentials."))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("Three Disclosure Modes", H2))
modes_data = [
    ["Mode", "What the Employer Sees", "Example"],
    ["Reveal", "Exact value", "College = VIT University"],
    ["Range Proof", "Only threshold result", "CGPA >= 8.5  Satisfied"],
    ["Hidden", "Nothing — [REDACTED]", "Graduation Year = [REDACTED]"],
]
modes_t = Table(modes_data, colWidths=[3.5*cm, 6*cm, 7*cm])
modes_t.setStyle(TableStyle([
    ("BACKGROUND",    (0,0),(-1,0), BRAND),
    ("TEXTCOLOR",     (0,0),(-1,0), WHITE),
    ("FONTNAME",      (0,0),(-1,0), "Helvetica-Bold"),
    ("FONTSIZE",      (0,0),(-1,-1), 9.5),
    ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, BG_LIGHT]),
    ("GRID",          (0,0),(-1,-1), 0.4, BORDER),
    ("TOPPADDING",    (0,0),(-1,-1), 6),
    ("BOTTOMPADDING", (0,0),(-1,-1), 6),
    ("LEFTPADDING",   (0,0),(-1,-1), 8),
    ("ROUNDEDCORNERS",[4]),
]))
story.append(modes_t)
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("Cryptographic Scheme — SHA-256 Hash Commitments", H2))
story.append(Paragraph(
    "For each attribute a unique random 32-byte nonce is generated. "
    "The commitment is computed and stored publicly. The nonce stays private with the student.", BODY))
story.append(code_block([
    "// Commitment formula",
    "C(field, value) = SHA-256( field + ':' + value + '||' + nonce )",
    "",
    "// Reveal: student shares (value, nonce)",
    "// Verifier checks: SHA-256(field:value||nonce) == C  →  VALID",
    "",
    "// Range: student shares (value, nonce)",
    "// Verifier checks: commitment valid AND value >= threshold",
    "",
    "// Hidden: only commitment shown — value is mathematically concealed",
]))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph("Shareable Proof URL", H2))
story.append(Paragraph(
    "The entire proof object (commitments, disclosures, range claims) is serialised as JSON, "
    "encoded as URL-safe base64, and appended as a <b>?proof=</b> query parameter. "
    "The employer simply opens the link — no app installation or account needed. "
    "The Verify page auto-decodes and verifies the proof on load.", BODY))
story.append(code_block([
    "// Encode proof as URL-safe base64",
    "export const encodeProof = (proof) =>",
    "  btoa(JSON.stringify(proof))",
    "    .replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');",
    "",
    "// Shareable URL",
    "const proofUrl = window.location.origin + '/zkproof?proof=' + encodeProof(proof);",
]))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph(
    "<b>Code Reference:</b> frontend/src/utils/zkProof.js · "
    "frontend/src/pages/ZKProof.js", MUTED))

story.append(PageBreak())

# ════════════════════════════════════════════════════════════════
# SUMMARY TABLE
# ════════════════════════════════════════════════════════════════
story.append(Spacer(1, 0.4*cm))
story.append(Paragraph("Summary — All 5 Extra Features", H1))
story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

summary_data = [
    ["#", "Feature", "One-Line Summary", "Tech Used", "Files"],
    ["1", "Live Tamper\nDetection",
     "Any modification to the PDF\nis caught instantly",
     "Web Crypto API\nSHA-256",
     "hashFile.js\nVerifyCertificate.js"],
    ["2", "Soulbound\nNFT",
     "Credential permanently tied\nto graduate's wallet",
     "ERC-721\nOpenZeppelin v4",
     "CertificateVerification\n.sol"],
    ["3", "Analytics\nDashboard",
     "Live stats from blockchain\nevents — impossible to fake",
     "ethers.js\nqueryFilter()",
     "Analytics.js\ncontract.js"],
    ["4", "Batch CSV\nImport",
     "Issue hundreds of certificates\nfrom one CSV upload",
     "Custom CSV parser\nLoop + progress bar",
     "IssueCertificate\n.js"],
    ["5", "ZK Selective\nDisclosure",
     "Prove claims without revealing\nprivate data",
     "SHA-256 commitments\nBase64 URL encoding",
     "zkProof.js\nZKProof.js"],
]

col_w = [0.6*cm, 2.6*cm, 4.8*cm, 3.5*cm, 4*cm]
summary_t = Table(summary_data, colWidths=col_w, repeatRows=1)
summary_t.setStyle(TableStyle([
    ("BACKGROUND",    (0,0),(-1,0),  BRAND),
    ("TEXTCOLOR",     (0,0),(-1,0),  WHITE),
    ("FONTNAME",      (0,0),(-1,0),  "Helvetica-Bold"),
    ("FONTSIZE",      (0,0),(-1,-1), 8.5),
    ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, BG_LIGHT]),
    ("GRID",          (0,0),(-1,-1), 0.4, BORDER),
    ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
    ("TOPPADDING",    (0,0),(-1,-1), 7),
    ("BOTTOMPADDING", (0,0),(-1,-1), 7),
    ("LEFTPADDING",   (0,0),(-1,-1), 6),
    ("BACKGROUND",    (0,1),(0,1),   colors.HexColor("#dcfce7")),
    ("BACKGROUND",    (0,2),(0,2),   colors.HexColor("#e0e7ff")),
    ("BACKGROUND",    (0,3),(0,3),   colors.HexColor("#cffafe")),
    ("BACKGROUND",    (0,4),(0,4),   colors.HexColor("#fef3c7")),
    ("BACKGROUND",    (0,5),(0,5),   colors.HexColor("#f3e8ff")),
    ("ROUNDEDCORNERS",[4]),
]))
story.append(summary_t)

story.append(Spacer(1, 1.2*cm))

# Closing note
closing = Table([[Paragraph(
    "All five features are fully implemented, tested, and running live on a local Hardhat "
    "blockchain with real Pinata IPFS integration. The project demonstrates advanced blockchain "
    "concepts including cryptographic hash commitments, soulbound token mechanics, on-chain "
    "event indexing, and selective zero-knowledge disclosure — implemented from scratch "
    "without heavy ZK libraries.",
    ParagraphStyle("closing", fontSize=10, textColor=TEXT_MAIN, fontName="Helvetica",
                   leading=16, alignment=TA_JUSTIFY))
]], colWidths=[16.5*cm])
closing.setStyle(TableStyle([
    ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor("#f0f9ff")),
    ("BOX",           (0,0),(-1,-1), 1, ACCENT),
    ("ROUNDEDCORNERS",[6]),
    ("TOPPADDING",    (0,0),(-1,-1), 12),
    ("BOTTOMPADDING", (0,0),(-1,-1), 12),
    ("LEFTPADDING",   (0,0),(-1,-1), 14),
    ("RIGHTPADDING",  (0,0),(-1,-1), 14),
]))
story.append(closing)

# ── Build ─────────────────────────────────────────────────────────────────────

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=1.8*cm, rightMargin=1.8*cm,
    topMargin=1.5*cm,  bottomMargin=1.5*cm,
    title="CertChain — Advanced Feature Documentation",
    author="Dhananjai Pratap",
    subject="Blockchain Certificate Verification — Extra Features",
)

def get_frame(canvas, doc):
    if doc.page == 1:
        title_page_bg(canvas, doc)
    else:
        normal_page(canvas, doc)

doc.build(story, onFirstPage=get_frame, onLaterPages=get_frame)
print(f"PDF created: {OUTPUT}")
