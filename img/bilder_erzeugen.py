# Erzeugt die 7 Schicksalsbilder als Comic-SVGs (400 x 400).
# Aufruf im Spielordner:  python img/bilder_erzeugen.py
import os, re, random

OUT = os.path.dirname(os.path.abspath(__file__))
INK = "#2b2118"
SKIN, SKIN_TOT = "#f3c8a0", "#c9cdb0"


def st(w=3.5):
    return f'stroke="{INK}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"'


# ---------------------------------------------------------------- Hintergründe
def defs():
    return f'''<defs>
  <linearGradient id="tag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc4ec"/><stop offset="1" stop-color="#d9f0fb"/></linearGradient>
  <linearGradient id="grau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d5a6e"/><stop offset="1" stop-color="#a9a6b3"/></linearGradient>
  <linearGradient id="wasser" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d8fbf"/><stop offset="1" stop-color="#25668f"/></linearGradient>
  <linearGradient id="wasser_grau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f7c8c"/><stop offset="1" stop-color="#3f5866"/></linearGradient>
  <radialGradient id="gold" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff2a8"/><stop offset=".5" stop-color="#f2c230"/><stop offset="1" stop-color="#b9861a"/></radialGradient>
</defs>'''


def himmel(dunkel):
    s = f'<rect width="400" height="400" fill="url(#{"grau" if dunkel else "tag"})"/>'
    if dunkel:
        for x, y, r in [(70, 60, 34), (110, 50, 40), (150, 62, 30), (270, 80, 36), (310, 70, 42), (350, 84, 30)]:
            s += f'<circle cx="{x}" cy="{y}" r="{r}" fill="#45424f" opacity=".6"/>'
    else:
        s += f'<circle cx="340" cy="62" r="28" fill="#ffe27a"/><circle cx="340" cy="62" r="40" fill="#ffe27a" opacity=".25"/>'
        for x, y in [(70, 70), (230, 45)]:
            s += (f'<g fill="#fff" opacity=".9"><circle cx="{x}" cy="{y}" r="18"/><circle cx="{x+20}" cy="{y-8}" r="22"/>'
                  f'<circle cx="{x+44}" cy="{y}" r="17"/><rect x="{x}" y="{y}" width="44" height="17"/></g>')
    return s


def giebelhaus(x, w, h, farbe, boden=300, stufen=4, dunkel=False):
    """Lübecker Backstein-Treppengiebel."""
    sw = w / 2 / (stufen + 1)
    sh = 18
    top = boden - h
    pts = [(x, boden), (x, top)]
    cx, cy = x, top
    for _ in range(stufen):
        cx += sw; pts.append((cx, cy)); cy -= sh; pts.append((cx, cy))
    pts.append((x + w - (cx - x), cy))
    cx2 = x + w - (cx - x)
    for _ in range(stufen):
        cy += sh; pts.append((cx2, cy)); cx2 += sw; pts.append((cx2, cy))
    pts += [(x + w, top), (x + w, boden)]
    d = "M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in pts) + " Z"
    s = f'<path d="{d}" fill="{farbe}" {st(3)}/>'
    # Ziegelfugen
    for yy in range(int(top + 12), boden, 14):
        s += f'<path d="M{x+3} {yy} h{w-6}" stroke="#000" stroke-opacity=".08" stroke-width="2"/>'
    fenster = "#3a3550" if dunkel else "#fff4c9"
    for row in range(2):
        for col in range(2):
            fx = x + w * (0.22 + col * 0.36)
            fy = top + 20 + row * 52
            if fy + 34 < boden - 30:
                s += f'<path d="M{fx:.1f} {fy+34} v-24 q{w*0.09:.1f} -14 {w*0.18:.1f} 0 v24 z" fill="{fenster}" {st(2.5)}/>'
    # Tür
    s += f'<path d="M{x+w*0.38:.1f} {boden} v-34 q{w*0.12:.1f} -16 {w*0.24:.1f} 0 v34 z" fill="#6b3b22" {st(2.5)}/>'
    return s


