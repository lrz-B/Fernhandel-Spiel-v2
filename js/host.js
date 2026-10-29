// Spielleitung (Beamer). Steuerung: Knopf, Pfeil rechts, Leertaste, Bild runter (Clicker).
// Ablauf: Lobby -> Runde 1 -> Runde 2 -> Runde 3 -> Auflösung (Schicksale).
// Ergebnisse werden erst am Ende ausgewertet.
import { verbinden, testmodus } from "./backend.js";
import { SPIEL, CHARAKTERE, RUNDEN, SCHICKSALE } from "./content.js";
import { schicksal, normal, charakter, timerSekunden } from "./engine.js";

const app = document.getElementById("app");
const steuerung = document.getElementById("steuerung");
let db, code, status = null, spieler = {};

// Runden mit Entscheidung (ohne die automatischen Ereignisse am Ende)
const SPIELRUNDEN = RUNDEN.map((r, i) => ({ r, i })).filter((x) => !x.r.amEnde);
const mehrereCharaktere = CHARAKTERE.length > 1;

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

const liste = () => Object.values(spieler).map((s) => normal(s));

function balken(eintraege, gesamt) {
  const max = Math.max(1, gesamt);
  return `<div class="balken">${eintraege.map(([label, n]) => `
    <div class="zeile"><span class="label">${label}</span>
      <span class="bar"><span style="width:${(n / max) * 100}%"></span></span>
      <span class="zahl">${n}</span></div>`).join("")}</div>`;
}

function restSekunden() {
  if (!status?.endetUm) return null;
  return Math.max(0, Math.ceil((status.endetUm - Date.now()) / 1000));
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
  } else if (status.phase === "offen" && runde) {
    const nr = SPIELRUNDEN.findIndex((x) => x.i === status.runde) + 1;
    const geantwortet = alle.filter((s) => s.wahl[runde.id]).length;
    const rest = restSekunden();
    const verteilung = runde.optionen.map((o) => [esc(o.text), alle.filter((s) => s.wahl[runde.id] === o.id).length]);
    inhalt = `<p class="jahr">Entscheidung ${nr} von ${SPIELRUNDEN.length}</p>
      <h1>${esc(runde.titel)}</h1><p class="frage">${esc(runde.frage)}</p>
      <p id="timer" class="timer ${rest === 0 ? "um" : ""}">${rest === 0 ? "Zeit um!" : `⏳ ${rest} s`}</p>
      ${balken(verteilung, alle.length)}
      <p class="zaehler">${geantwortet} von ${alle.length} haben entschieden</p>`;
  } else if (status.phase === "ende") {
    const f = {};
    for (const s of alle) (f[schicksal(s).id] ??= []).push(s);
    const tote = alle.filter((s) => s.tot).length;
    inhalt = `<h1>Wie ist es euch ergangen?</h1>
      ${balken(SCHICKSALE.filter((x) => f[x.id]).map((x) => [`${x.emoji} ${esc(x.titel)}`, f[x.id].length]), alle.length)}
      <p class="zaehler">💀 ${tote} von ${alle.length} an der Pest gestorben</p>
      <p class="frage">${esc(SPIEL.schlussfrage)}</p>`;
  }
  app.innerHTML = inhalt;
  if (!status || status.phase === "lobby") qr();
  renderSteuerung();
}

function qr() {
  const el = document.getElementById("qr");
  if (el && window.QRCode) new QRCode(el, { text: spielerUrl(), width: 260, height: 260 });
}

setInterval(() => {
  const el = document.getElementById("timer");
  if (!el || status?.phase !== "offen") return;
  const rest = restSekunden();
  el.textContent = rest === 0 ? "Zeit um!" : `⏳ ${rest} s`;
  el.classList.toggle("um", rest === 0);
}, 250);

function offen(i) {
  return { runde: i, phase: "offen", endetUm: Date.now() + timerSekunden(RUNDEN[i], SPIEL.timerSekunden) * 1000 };
}

function naechsteAktion() {
  if (!status) return null;
  if (status.phase === "lobby") return ["Entscheidung 1 starten", () => offen(SPIELRUNDEN[0].i)];
  if (status.phase === "offen") {
    const pos = SPIELRUNDEN.findIndex((x) => x.i === status.runde);
    const next = SPIELRUNDEN[pos + 1];
    if (next) return [`Entscheidung ${pos + 2} starten`, () => offen(next.i)];
    return ["Auflösung zeigen", () => ({ runde: RUNDEN.length - 1, phase: "ende" })];
  }
  return null;
}

function renderSteuerung() {
  const a = naechsteAktion();
  let naechste = null;
  if (status?.phase === "lobby") naechste = SPIELRUNDEN[0]?.r;
  if (status?.phase === "offen") naechste = SPIELRUNDEN[SPIELRUNDEN.findIndex((x) => x.i === status.runde) + 1]?.r;
  steuerung.innerHTML = `
    <span class="klein">Spiel ${code}${testmodus ? " · Testmodus" : ""}${naechste?.folie ? ` · Nächste Entscheidung: ${esc(naechste.folie)}` : ""}</span>
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
  setTimeout(() => (sperre = false), 600);
  await db.setzen(`spiele/${code}/status`, a[1]());
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
  db = await verbinden();
  code = localStorage.getItem("ks:host");
  if (!code || !(await db.lesen(`spiele/${code}/status`))) return neuesSpiel();
  beobachten();
}

start();
