import csv
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.pdfgen import canvas as pdfcanvas

OUT_DIR = r"C:\Projects\certificate-verification"

# ─────────────────────────────────────────────────────────────
# 1.  CSV FILE  (batch import demo)
# ─────────────────────────────────────────────────────────────
csv_path = os.path.join(OUT_DIR, "batch_certificates.csv")

students = [
    ("23BCE5001", "Dhananjai Pratap",   "VIT University"),
    ("23BAI1993", "Ananya Sharma",      "VIT University"),
    ("23BRS1224", "Rohan Mehta",        "VIT University"),
    ("23BDS1478", "Priya Nair",         "VIT University"),
    ("23BCE5082", "Arjun Verma",        "VIT University"),
    ("23BAI2047", "Sneha Patel",        "VIT University"),
    ("23BCS3301", "Karthik Rajan",      "VIT University"),
    ("23BME4412", "Divya Krishnan",     "VIT University"),
]

with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["enrollmentNo", "studentName", "collegeName"])
    writer.writerows(students)

print(f"CSV created: {csv_path}")

# ─────────────────────────────────────────────────────────────
# 2.  CERTIFICATE PDF
# ─────────────────────────────────────────────────────────────
pdf_path = os.path.join(OUT_DIR, "sample_certificate_23BCE5001.pdf")

W, H = A4   # 595 x 842 pt  (portrait)

GOLD        = colors.HexColor("#b8860b")
GOLD_LIGHT  = colors.HexColor("#f5e6a3")
GOLD_DARK   = colors.HexColor("#8b6914")
NAVY        = colors.HexColor("#0f172a")
NAVY_MID    = colors.HexColor("#1e3a5f")
WHITE       = colors.white
CREAM       = colors.HexColor("#fffdf5")
BORDER_GOLD = colors.HexColor("#d4a017")

