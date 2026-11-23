# Generates demo certificate PDFs for the Certificate Verification system.
import os
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

PURPLE      = colors.HexColor("#5b21b6")
PURPLE_LT   = colors.HexColor("#6d28d9")
GOLD        = colors.HexColor("#b08d2e")
GREY        = colors.HexColor("#444444")
LIGHT_GREY  = colors.HexColor("#777777")

# (filename, suggested cert id, student, degree, college, date)
CERTS = [
    ("certificate_VIT2024CSE001.pdf", "VIT2024CSE001", "Dhananjai Pratap",
     "Bachelor of Technology in Computer Science and Engineering",
     "VIT University", "13 June 2026"),
    ("certificate_VIT2024ECE042.pdf", "VIT2024ECE042", "Ananya Sharma",
     "Bachelor of Technology in Electronics and Communication Engineering",
     "VIT University", "13 June 2026"),
    ("certificate_VIT2024MEC117.pdf", "VIT2024MEC117", "Rohan Mehta",
     "Bachelor of Technology in Mechanical Engineering",
     "VIT University", "13 June 2026"),
]


def make_cert(path, cert_id, student, degree, college, date):
    W, H = landscape(A4)
    c = canvas.Canvas(path, pagesize=landscape(A4))

    # ---- borders ----
    c.setStrokeColor(PURPLE)
    c.setLineWidth(6)
    c.rect(12 * mm, 12 * mm, W - 24 * mm, H - 24 * mm)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.5)
    c.rect(16 * mm, 16 * mm, W - 32 * mm, H - 32 * mm)

    cx = W / 2

    # ---- seal-ish circle top center ----
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.circle(cx, H - 40 * mm, 11 * mm, stroke=1, fill=0)
    c.setFillColor(PURPLE)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(cx, H - 43 * mm, "VIT")

    # ---- college name ----
    c.setFillColor(PURPLE)
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(cx, H - 62 * mm, college.upper())

    c.setFillColor(LIGHT_GREY)
    c.setFont("Helvetica-Oblique", 11)
    c.drawCentredString(cx, H - 70 * mm, "Office of the Registrar  |  Verified on the Blockchain")

    # divider
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(cx - 60 * mm, H - 75 * mm, cx + 60 * mm, H - 75 * mm)

    # ---- title ----
    c.setFillColor(PURPLE_LT)
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(cx, H - 92 * mm, "Certificate of Degree")

    # ---- body ----
    c.setFillColor(GREY)
    c.setFont("Helvetica", 13)
    c.drawCentredString(cx, H - 106 * mm, "This is to certify that")

    c.setFillColor(colors.black)
    c.setFont("Helvetica-BoldOblique", 28)
    c.drawCentredString(cx, H - 120 * mm, student)

    # underline under the name
    name_w = c.stringWidth(student, "Helvetica-BoldOblique", 28)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(cx - name_w / 2 - 6, H - 123 * mm, cx + name_w / 2 + 6, H - 123 * mm)

    c.setFillColor(GREY)
    c.setFont("Helvetica", 13)
    c.drawCentredString(cx, H - 134 * mm, "has been awarded the degree of")

    c.setFillColor(PURPLE)
    c.setFont("Helvetica-Bold", 15)
    # wrap degree if too long
    if c.stringWidth(degree, "Helvetica-Bold", 15) > (W - 80 * mm):
        words = degree.split()
        mid = len(words) // 2
        line1 = " ".join(words[:mid])
        line2 = " ".join(words[mid:])
        c.drawCentredString(cx, H - 145 * mm, line1)
        c.drawCentredString(cx, H - 153 * mm, line2)
    else:
        c.drawCentredString(cx, H - 147 * mm, degree)

    # ---- footer row: cert id / signatures / date ----
    base = 30 * mm
    c.setFillColor(LIGHT_GREY)
    c.setFont("Helvetica", 9)

    # certificate id (left)
    c.drawString(34 * mm, base + 6 * mm, "Certificate ID")
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(34 * mm, base, cert_id)

    # registrar signature (center)
    c.setStrokeColor(GREY)
    c.setLineWidth(0.8)
    c.line(cx - 30 * mm, base + 4 * mm, cx + 30 * mm, base + 4 * mm)
    c.setFillColor(LIGHT_GREY)
    c.setFont("Helvetica", 9)
    c.drawCentredString(cx, base - 2 * mm, "Registrar")

    # date (right)
    c.setFillColor(LIGHT_GREY)
    c.setFont("Helvetica", 9)
    c.drawRightString(W - 34 * mm, base + 6 * mm, "Date of Issue")
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(W - 34 * mm, base, date)

    c.showPage()
    c.save()


for args in CERTS:
    out = os.path.join(OUT_DIR, args[0])
    make_cert(out, *args[1:])
    print("Created", args[0])

print("\nDone. PDFs are in:", OUT_DIR)