def stadt(dunkel=False):
    s = himmel(dunkel)
    farben = ["#b5523a", "#9c3f2e", "#c46a45", "#a84a36", "#8f3a2b"]
    if dunkel:
        farben = ["#7d4b42", "#6c4038", "#875448", "#744540", "#633a33"]
    for i, (x, w, h) in enumerate([(-20, 100, 150), (78, 90, 185), (166, 100, 160), (264, 90, 195), (352, 90, 150)]):
        s += giebelhaus(x, w, h, farben[i], dunkel=dunkel)
    s += pflaster(dunkel)
    return s


def pflaster(dunkel=False, y0=300):
    s = f'<rect y="{y0}" width="400" height="{400-y0}" fill="{"#8c8680" if dunkel else "#b9b0a3"}" {st(3)}/>'
    rnd = random.Random(7)
    for row, y in enumerate(range(y0 + 12, 400, 18)):
        for x in range(-20 + (row % 2) * 18, 420, 36):
            s += f'<ellipse cx="{x + rnd.randint(-3,3)}" cy="{y}" rx="15" ry="7" fill="#000" opacity=".07"/>'
    return s


def kogge(x, y, s=1.0, dunkel=False):
    segel = "#d9d2c1" if dunkel else "#f6efdc"
    return f'''<g transform="translate({x} {y}) scale({s})">
  <path d="M0 -150 V0" {st(4)}/>
  <path d="M-48 -140 h96 q8 50 0 100 h-96 q-8 -50 0 -100 z" fill="{segel}" {st(3)}/>
  <path d="M-6 -134 h12 v82 h-12 z M-40 -96 h80 v12 h-80 z" fill="#b3261e" opacity=".85"/>
  <path d="M-95 -10 q95 30 190 0 l-14 38 q-81 20 -162 0 z" fill="#7a4a28" {st(3)}/>
  <path d="M-90 2 q90 26 180 0 M-86 14 q86 22 172 0" stroke="#4e2e17" stroke-width="2.5" fill="none"/>
  <path d="M-95 -10 v-26 h34 v32 M95 -10 v-30 h-30 v34" fill="#8a5a33" {st(3)}/>
  <path d="M0 -150 l26 8 l-26 8" fill="#b3261e" {st(2)}/>
</g>'''


def hafen(dunkel=False):
    s = himmel(dunkel)
    s += f'<path d="M0 205 l30 -40 l30 40 l35 -55 l35 55 h10 v40 h-140 z" fill="{"#6c4a42" if dunkel else "#a85a40"}" {st(2.5)} opacity=".85"/>'
    s += f'<rect y="235" width="400" height="75" fill="url(#{"wasser_grau" if dunkel else "wasser"})"/>'
    for y in (250, 268, 286):
        for x in range(10, 400, 60):
            s += f'<path d="M{x} {y} q10 -6 20 0" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" fill="none"/>'
    s += kogge(110, 262, 0.75, dunkel)
    # Kaimauer und Steg
    s += f'<rect y="300" width="400" height="100" fill="{"#8a7a68" if dunkel else "#c9a77c"}" {st(3)}/>'
    for x in range(0, 400, 40):
        s += f'<path d="M{x} 300 v100" stroke="#000" stroke-opacity=".08" stroke-width="2"/>'
    s += f'<path d="M0 312 h400" stroke="#000" stroke-opacity=".12" stroke-width="3"/>'
    return s


def rathaus():
    s = himmel(False)
    s += f'<path d="M20 300 V120 h360 V300 z" fill="#a8432f" {st(3)}/>'
    s += f'<path d="M20 120 V95 h40 v25 M100 120 V80 h40 v40 M180 120 V70 h40 v50 M260 120 V80 h40 v40 M340 120 V95 h40 v25" fill="#a8432f" {st(3)}/>'
    for x in (60, 140, 220, 300):
        s += f'<path d="M{x} 260 v-90 q20 -26 40 0 v90 z" fill="#3a2b2b" {st(3)}/>'
        s += f'<path d="M{x+8} 200 v-30 q12 -16 24 0 v30 z" fill="#fff4c9" opacity=".9"/>'
    s += f'<path d="M20 260 H380" {st(3)}/>'
    s += f'<path d="M30 140 h20 v60 l-10 -10 l-10 10 z M350 140 h20 v60 l-10 -10 l-10 10 z" fill="#b3261e" {st(2.5)}/>'
    s += f'<path d="M36 155 h8 M356 155 h8" stroke="#fff" stroke-width="3"/>'
    s += pflaster(False)
    return s


