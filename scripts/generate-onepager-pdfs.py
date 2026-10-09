#!/usr/bin/env python3
"""Generate one-page A4 landscape PDFs for each company from src/data/companies.ts.

Layout: navy header band (logo-ish name + tagline + track), 3-column body
(Problem / Solution / Key Features // Target Audience / Business Model /
Seeking), snapshot strip, team + contact footer. A shrink-to-fit loop
lowers the font scale until everything fits one page.
"""
import json
import re
import subprocess
from pathlib import Path

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas as rl_canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "onepagers"
OUT.mkdir(parents=True, exist_ok=True)

# ── extract companies array from the TS file via node ────────────
node_script = r"""
const fs = require('fs');
const os = require('os');
const path = require('path');
let src = fs.readFileSync(process.argv[1], 'utf8');
src = src.replace(/export interface[\s\S]*?\n}\n/g, '');
src = src.replace(' as const;', ';');
src = src.replace(/export const /g, 'const ');
src = src.replace(/export function[\s\S]*$/, '');
src = src.replace(/const companies: Company\[\]/, 'const companies');
src += '\nmodule.exports = {companies, TRACKS};\n';
const tmp = path.join(os.tmpdir(), 'companies-extract.cjs');
fs.writeFileSync(tmp, src);
const data = require(tmp);
console.log(JSON.stringify(data));
"""
raw = subprocess.check_output(
    ["node", "-e", node_script, str(ROOT / "src" / "data" / "companies.ts")],
    text=True,
)
data = json.loads(raw)
companies = data["companies"]
TRACKS = data["TRACKS"]

NAVY = HexColor("#1a2b5e")
NAVY_DARK = HexColor("#101c40")
PERI = HexColor("#5b6cd9")
PERI_LIGHT = HexColor("#eef0fb")
INK = HexColor("#2a2f45")
MUTED = HexColor("#6a7087")
BORDER = HexColor("#dfe3f0")

PAGE_W, PAGE_H = landscape(A4)  # 842 x 595 pt
MARGIN = 28