def draw_certificate(c, width, height):
    # ── Background ──────────────────────────────────────────
    c.setFillColor(CREAM)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # ── Outer decorative border (double line) ───────────────
    margin = 22
    c.setStrokeColor(GOLD_DARK)
    c.setLineWidth(3)
    c.rect(margin, margin, width-2*margin, height-2*margin, fill=0, stroke=1)
    c.setLineWidth(1)
    inner = margin + 7
    c.rect(inner, inner, width-2*inner, height-2*inner, fill=0, stroke=1)

    # ── Corner ornaments ────────────────────────────────────
    size = 28
    corners = [
        (margin, margin),
        (width-margin-size, margin),
        (margin, height-margin-size),
        (width-margin-size, height-margin-size),
    ]
    c.setFillColor(GOLD)
    c.setStrokeColor(GOLD_DARK)
    c.setLineWidth(0.8)
    for (cx, cy) in corners:
        c.rect(cx, cy, size, size, fill=1, stroke=1)
        # inner diamond
        c.setFillColor(CREAM)
        mid_x, mid_y = cx + size/2, cy + size/2
        c.saveState()
        c.translate(mid_x, mid_y)
        c.rotate(45)
        c.rect(-7, -7, 14, 14, fill=1, stroke=0)
        c.restoreState()
        c.setFillColor(GOLD)

    # ── Top gold header band ─────────────────────────────────
    band_h = 72
    c.setFillColor(NAVY_MID)
    c.rect(inner+1, height-inner-band_h, width-2*(inner+1), band_h, fill=1, stroke=0)

    # Gold line below band
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.line(inner+1, height-inner-band_h, width-inner-1, height-inner-band_h)

    # ── University name in header ────────────────────────────
    c.setFillColor(GOLD_LIGHT)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width/2, height-inner-36, "VIT UNIVERSITY")
    c.setFillColor(WHITE)
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, height-inner-56, "Vellore Institute of Technology  |  Established 1984  |  NAAC A++ Accredited")

    # ── Shield / seal placeholder ────────────────────────────
    seal_x, seal_y, seal_r = width/2, height-inner-band_h-54, 38
    c.setFillColor(GOLD)
    c.setStrokeColor(GOLD_DARK)
    c.setLineWidth(1.5)
    c.circle(seal_x, seal_y, seal_r, fill=1, stroke=1)
    c.setFillColor(NAVY_MID)
    c.circle(seal_x, seal_y, seal_r-5, fill=1, stroke=0)
    c.setFillColor(GOLD_LIGHT)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(seal_x, seal_y+5,  "VIT")
    c.setFont("Helvetica", 7)
    c.drawCentredString(seal_x, seal_y-7, "UNIVERSITY")

    # ── "CERTIFICATE OF COMPLETION" title ───────────────────
    title_y = height - inner - band_h - 115
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width/2, title_y, "CERTIFICATE")
    c.setFont("Helvetica", 13)
    c.setFillColor(GOLD_DARK)
    c.drawCentredString(width/2, title_y-22, "O F   C O M P L E T I O N")

    # Gold ornament line
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    lx = width/2 - 100
    c.line(lx, title_y-34, lx+200, title_y-34)
    c.setFillColor(GOLD)
    c.circle(width/2, title_y-34, 3, fill=1, stroke=0)

    # ── Body text ────────────────────────────────────────────
    body_top = title_y - 60

    c.setFillColor(NAVY)
    c.setFont("Helvetica", 11)
    c.drawCentredString(width/2, body_top, "This is to certify that")

    # Student name
    c.setFont("Helvetica-BoldOblique", 30)
    c.setFillColor(NAVY_MID)
    c.drawCentredString(width/2, body_top-40, "Dhananjai Pratap")

    # Underline name
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    name_w = c.stringWidth("Dhananjai Pratap", "Helvetica-BoldOblique", 30)
    c.line(width/2 - name_w/2, body_top-46, width/2 + name_w/2, body_top-46)

    c.setFillColor(NAVY)
    c.setFont("Helvetica", 11)
    c.drawCentredString(width/2, body_top-68,
        "has successfully completed the requirements for the degree of")

    # Degree name
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(NAVY_MID)
    c.drawCentredString(width/2, body_top-96, "Bachelor of Technology")
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2, body_top-116, "Computer Science and Engineering")

    c.setFillColor(NAVY)
    c.setFont("Helvetica", 11)
    c.drawCentredString(width/2, body_top-140, "with a CGPA of")
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(GOLD_DARK)
    c.drawCentredString(width/2, body_top-160, "9.2 / 10.0")

    c.setFillColor(NAVY)
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, body_top-180,
        "Enrollment No: 23BCE5001  |  Academic Year: 2020 – 2024")

    # ── Horizontal divider ───────────────────────────────────
    div_y = body_top - 200
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(inner+30, div_y, width-inner-30, div_y)

    # ── Signatures ───────────────────────────────────────────
    sig_y = div_y - 55
    sig_positions = [inner+60, width/2 - 50, width-inner-110]
    sig_labels    = ["Registrar", "Dean — SCOPE", "Vice Chancellor"]
    sig_names     = ["Dr. R. Murugan", "Dr. S. Narayanan", "Dr. G. Viswanathan"]

    for sx, label, name in zip(sig_positions, sig_labels, sig_names):
        # Signature line
        c.setStrokeColor(NAVY_MID)
        c.setLineWidth(0.7)
        c.line(sx, sig_y+20, sx+100, sig_y+20)
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(NAVY)
        c.drawCentredString(sx+50, sig_y+8, name)
        c.setFont("Helvetica", 7.5)
        c.setFillColor(GOLD_DARK)
        c.drawCentredString(sx+50, sig_y-4, label)

    # ── Date + Enrollment strip ──────────────────────────────
    strip_y = inner + 18
    c.setFillColor(NAVY_MID)
    c.rect(inner+1, strip_y, width-2*(inner+1), 22, fill=1, stroke=0)
    c.setFillColor(GOLD_LIGHT)
    c.setFont("Helvetica", 8)
    c.drawString(inner+16, strip_y+7, "Date of Issue: June 25, 2024")
    c.drawCentredString(width/2, strip_y+7,
        "Verify at: http://localhost:3000/verify?certId=23BCE5001")
    c.drawRightString(width-inner-16, strip_y+7, "CertChain Blockchain Verified  ✓")

c_obj = pdfcanvas.Canvas(pdf_path, pagesize=A4)
draw_certificate(c_obj, W, H)
c_obj.save()
print(f"Certificate PDF created: {pdf_path}")