# ---------------------------------------------------------------- Figur
# Lokale Koordinaten: Füße bei y=0, Kopfmitte bei y=-196.

def augen(art):
    if art == "froh":
        return (f'<path d="M-24 -200 q8 -10 16 0 M8 -200 q8 -10 16 0" {st(4)} fill="none"/>'
                f'<path d="M-28 -214 q10 -6 20 -2 M8 -216 q10 -4 20 2" {st(3)} fill="none"/>')
    if art == "normal":
        return (f'<ellipse cx="-16" cy="-200" rx="6" ry="8" fill="{INK}"/><ellipse cx="16" cy="-200" rx="6" ry="8" fill="{INK}"/>'
                f'<circle cx="-14" cy="-203" r="2" fill="#fff"/><circle cx="18" cy="-203" r="2" fill="#fff"/>'
                f'<path d="M-26 -214 h18 M8 -214 h18" {st(3)}/>')
    if art == "traurig":
        return (f'<ellipse cx="-16" cy="-198" rx="6" ry="7" fill="{INK}"/><ellipse cx="16" cy="-198" rx="6" ry="7" fill="{INK}"/>'
                f'<path d="M-28 -206 l18 -8 M28 -206 l-18 -8" {st(3.5)}/>'
                f'<path d="M-20 -188 q-6 12 0 18 q6 -6 0 -18 z M22 -188 q-6 12 0 18 q6 -6 0 -18 z" fill="#5fb3e8" {st(1.5)}/>')
    if art == "tot":
        return f'<path d="M-24 -208 l14 14 M-10 -208 l-14 14 M10 -208 l14 14 M24 -208 l-14 14" {st(4)}/>'


def mund(art):
    return {
        "lachen": f'<path d="M-18 -178 q18 22 36 0 z" fill="#8c2f1b" {st(3)}/><path d="M-12 -176 h24" stroke="#fff" stroke-width="4"/>',
        "laecheln": f'<path d="M-14 -176 q14 12 28 0" {st(3.5)} fill="none"/>',
        "muede": f'<path d="M-12 -172 q12 5 24 -2" {st(3.5)} fill="none"/>',
        "traurig": f'<path d="M-14 -168 q14 -12 28 0" {st(3.5)} fill="none"/>',
        "tot": f'<path d="M-14 -172 q5 -5 9 0 q5 5 9 0 q5 -5 9 0" {st(3)} fill="none"/><path d="M4 -170 q4 10 10 4" fill="#e07a7a" {st(2)}/>',
    }[art]