def wrap_text(c, text, font, size, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if c.stringWidth(trial, font, size) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_company(c, comp, scale):
    s = scale
    track = TRACKS[comp["track"]]

    # ── header band (height fits content) ──
    tagline_lines = wrap_text(c, comp["tagline"], "Helvetica", 8.5 * s, PAGE_W - 2 * MARGIN - 120)[:2]
    contact_n = len([b for b in [comp.get("website"), comp.get("email"), comp.get("phone")] if b])
    header_h = max(26 + 24 * s + 14 * s + len(tagline_lines) * 10.5 * s + 14, 26 + contact_n * 9.5 * s + 14)
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - header_h, PAGE_W, header_h, fill=1, stroke=0)
    c.setFillColor(NAVY_DARK)
    c.circle(PAGE_W - 90, PAGE_H - 20, 70, fill=1, stroke=0)
    c.setFillColor(NAVY)

    x = MARGIN
    y = PAGE_H - 26
    c.setFillColor(HexColor("#aab6f0"))
    c.setFont("Helvetica-Bold", 7.5 * s)
    c.drawString(x, y, f"{track['title'].upper()}  ·  {track['dates'].upper()}  ·  KIMST SINGAPORE STARTUP ACCELERATOR 2026")

    y -= 24 * s
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 22 * s)
    c.drawString(x, y, comp["displayName"])
    name_w = c.stringWidth(comp["displayName"], "Helvetica-Bold", 22 * s)
    c.setFont("Helvetica", 8 * s)
    c.setFillColor(HexColor("#c9d2f5"))
    c.drawString(x + name_w + 14, y + 2, f"{comp['sector']}   ·   {comp['stage']}")

    y -= 14 * s
    c.setFont("Helvetica", 8.5 * s)
    c.setFillColor(HexColor("#e6eaff"))
    for line in tagline_lines:
        c.drawString(x, y, line)
        y -= 10.5 * s

    # contact right-aligned in header
    cy = PAGE_H - 26
    c.setFont("Helvetica", 7 * s)
    c.setFillColor(HexColor("#c9d2f5"))
    contact_bits = [comp.get("website", "").replace("https://", "").replace("http://", "").rstrip("/"), comp.get("email", ""), comp.get("phone", "")]
    for bit in [b for b in contact_bits if b]:
        c.drawRightString(PAGE_W - MARGIN, cy, bit)
        cy -= 9.5 * s

    body_top = PAGE_H - header_h - 12

    # ── six section columns (2 rows x 3 cols) ──
    col_gap = 12
    col_w = (PAGE_W - 2 * MARGIN - 2 * col_gap) / 3
    sections = [
        ("PROBLEM", comp["problem"]),
        ("SOLUTION", comp["solution"]),
        ("KEY FEATURES", comp["keyFeatures"]),
        ("TARGET AUDIENCE", comp["targetAudience"]),
        ("BUSINESS MODEL", comp["businessModel"]),
        ("SEEKING IN SINGAPORE", comp["seekingOpportunities"]),
    ]

    def draw_section(sx, sy, title, items):
        c.setFillColor(PERI)
        c.setFont("Helvetica-Bold", 7 * s)
        c.drawString(sx, sy, title)
        yy = sy - 10 * s
        c.setFillColor(INK)
        c.setFont("Helvetica", 7.3 * s)
        for item in items:
            lines = wrap_text(c, item, "Helvetica", 7.3 * s, col_w - 8)
            c.setFillColor(PERI)
            c.circle(sx + 1.6, yy + 2.3, 1.1 * s, fill=1, stroke=0)
            c.setFillColor(INK)
            for ln in lines:
                c.drawString(sx + 7, yy, ln)
                yy -= 8.6 * s
            yy -= 2.2 * s
        return sy - yy  # height used

    # measure row heights
    row_heights = [0, 0]
    for i, (t, items) in enumerate(sections):
        row = i // 3
        # dry measure using a throwaway y far off page
        h = 10 * s
        for item in items:
            lines = wrap_text(c, item, "Helvetica", 7.3 * s, col_w - 8)
            h += len(lines) * 8.6 * s + 2.2 * s
        row_heights[row] = max(row_heights[row], h)

    y0 = body_top
    for i, (t, items) in enumerate(sections):
        row, col = divmod(i, 3)
        sx = MARGIN + col * (col_w + col_gap)
        sy = y0 - (row_heights[0] + 14 if row == 1 else 0)
        draw_section(sx, sy, t, items)

    after_sections = y0 - row_heights[0] - 14 - row_heights[1] - 10

    # ── snapshot strip ──
    c.setFillColor(PERI_LIGHT)
    snap_items = comp["businessSnapshot"]
    snap_cols = 3
    snap_col_w = (PAGE_W - 2 * MARGIN - (snap_cols - 1) * 10) / snap_cols
    # measure
    snap_line_h = 8.2 * s
    col_heights = [0] * snap_cols
    placed = []
    for idx, item in enumerate(snap_items):
        col = idx % snap_cols
        lines = wrap_text(c, item, "Helvetica", 6.9 * s, snap_col_w - 14)
        placed.append((col, lines))
        col_heights[col] += len(lines) * snap_line_h + 7 * s
    snap_h = max(col_heights) + 24 * s
    snap_top = after_sections
    c.roundRect(MARGIN, snap_top - snap_h, PAGE_W - 2 * MARGIN, snap_h, 6, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 7 * s)
    c.drawString(MARGIN + 10, snap_top - 13 * s, "BUSINESS SNAPSHOT — TRACTION & MILESTONES")
    ys = [snap_top - 24 * s] * snap_cols
    for col, lines in placed:
        sx = MARGIN + 10 + col * (snap_col_w + 10)
        c.setFillColor(PERI)
        c.circle(sx + 1.4, ys[col] + 2, 1.1 * s, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica", 6.9 * s)
        for ln in lines:
            c.drawString(sx + 6.5, ys[col], ln)
            ys[col] -= snap_line_h
        ys[col] -= 7 * s

    # ── team footer ──
    team_top = snap_top - snap_h - 12
    c.setFillColor(PERI)
    c.setFont("Helvetica-Bold", 7 * s)
    c.drawString(MARGIN, team_top, "TEAM")
    ty = team_top - 10 * s
    n = max(len(comp["team"]), 1)
    team_col_w = (PAGE_W - 2 * MARGIN - (n - 1) * 10) / n
    min_y = ty
    for i, member in enumerate(comp["team"]):
        sx = MARGIN + i * (team_col_w + 10)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 7.6 * s)
        c.drawString(sx, ty, member["name"])
        c.setFillColor(PERI)
        c.setFont("Helvetica-Bold", 6.2 * s)
        c.drawString(sx + c.stringWidth(member["name"], "Helvetica-Bold", 7.6 * s) + 6, ty, member["role"].upper())
        yy = ty - 8.8 * s
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.4 * s)
        for line in member["bio"]:
            for ln in wrap_text(c, line, "Helvetica", 6.4 * s, team_col_w - 4):
                c.drawString(sx, yy, ln)
                yy -= 7.6 * s
        min_y = min(min_y, yy)
    return min_y  # lowest content y — must stay above MARGIN


for comp in companies:
    path = OUT / f"{comp['slug']}.pdf"
    scale = 1.5
    while True:
        c = rl_canvas.Canvas(str(path), pagesize=landscape(A4))
        c.setTitle(f"{comp['name']} — KIMST Singapore Startup Accelerator 2026")
        bottom = draw_company(c, comp, scale)
        if bottom >= MARGIN - 4 or scale <= 0.72:
            c.showPage()
            c.save()
            break
        scale = round(scale - 0.05, 2)
    print(f"{comp['slug']:18} scale={scale} bottom={int(bottom)}")
