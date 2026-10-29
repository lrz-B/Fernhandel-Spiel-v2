# Erzeugt die 7 Schicksalsbilder als Comic-SVGs.
import os, sys
OUT = sys.argv[1]
INK = "#2b2118"; SKIN = "#f2c9a0"
S = f'stroke="{INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"'

def hintergrund(ort):
    s = f'<rect width="400" height="400" fill="#bfe3f2"/>'
    s += f'<circle cx="335" cy="70" r="30" fill="#ffd95a"/>'
    if ort == "hafen":
        s += f'<rect y="250" width="400" height="60" fill="#5aa3c9"/>'
        s += f'<path d="M40 245 h110 l-15 22 h-80 z" fill="#8a5a33" {S}/><path d="M95 245 v-80" {S}/><path d="M95 170 h45 v55 h-45 z" fill="#f4ecd8" {S}/>'
        s += f'<rect y="300" width="400" height="100" fill="#c9a77c" {S}/>'
    else:
        # Giebelhäuser
        for x, c in [(0, "#d98c5f"), (100, "#c5674a"), (200, "#e0b36a"), (300, "#b9775a")]:
            s += f'<path d="M{x} 300 V150 l50 -50 l50 50 V300 z" fill="{c}" {S}/>'
            s += f'<rect x="{x+35}" y="170" width="30" height="35" fill="#fff6d8" {S}/>'
        s += f'<rect y="300" width="400" height="100" fill="#a9a29a" {S}/>'
        for i in range(0, 400, 50):
            s += f'<path d="M{i} 335 h50 M{i+25} 365 h50" stroke="#8c857e" stroke-width="3"/>'
    return s

def figur(kleid, reich, gesicht, extras="", hut=True):
    """Stehende Figur, Füße bei y=340, Mitte x=200."""
    g = ""
    g += f'<path d="M180 290 v50 M220 290 v50" {S}/>'
    g += f'<path d="M168 342 h22 M210 342 h22" {S} stroke-width="8"/>'
    g += f'<path d="M160 200 Q200 185 240 200 L255 300 H145 Z" fill="{kleid}" {S}/>'
    if reich:
        g += f'<path d="M150 296 H250" stroke="#f4ecd8" stroke-width="10"/><path d="M160 200 Q200 185 240 200" stroke="#f4ecd8" stroke-width="10" fill="none"/>'
    g += f'<path d="M163 215 L135 265 M237 215 L265 265" {S} stroke-width="12"/><path d="M163 215 L135 265 M237 215 L265 265" stroke="{kleid}" stroke-width="6"/>'
    g += f'<circle cx="135" cy="268" r="9" fill="{SKIN}" {S}/><circle cx="265" cy="268" r="9" fill="{SKIN}" {S}/>'
    g += f'<circle cx="200" cy="155" r="38" fill="{SKIN}" {S}/>'
    g += gesicht
    if hut:
        farbe = "#7a1f2b" if reich else "#7a6a58"
        g += f'<path d="M160 135 Q200 95 240 135 Z" fill="{farbe}" {S}/>'
        if reich:
            g += f'<path d="M160 135 Q200 128 240 135" stroke="#f4ecd8" stroke-width="8" fill="none"/>'
    return g + extras

GLUECK = f'<circle cx="186" cy="152" r="4" fill="{INK}"/><circle cx="214" cy="152" r="4" fill="{INK}"/><path d="M184 170 Q200 184 216 170" {S} fill="none"/>'
NEUTRAL = f'<circle cx="186" cy="152" r="4" fill="{INK}"/><circle cx="214" cy="152" r="4" fill="{INK}"/><path d="M188 174 Q200 178 212 172" {S} fill="none"/>'
TRAURIG = (f'<circle cx="186" cy="154" r="4" fill="{INK}"/><circle cx="214" cy="154" r="4" fill="{INK}"/>'
           f'<path d="M176 142 l14 5 M224 142 l-14 5" {S}/><path d="M186 180 Q200 168 214 180" {S} fill="none"/>'
           f'<path d="M218 160 q4 10 0 14" stroke="#4aa3df" stroke-width="5" fill="none"/>')
TOT = (f'<path d="M180 152 q6 5 12 0 M208 152 q6 5 12 0" {S} fill="none"/>'
       f'<path d="M190 176 h20" {S}/>')

KETTE = f'<path d="M172 205 Q200 245 228 205" stroke="#e8b923" stroke-width="7" fill="none"/><circle cx="200" cy="236" r="10" fill="#e8b923" {S}/>'
def muenzen(xs, y=360):
    return "".join(f'<ellipse cx="{x}" cy="{y + (i % 2) * 8}" rx="12" ry="7" fill="#e8b923" {S}/>' for i, x in enumerate(xs))