def kopf(reich, augen_art, mund_art, tot=False, hut=None, verband=False):
    haut = SKIN_TOT if tot else SKIN
    s = f'<rect x="-11" y="-160" width="22" height="16" fill="{haut}" {st(3)}/>'
    s += f'<circle cx="-44" cy="-194" r="10" fill="{haut}" {st(3)}/><circle cx="44" cy="-194" r="10" fill="{haut}" {st(3)}/>'
    s += f'<circle cx="0" cy="-196" r="44" fill="{haut}" {st(3.5)}/>'
    if not tot:
        s += f'<circle cx="-26" cy="-184" r="8" fill="#ff8a80" opacity=".45"/><circle cx="26" cy="-184" r="8" fill="#ff8a80" opacity=".45"/>'
    else:
        s += f'<circle cx="-22" cy="-160" r="4" fill="#5b3a4a" opacity=".7"/><circle cx="20" cy="-158" r="3" fill="#5b3a4a" opacity=".7"/>'
    s += f'<path d="M-4 -196 q4 12 10 6" {st(3)} fill="none"/>'
    if reich:
        # gepflegter Bart
        s += f'<path d="M-40 -186 q4 40 40 44 q36 -4 40 -44 q-8 22 -40 24 q-32 -2 -40 -24 z" fill="#6b4226" {st(3)}/>'
    else:
        s += "".join(f'<circle cx="{x}" cy="{y}" r="1.6" fill="{INK}" opacity=".6"/>'
                     for x, y in [(-22, -168), (-14, -164), (-6, -162), (6, -162), (14, -164), (22, -168), (-18, -160), (18, -160)])
    s += augen(augen_art) + mund(mund_art)
    if hut == "chaperon":
        s += (f'<path d="M-50 -226 q50 -52 100 0 q-50 14 -100 0 z" fill="#24212b" {st(3.5)}/>'
              f'<path d="M-52 -228 q52 18 104 0 q4 10 -2 16 q-50 16 -100 0 q-6 -6 -2 -16 z" fill="#9a7650" {st(3)}/>'
              + "".join(f'<circle cx="{x}" cy="-220" r="2" fill="{INK}"/>' for x in range(-40, 44, 12))
              + f'<path d="M40 -238 q30 10 26 50 q-8 -20 -20 -30" fill="#24212b" {st(3)}/>')
    elif hut == "barett":
        s += (f'<path d="M-48 -224 q48 -50 96 0 q-48 12 -96 0 z" fill="#1f3a5f" {st(3.5)}/>'
              f'<circle cx="26" cy="-238" r="7" fill="url(#gold)" {st(2.5)}/>'
              f'<path d="M30 -244 q22 -30 6 -46 q4 26 -12 40" fill="#e8e0c8" {st(2.5)}/>')
    elif hut == "muetze":
        s += f'<path d="M-46 -214 q46 -60 92 0 q-46 10 -92 0 z" fill="#7a6a58" {st(3.5)}/><path d="M-30 -228 q30 -10 60 0" stroke="#5b4e40" stroke-width="3" fill="none"/>'
    else:
        # zerzauste Haare
        s += f'<path d="M-42 -212 l6 -26 l10 14 l6 -24 l10 18 l8 -22 l8 20 l10 -18 l4 24 l12 -12 l-2 28 q-40 -16 -72 -2 z" fill="#5a3b24" {st(3)}/>'
    if verband:
        s += (f'<path d="M-46 -214 q46 -22 92 6" stroke="#fdfdfb" stroke-width="16" fill="none"/>'
              f'<path d="M-46 -214 q46 -22 92 6" {st(2.5)} fill="none" stroke-dasharray="2 0"/>'
              f'<path d="M-30 -222 l6 -4 M-10 -226 l6 -4 M10 -224 l6 -2" stroke="#e05a47" stroke-width="2"/>'
              f'<ellipse cx="22" cy="-188" rx="9" ry="7" fill="#8a4fa0" opacity=".55"/>'
              f'<path d="M-36 -184 l10 6 M-30 -186 l-2 10" stroke="#fdfdfb" stroke-width="5"/>')
    return s


def arm(sx, sy, hx, hy, farbe, dicke=20, haut=SKIN):
    return (f'<path d="M{sx} {sy} Q{(sx+hx)/2 + (8 if hx > 0 else -8)} {(sy+hy)/2} {hx} {hy}" stroke="{INK}" stroke-width="{dicke+7}" fill="none" stroke-linecap="round"/>'
            f'<path d="M{sx} {sy} Q{(sx+hx)/2 + (8 if hx > 0 else -8)} {(sy+hy)/2} {hx} {hy}" stroke="{farbe}" stroke-width="{dicke}" fill="none" stroke-linecap="round"/>'
            f'<circle cx="{hx}" cy="{hy}" r="11" fill="{haut}" {st(3)}/>')


