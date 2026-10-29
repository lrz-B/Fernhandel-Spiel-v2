// Spielleitung (Beamer). Weiter mit Knopf, Pfeil rechts, Leertaste, Enter oder Clicker.
// Ablauf (alles per Klick, kein Timer):
//   Lobby -> Entscheidung 1 starten -> beenden -> Entscheidung 2 starten -> beenden -> ...
//   -> Lösung aufdecken (Schicksale) -> Rangliste zeigen
// Beim Aufdecken rechnet der Beamer die Ergebnisse ALLER Spieler aus und speichert sie.
// So zählen auch Handys, die gerade gesperrt oder offline sind.
import { verbinden, testmodus, fehlerAnzeigen, verbindungsHinweis } from "./backend.js";
import { SPIEL, CHARAKTERE, RUNDEN, SCHICKSALE } from "./content.js";
import { schicksal, normal, aufloesen } from "./engine.js";

const app = document.getElementById("app");
const steuerung = document.getElementById("steuerung");
let db, code, status = null, spieler = {};

// Runden mit Entscheidung (ohne die automatischen Ereignisse am Ende)
const SPIELRUNDEN = RUNDEN.map((r, i) => ({ r, i })).filter((x) => !x.r.amEnde);
const mehrereCharaktere = CHARAKTERE.length > 1;
const RANGLISTE_PLAETZE = 10;

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function neuerCode() {
  const z = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => z[Math.floor(Math.random() * z.length)]).join("");
}

function spielerUrl() {
  const u = new URL("index.html", location.href);
  u.search = "?code=" + code;
  return u.href;
}

const liste = () => Object.entries(spieler).map(([id, s]) => ({ id, ...normal(s) }));
const nr = () => SPIELRUNDEN.findIndex((x) => x.i === status?.runde) + 1;

function balken(eintraege, gesamt) {
  const max = Math.max(1, gesamt);
  return `<div class="balken">${eintraege.map(([label, n]) => `
    <div class="zeile"><span class="label">${label}</span>
      <span class="bar"><span style="width:${(n / max) * 100}%"></span></span>
      <span class="zahl">${n}</span></div>`).join("")}</div>`;
}

function rangliste(alle) {
  return [...alle].sort((a, b) => (b.werte.geld - a.werte.geld) || a.name.localeCompare(b.name));
}

function render() {
  const alle = liste();
  const runde = RUNDEN[status?.runde];
  let inhalt = "";

  if (!status || status.phase === "lobby") {
    const proChar = mehrereCharaktere
      ? CHARAKTERE.map((c) => `${c.emoji} ${alle.filter((s) => s.charakter === c.id).length}`).join("&nbsp;&nbsp;") : "";
    inhalt = `<div class="lobby">
      <div>
        <h1>${esc(SPIEL.titel)}</h1><p class="unter">${esc(SPIEL.untertitel)}</p>
        <p class="beitritt">Handy raus! QR-Code scannen<br>oder Code eingeben: <b class="code">${code}</b></p>
        <p class="url">${esc(spielerUrl())}</p>
      </div>
      <div id="qr"></div>
    </div>
    <h2><span id="anzahl">${alle.length}</span> im Spiel &nbsp; <span class="klein">${proChar}</span></h2>
    <div class="namen">${alle.map((s) => `<span>${esc(s.name)}</span>`).join("")}</div>`;
  } else if ((status.phase === "offen" || status.phase === "zu") && runde) {
    const offen = status.phase === "offen";
    const geantwortet = alle.filter((s) => s.wahl[runde.id]).length;
    const verteilung = runde.optionen.map((o) => [esc(o.text), alle.filter((s) => s.wahl[runde.id] === o.id).length]);
    inhalt = `<p class="jahr">Entscheidung ${nr()} von ${SPIELRUNDEN.length}</p>
      <h1>${esc(runde.titel)}</h1><p class="frage">${esc(runde.frage)}</p>
      <p class="timer ${offen ? "" : "um"}">${offen ? "Abstimmung läuft" : "Abstimmung beendet"}</p>
      ${balken(verteilung, alle.length)}
      <p class="zaehler">${geantwortet} von ${alle.length} haben entschieden</p>`;
  } else if (status.phase === "ende" && status.ansicht === "rangliste") {
    const r = rangliste(alle);
    const zeilen = r.slice(0, RANGLISTE_PLAETZE).map((s, i) => `
      <li class="${s.tot ? "tot" : ""}"><span class="rang">${i + 1}.</span><span class="name">${esc(s.name)}${s.tot ? " 💀" : ""}</span>
        <span class="geld">${s.werte.geld} Gulden</span></li>`).join("");
    inhalt = `<h1>Rangliste: Wer hat am meisten Geld?</h1>
      <ol class="rangliste">${zeilen}</ol>
      <p class="zaehler">💀 = an der Pest gestorben – das Geld hat nichts genützt.</p>
      <p class="frage">${esc(SPIEL.schlussfrage)}</p>`;
  } else if (status.phase === "ende") {
    const f = {};
    for (const s of alle) (f[schicksal(s).id] ??= []).push(s);
    const tote = alle.filter((s) => s.tot).length;
    inhalt = `<h1>Wie ist es euch ergangen?</h1>
      ${balken(SCHICKSALE.filter((x) => f[x.id]).map((x) => [`${x.emoji} ${esc(x.titel)}`, f[x.id].length]), alle.length)}
      <p class="zaehler">💀 ${tote} von ${alle.length} an der Pest gestorben</p>`;
  }
  app.innerHTML = inhalt;
  if (!status || status.phase === "lobby") qr();
  renderSteuerung();
}