SACK = f'<path d="M265 262 q-30 10 -25 45 q30 15 55 0 q5 -35 -25 -45 z" fill="#c9a24a" {S}/><path d="M255 262 h20" {S}/><text x="262" y="296" font-size="22" font-family="Georgia" font-weight="bold" fill="{INK}">G</text>'
URKUNDE = f'<path d="M100 250 h40 v35 h-40 z" fill="#f4ecd8" {S}/><circle cx="120" cy="290" r="8" fill="#b3261e" {S}/>'
FICKEN = (f'<path d="M168 230 l12 10 l-12 10 M222 250 l10 -10 l10 10" stroke="#8c6b4a" stroke-width="5" fill="none"/>'
          f'<rect x="150" y="270" width="18" height="14" fill="#a08060" {S}/><rect x="225" y="225" width="16" height="16" fill="#a08060" {S}/>')
VERBAND = f'<path d="M165 128 Q200 110 236 128" stroke="#fff" stroke-width="12" fill="none"/><path d="M165 128 Q200 110 236 128" {S} fill="none"/><path d="M226 150 l8 8 M228 160 l8 -6" stroke="#8a3a7a" stroke-width="4"/>'
FASS = f'<rect x="232" y="180" width="70" height="90" rx="18" fill="#a0683a" {S}/><path d="M232 205 h70 M232 245 h70" {S}/>'
STAND = (f'<rect x="270" y="250" width="110" height="60" fill="#b8865b" {S}/><path d="M265 250 l20 -40 h80 l20 40 z" fill="#e05a47" {S}/>'
         f'<circle cx="300" cy="245" r="14" fill="#f2e3b3" {S}/><circle cx="335" cy="245" r="14" fill="#f2e3b3" {S}/>')
TRUHE = (f'<rect x="270" y="320" width="90" height="55" fill="#8a5a33" {S}/><path d="M270 320 q45 -40 90 0" fill="#a0683a" {S}/>'
         + muenzen([285, 305, 325, 345], 318))
BEUTEL = f'<path d="M290 352 q-20 5 -15 25 q20 8 35 0 q3 -22 -20 -25 z" fill="#c9a24a" {S}/><path d="M285 352 l-8 -10 M295 352 l6 -10" {S}/>'

def liegend(figur_svg, extras=""):
    # Figur liegt auf dem Boden: um 90° gedreht, Kopf links
    return f'<g transform="translate(-20 130) scale(0.8) rotate(-90 200 220)">{figur_svg}</g>' + extras

import re
def _fix(tag):
    # doppeltes stroke-width: das erste (Standard) entfernen
    if tag.group(0).count('stroke-width=') > 1:
        return tag.group(0).replace('stroke-width="4" ', '', 1)
    return tag.group(0)

def svg(inhalt, titel):
    inhalt = re.sub(r'<[^>]+>', _fix, inhalt)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="{titel}">{inhalt}</svg>'

ROT, GRUEN, BRAUN, GRAU = "#b3261e", "#2f7d4a", "#8a6a4a", "#8c8577"
B = {
  "tot_rat":   ("Ratsherr – bis die Pest kam", hintergrund("stadt") + liegend(figur(ROT, True, TOT, KETTE)) + muenzen([300, 330, 360])),
  "tot_reich": ("Reich, aber an der Pest gestorben", hintergrund("stadt") + liegend(figur(GRUEN, True, TOT)) + TRUHE),
  "tot_arm":   ("Arm und an der Pest gestorben", hintergrund("stadt") + liegend(figur(GRAU, False, TOT, FICKEN, hut=False)) + BEUTEL),
  "ratsherr":  ("Ratsherr in Lübeck", hintergrund("stadt") + figur(ROT, True, GLUECK, KETTE + URKUNDE)),
  "reich":     ("Reicher Fernhändler", hintergrund("hafen") + figur(GRUEN, True, GLUECK, SACK)),
  "klein":     ("Kleiner Kaufmann", hintergrund("stadt") + STAND + figur(BRAUN, False, NEUTRAL)),
  "ruiniert":  ("Ruiniert", hintergrund("hafen") + figur(GRAU, False, TRAURIG, FICKEN + VERBAND + FASS, hut=False)),
}
os.makedirs(OUT, exist_ok=True)
for k, (t, inhalt) in B.items():
    open(os.path.join(OUT, k + ".svg"), "w", encoding="utf-8").write(svg(inhalt, t))
print("ok", len(B))