def figur(reich, farbe, augen_art, mund_art, tot=False, hut=None, haende=((-66, -78), (66, -78)),
          vorne="", hinten="", verband=False, kette=False):
    haut = SKIN_TOT if tot else SKIN
    s = hinten
    if reich:
        # Schuhe
        s += f'<ellipse cx="-20" cy="-6" rx="20" ry="9" fill="#3b2a1e" {st(3)}/><ellipse cx="20" cy="-6" rx="20" ry="9" fill="#3b2a1e" {st(3)}/>'
        # langer Mantel mit Pelzbesatz
        s += f'<path d="M-44 -150 Q0 -166 44 -150 L64 -18 Q0 -6 -64 -18 Z" fill="{farbe}" {st(3.5)}/>'
        s += f'<path d="M4 -160 Q30 -158 44 -150 L64 -18 Q34 -10 10 -9 Z" fill="#000" opacity=".15"/>'
        s += f'<path d="M-66 -20 Q0 -4 66 -20" stroke="#9a7650" stroke-width="14" fill="none"/><path d="M-66 -20 Q0 -4 66 -20" stroke="{INK}" stroke-width="2" fill="none" stroke-dasharray="1 9"/>'
        s += f'<path d="M-40 -150 Q0 -120 40 -150" stroke="#9a7650" stroke-width="16" fill="none"/>'
        s += f'<rect x="-48" y="-92" width="96" height="10" fill="#3b2a1e" {st(2.5)}/><rect x="-8" y="-95" width="16" height="16" rx="3" fill="url(#gold)" {st(2.5)}/>'
        s += f'<path d="M24 -82 q-8 26 10 30 q18 -4 10 -30 z" fill="#6b3b22" {st(2.5)}/>'
    else:
        # Beine mit Löchern, Holzschuhe
        s += f'<rect x="-30" y="-70" width="22" height="64" fill="#6f6250" {st(3)}/><rect x="8" y="-70" width="22" height="64" fill="#6f6250" {st(3)}/>'
        s += f'<ellipse cx="-19" cy="-40" rx="5" ry="4" fill="{haut}" {st(1.5)}/><ellipse cx="19" cy="-22" rx="4" ry="5" fill="{haut}" {st(1.5)}/>'
        s += f'<path d="M-40 -2 q0 -14 22 -12 q8 4 6 14 z M40 -2 q0 -14 -22 -12 q-8 4 -6 14 z" fill="#9a6a3a" {st(3)}/>'
        # zerlumpter Kittel
        s += f'<path d="M-40 -150 Q0 -162 40 -150 L50 -62 L34 -54 L22 -66 L8 -54 L-6 -66 L-22 -54 L-34 -66 L-50 -60 Z" fill="{farbe}" {st(3.5)}/>'
        s += f'<path d="M4 -158 Q26 -156 40 -150 L50 -62 L34 -54 L22 -66 L8 -54 Z" fill="#000" opacity=".15"/>'
        s += f'<rect x="-30" y="-128" width="20" height="18" fill="#a08a5a" {st(2)} transform="rotate(-8 -20 -119)"/>'
        s += f'<path d="M-28 -126 v14 M-12 -128 v14" stroke="{INK}" stroke-width="1.5" stroke-dasharray="3 3"/>'
        s += f'<rect x="14" y="-90" width="18" height="16" fill="#7d8a6a" {st(2)} transform="rotate(10 23 -82)"/>'
        s += f'<path d="M-46 -92 Q0 -84 46 -92" stroke="#c2a26a" stroke-width="6" fill="none"/><path d="M-6 -88 l-6 16 M-2 -88 l2 18" stroke="#c2a26a" stroke-width="4"/>'
    s += arm(-40, -140, haende[0][0], haende[0][1], farbe, 22 if reich else 18, haut)
    s += arm(40, -140, haende[1][0], haende[1][1], farbe, 22 if reich else 18, haut)
    if kette:
        s += f'<path d="M-30 -150 Q0 -100 30 -150" stroke="url(#gold)" stroke-width="7" fill="none" stroke-dasharray="7 3"/>'
        s += f'<circle cx="0" cy="-114" r="11" fill="url(#gold)" {st(2.5)}/><path d="M-4 -114 h8 M0 -118 v8" {st(1.5)}/>'
    s += kopf(reich, augen_art, mund_art, tot, hut, verband)
    return s + vorne