function qr() {
  const el = document.getElementById("qr");
  if (el && window.QRCode) new QRCode(el, { text: spielerUrl(), width: 260, height: 260 });
}

// Wertet alle Spieler aus, vergibt Ranglistenplätze und speichert alles.
async function alleAuswerten() {
  const alle = liste().map(({ id, ...s }) => {
    let neu = s;
    for (const r of RUNDEN) neu = aufloesen(neu, r);
    return { id, ...neu };
  });
  const r = rangliste(alle);
  r.forEach((s, i) => { s.platz = i + 1; s.von = r.length; });
  await Promise.all(r.map(({ id, ...s }) => db.setzen(`spiele/${code}/spieler/${id}`, s)));
}

function naechsteAktion() {
  if (!status) return null;
  const pos = SPIELRUNDEN.findIndex((x) => x.i === status.runde);
  if (status.phase === "lobby") return ["Entscheidung 1 starten", { runde: SPIELRUNDEN[0].i, phase: "offen" }];
  if (status.phase === "offen") return [`Entscheidung ${pos + 1} beenden`, { runde: status.runde, phase: "zu" }];
  if (status.phase === "zu") {
    const next = SPIELRUNDEN[pos + 1];
    if (next) return [`Entscheidung ${pos + 2} starten`, { runde: next.i, phase: "offen" }];
    return ["Lösung aufdecken", { runde: RUNDEN.length - 1, phase: "ende", ansicht: "schicksale" }, alleAuswerten];
  }
  if (status.phase === "ende" && status.ansicht !== "rangliste") return ["Rangliste zeigen", { ...status, ansicht: "rangliste" }];
  return null;
}

function renderSteuerung() {
  const a = naechsteAktion();
  let hinweis = "";
  if (status?.phase === "lobby") hinweis = SPIELRUNDEN[0]?.r.folie;
  if (status?.phase === "zu") hinweis = SPIELRUNDEN[SPIELRUNDEN.findIndex((x) => x.i === status.runde) + 1]?.r.folie;
  steuerung.innerHTML = `
    <span class="klein">Spiel ${code}${testmodus ? " · Testmodus" : ""}${hinweis ? ` · Nächste Entscheidung: ${esc(hinweis)}` : ""}</span>
    ${a ? `<button id="weiter">${a[0]} ▶</button>` : ""}
    <button id="neu" class="leise">Neues Spiel</button>`;
  document.getElementById("weiter")?.addEventListener("click", weiter);
  document.getElementById("neu").onclick = () => {
    if (confirm("Neues Spiel starten? Alle Spieler müssen neu beitreten.")) neuesSpiel();
  };
}

let sperre = false;
async function weiter() {
  const a = naechsteAktion();
  if (!a || sperre) return;
  sperre = true;                       // Doppelklicks am Clicker abfangen
  try {
    if (a[2]) await a[2]();            // z. B. erst alle auswerten, dann aufdecken
    await db.setzen(`spiele/${code}/status`, a[1]);
  } finally {
    setTimeout(() => (sperre = false), 600);
  }
}

document.addEventListener("keydown", (e) => {
  if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); weiter(); }
});

let stops = [];
function beobachten() {
  stops.forEach((f) => f && f());
  stops = [
    db.beobachten(`spiele/${code}/status`, (s) => { status = s; render(); }),
    db.beobachten(`spiele/${code}/spieler`, (s) => { spieler = s || {}; render(); }),
  ];
}

async function neuesSpiel() {
  code = neuerCode();
  localStorage.setItem("ks:host", code);
  await db.setzen(`spiele/${code}`, { status: { runde: -1, phase: "lobby" } });
  beobachten();
}

async function start() {
  try {
    db = await verbinden();
  } catch (e) {
    console.error(e);
    return fehlerAnzeigen(app);
  }
  verbindungsHinweis(db);
  code = localStorage.getItem("ks:host");
  if (!code || !(await db.lesen(`spiele/${code}/status`))) return neuesSpiel();
  beobachten();
}

start();