def stehend(fig, x, boden, s=1.0):
    return f'<g transform="translate({x} {boden}) scale({s})">{fig}</g>'


def liegend(fig, x, boden, s=0.8):
    # gedreht: Kopf links, Füße bei x
    return f'<g transform="translate({x} {boden - 62*s}) scale({s}) rotate(-90)">{fig}</g>'


# ---------------------------------------------------------------- Requisiten
def muenze(x, y, r=11):
    return f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r*0.62:.1f}" fill="url(#gold)" {st(2.5)}/><ellipse cx="{x}" cy="{y}" rx="{r*0.5:.1f}" ry="{r*0.3:.1f}" fill="none" stroke="#b9861a" stroke-width="1.5"/>'


def muenzen(lst):
    return "".join(muenze(x, y) for x, y in lst)


def geldsack(x, y, s=1.0):
    return f'''<g transform="translate({x} {y}) scale({s})">
  <path d="M-30 -48 q-30 18 -26 52 q30 16 56 0 q4 -34 -26 -52 z" fill="#c9a24a" {st(3)}/>
  <path d="M-14 -50 q-8 -14 -14 -18 q14 0 18 6 q6 -6 18 -6 q-6 4 -14 18 z" fill="#c9a24a" {st(2.5)}/>
  <path d="M-16 -48 h22" stroke="#7a4a28" stroke-width="5"/>
  <text x="-2" y="-6" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="26" fill="#7a4a28">G</text>
  {muenze(-38, 6, 9)}{muenze(26, 8, 9)}
</g>'''


def truhe(x, y):
    return f'''<g transform="translate({x} {y})">
  <path d="M-50 -50 q50 -60 100 0" fill="#9a5f30" {st(3)}/>
  {muenzen([(-32, -54), (-12, -62), (10, -60), (30, -52), (-20, -46), (20, -44), (0, -50)])}
  <rect x="-50" y="-50" width="100" height="55" fill="#8a5228" {st(3)}/>
  <path d="M-50 -30 h100 M-30 -50 v55 M30 -50 v55" stroke="#4e2e17" stroke-width="3"/>
  <rect x="-8" y="-38" width="16" height="16" fill="url(#gold)" {st(2)}/>
</g>'''


def beutel_leer(x, y):
    return f'''<g transform="translate({x} {y})">
  <path d="M-20 0 q-6 -26 14 -30 q22 4 16 30 q-16 8 -30 0 z" fill="#a08a5a" {st(3)}/>
  <path d="M-8 -30 q2 -12 14 -14 M4 -30 q4 -10 14 -8" {st(2.5)} fill="none"/>
  <path d="M18 -40 q8 -8 14 0 q-6 4 -14 0 z M26 -46 q6 -8 12 -2 q-6 4 -12 2 z" fill="#d8d0b8" {st(1.5)}/>
</g>'''


def ratte(x, y, s=1.0):
    return f'''<g transform="translate({x} {y}) scale({s})">
  <path d="M26 -6 q30 4 40 -14 q4 -8 -2 -10" stroke="#8a7f88" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="0" cy="-12" rx="30" ry="16" fill="#6e6670" {st(3)}/>
  <path d="M-26 -18 l-20 6 l20 8 z" fill="#6e6670" {st(3)}/>
  <circle cx="-44" cy="-12" r="3.5" fill="#e88" />
  <circle cx="-18" cy="-28" r="8" fill="#d79aa0" {st(2.5)}/>
  <circle cx="-32" cy="-16" r="3" fill="{INK}"/><circle cx="-31" cy="-17" r="1" fill="#fff"/>
  <path d="M-46 -12 l-10 -4 M-46 -10 l-10 2" stroke="{INK}" stroke-width="1.5"/>
  <path d="M-10 2 v4 M14 2 v4" {st(3)}/>
</g>'''


def kraehe(x, y, s=1.0):
    return f'''<g transform="translate({x} {y}) scale({s})">
  <path d="M-14 0 q4 -18 22 -16 q12 2 12 12 l10 2 l-10 4 q-8 14 -24 10 z" fill="#1d1b22" {st(2)}/>
  <path d="M-12 0 l-14 6 l12 2" fill="#1d1b22" {st(2)}/>
  <circle cx="12" cy="-8" r="2.5" fill="#fff"/>
  <path d="M0 12 v8 M6 12 v8" stroke="#e8b923" stroke-width="2.5"/>
</g>'''


def urkunde(x, y):
    return f'''<g transform="translate({x} {y}) rotate(-8)">
  <rect x="-28" y="-40" width="56" height="70" fill="#f4ecd8" {st(3)}/>
  <path d="M-28 -40 q-10 4 0 10 M28 30 q10 -4 0 -10" {st(3)} fill="#e8dcbe"/>
  <path d="M-18 -26 h36 M-18 -16 h36 M-18 -6 h28 M-18 4 h32" stroke="#8a7a68" stroke-width="2.5"/>
  <path d="M-4 22 l-6 22 l10 -6 l10 6 l-6 -22" fill="#b3261e" {st(2)}/>
  <circle cx="0" cy="20" r="10" fill="#b3261e" {st(2.5)}/>
</g>'''


def fass(x, y, s=1.0, drehung=0):
    return f'''<g transform="translate({x} {y}) rotate({drehung}) scale({s})">
  <path d="M-34 -50 q-10 50 0 100 h68 q10 -50 0 -100 z" fill="#a0683a" {st(3)}/>
  <path d="M-38 -24 h76 M-38 24 h76" stroke="#4e4a46" stroke-width="7"/>
  <path d="M-14 -50 q-4 50 0 100 M14 -50 q4 50 0 100" stroke="#7a4a28" stroke-width="2.5" fill="none"/>
  <ellipse cx="0" cy="-50" rx="34" ry="8" fill="#b97a48" {st(3)}/>
</g>'''


def ballen(x, y):
    return f'''<g transform="translate({x} {y})">
  <rect x="-34" y="-46" width="68" height="46" rx="8" fill="#d8c08a" {st(3)}/>
  <path d="M-34 -23 h68 M0 -46 v46" stroke="#8a6a3a" stroke-width="4"/>
  <rect x="-24" y="-82" width="52" height="36" rx="7" fill="#c7a9d8" {st(3)}/>
  <path d="M-24 -64 h52 M2 -82 v36" stroke="#6b4e7a" stroke-width="3.5"/>
</g>'''


def marktstand(x, y):
    streifen = "".join(f'<path d="M{-70 + i*20} -128 h20 l6 28 h-20 z" fill="{"#e05a47" if i % 2 == 0 else "#f4ecd8"}"/>' for i in range(7))
    return f'''<g transform="translate({x} {y})">
  <path d="M-62 -100 V0 M62 -100 V0" {st(5)}/>
  <rect x="-70" y="-50" width="140" height="50" fill="#9a6a3a" {st(3)}/>
  <path d="M-70 -30 h140" stroke="#6b4426" stroke-width="2.5"/>
  {streifen}
  <path d="M-70 -128 h140 l6 28 h-140 z" fill="none" {st(3)}/>
  <circle cx="-38" cy="-62" r="12" fill="#f2e3b3" {st(2.5)}/><circle cx="-14" cy="-60" r="12" fill="#f2e3b3" {st(2.5)}/>
  <rect x="10" y="-76" width="22" height="26" fill="#d9d2c1" {st(2.5)}/><rect x="36" y="-70" width="22" height="20" fill="#c7a9d8" {st(2.5)}/>
</g>'''


def regenwolke(x, y):
    tropfen = "".join(f'<path d="M{x+dx} {y+22+dy} q-4 8 0 12 q4 -4 0 -12 z" fill="#5fb3e8"/>' for dx, dy in [(-30, 4), (-12, 16), (6, 6), (24, 18), (40, 4)])
    return (f'<g fill="#7d7a86" {st(3)}><path d="M{x-46} {y+14} q-10 -26 16 -28 q6 -24 32 -16 q16 -18 38 -2 q26 -4 24 22 q14 12 -4 24 h-100 q-14 -2 -6 0 z"/></g>'
            + tropfen)


def schatten(x, y, rx=70):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="10" fill="#000" opacity=".2"/>'


# ---------------------------------------------------------------- Szenen
ROT, GRUEN, BLAU, BRAUN, GRAU = "#7a1a2a", "#2f7d4a", "#2c5d8f", "#8a6a4a", "#8c8577"


def szene_tot_rat():
    return (stadt(True) + kraehe(110, 136, 1.1) + kraehe(300, 108)
            + schatten(160, 384, 120)
            + liegend(figur(True, ROT, "tot", "tot", tot=True, hut=None, kette=True), 262, 380)
            + '<g transform="translate(52 392) rotate(-15)"><path d="M-30 -10 q30 -40 60 0 q-30 10 -60 0 z" fill="#24212b" stroke="#2b2118" stroke-width="3"/></g>'
            + urkunde(345, 300) + muenzen([(300, 384), (262, 392)]) + ratte(40, 300, 0.7))


def szene_tot_reich():
    return (stadt(True) + kraehe(200, 120) + schatten(160, 384, 120)
            + liegend(figur(True, GRUEN, "tot", "tot", tot=True, hut="barett"), 262, 380)
            + truhe(338, 380) + muenzen([(270, 388), (250, 380)]) + ratte(140, 300, 0.75))


def szene_tot_arm():
    return (stadt(True) + kraehe(120, 126) + kraehe(310, 100, 0.9) + schatten(160, 384, 120)
            + liegend(figur(False, GRAU, "tot", "tot", tot=True), 262, 380)
            + beutel_leer(330, 388) + ratte(340, 318, 0.75))


def szene_ratsherr():
    return (rathaus() + schatten(200, 372, 80)
            + stehend(figur(True, ROT, "froh", "lachen", hut="chaperon", kette=True,
                            haende=((-70, -100), (70, -84))), 200, 372)
            + urkunde(118, 286) + muenzen([(300, 380)]))


def szene_reich():
    return (hafen(False) + ballen(320, 372) + schatten(190, 374, 80)
            + stehend(figur(True, BLAU, "froh", "lachen", hut="barett", haende=((-70, -84), (70, -60))), 190, 374)
            + geldsack(276, 360, 0.9) + muenzen([(120, 386), (100, 378)]))


def szene_klein():
    return (stadt(False) + marktstand(300, 372) + fass(70, 360, 0.6) + schatten(170, 374, 70)
            + stehend(figur(False, BRAUN, "normal", "muede", hut="muetze"), 170, 374)
            + muenzen([(206, 300)]))


def szene_ruiniert():
    return (hafen(True) + schatten(200, 374, 70)
            + stehend(figur(False, GRAU, "traurig", "traurig", verband=True,
                            haende=((-56, -150), (30, -230)),
                            hinten=fass(-40, -210, 0.85, -20)), 200, 374)
            + regenwolke(205, 50))


SZENEN = {
    "tot_rat": ("Ratsherr – bis die Pest kam", szene_tot_rat),
    "tot_reich": ("Reich, aber an der Pest gestorben", szene_tot_reich),
    "tot_arm": ("Arm und an der Pest gestorben", szene_tot_arm),
    "ratsherr": ("Ratsherr in Lübeck", szene_ratsherr),
    "reich": ("Reicher Fernhändler", szene_reich),
    "klein": ("Kleiner Kaufmann", szene_klein),
    "ruiniert": ("Ruiniert", szene_ruiniert),
}

if __name__ == "__main__":
    for name, (titel, fn) in SZENEN.items():
        inhalt = fn()
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="{titel}">'
               f'{defs()}<clipPath id="r"><rect width="400" height="400" rx="0"/></clipPath><g clip-path="url(#r)">{inhalt}</g></svg>')
        with open(os.path.join(OUT, name + ".svg"), "w", encoding="utf-8") as f:
            f.write(svg)
    print("ok", len(SZENEN))
