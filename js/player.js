// Spielerseite (Handy).
import { verbinden, testmodus } from "./backend.js";
import { SPIEL, CHARAKTERE, RUNDEN, WERTE } from "./content.js";
import { neuerSpieler, optionErlaubt, sperrgrund, aufloesen, schicksal, normal, charakter, kostenText } from "./engine.js";

const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const code = (params.get("code") || "").toUpperCase();
let db, status = null, ich = null;
let gewaehlterCharakter = null;

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Spieler-ID pro Spiel. ?neu in der URL erzwingt eine neue ID (zum Testen mehrerer Spieler in Tabs).
// ?slot=N (Demo-Seite) gibt mehreren Handys im selben Fenster eigene IDs.
function spielerId() {
  const lokal = params.has("neu") || params.has("slot");
  const k = "ks:pid:" + code + (params.has("slot") ? ":" + params.get("slot") : "");
  const speicher = lokal ? sessionStorage : localStorage;
  let id = speicher.getItem(k);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    speicher.setItem(k, id);
  }
  return id;
}

async function speichern(s) {
  ich = s;
  await db.setzen(`spiele/${code}/spieler/${spielerId()}`, s);
}

const werteText = (werte) => WERTE.map((w) => `<span>${w.emoji} ${werte[w.id] ?? 0}</span>`).join("");

function aenderungText(a) {
  return WERTE.filter((w) => a[w.id]).map((w) => `${a[w.id] > 0 ? "+" : ""}${a[w.id]} ${esc(w.name)}`).join(" · ");
}

function statusleiste() {
  if (!ich) return "";
  const c = charakter(ich.charakter);
  // Werte erst bei der Auflösung zeigen, vorher nur den Namen
  const ende = status?.phase === "ende";
  return `<div class="leiste"><span>${c.emoji} ${esc(ich.name)}</span>${ende ? werteText(ich.werte) : ""}${ende && ich.tot ? "<span>💀</span>" : ""}</div>`;
}

function render() {
  if (!code) return renderCodeEingabe();
  if (!status) {
    app.innerHTML = `<div class="karte"><h2>Spiel ${esc(code)} nicht gefunden</h2>
      <p>Prüfe den Code oder warte, bis das Spiel gestartet ist.</p>
      <button onclick="location.href=location.pathname">Anderer Code</button></div>`;
    return;
  }
  if (!ich) return renderBeitreten();

  const runde = RUNDEN[status.runde];
  let inhalt = "";

  if (status.phase === "lobby") {
    const c = charakter(ich.charakter);
    inhalt = `<div class="karte mitte"><div class="gross">${c.emoji}</div>
      <h2>Du bist dabei!</h2><p>${esc(c.name)}. ${esc(c.text)}</p>
      <p class="hinweis">Gleich geht's los. Schau nach vorne!</p></div>`;
  } else if (status.phase === "ende") {
    const f = schicksal(ich);
    inhalt = `<div class="karte mitte schicksal"><p class="klein">Dein Schicksal</p>
      <div class="gross">${f.emoji}</div><h2>${esc(f.titel)}</h2><p>${esc(f.text)}</p>
      <p class="klein">Endstand: ${WERTE.map((w) => `${ich.werte[w.id]} ${esc(w.name)}`).join(" · ")}</p></div>${verlauf()}`;
  } else if (ich.tot) {
    inhalt = `<div class="karte mitte"><div class="gross">💀</div><h2>Du bist tot.</h2>
      <p>Schau zu, wie es den anderen ergeht.</p></div>${verlauf()}`;
  } else if (status.phase === "offen" && runde) {
    inhalt = renderFrage(runde);
  } else if (status.phase === "ergebnis" && runde) {
    const e = ich.ergebnis[runde.id];
    inhalt = e
      ? `<div class="karte ${e.tot ? "schlecht" : ""}"><p class="klein">${esc(runde.titel)}</p>
          <h2>${e.tot ? "💀 " : ""}${esc(e.text)}</h2>
          <p class="aenderung">${aenderungText(e.aenderung)}</p>
          <p class="hinweis">Warte auf die nächste Runde …</p></div>`
      : `<div class="karte mitte"><p>Wird ausgewertet …</p></div>`;
  } else {
    inhalt = `<div class="karte mitte"><p>Warte …</p></div>`;
  }
  app.innerHTML = statusleiste() + inhalt;
}

function renderFrage(runde) {
  if (runde.automatisch) {
    return `<div class="karte mitte"><p class="klein">${esc(runde.titel)}</p>
      <h2>${esc(runde.frage)}</h2><p class="hinweis">Schau nach vorne …</p></div>`;
  }
  const gewaehlt = ich.wahl[runde.id];
  const rest = status.endetUm ? Math.max(0, Math.ceil((status.endetUm - Date.now()) / 1000)) : null;
  const knoepfe = runde.optionen.map((o) => {
    const ok = runde.typ === "quiz" || optionErlaubt(ich, o);
    return `<button class="option ${gewaehlt === o.id ? "aktiv" : ""}" data-opt="${o.id}" ${ok ? "" : "disabled"}>
      ${esc(o.text)}${o.kosten ? ` <span class="preis">${esc(kostenText(o.kosten))}</span>` : ""}${ok ? "" : `<small>${esc(sperrgrund(ich, o))}</small>`}</button>`;
  }).join("");
  return `<div class="karte">
    <p class="klein">${esc(runde.titel)} · <span id="timer">${rest == null ? "" : rest === 0 ? "Zeit um" : `⏳ ${rest} s`}</span></p>
    <h2>${esc(runde.frage)}</h2>
    <div class="optionen">${knoepfe}</div>
    ${gewaehlt ? `<p class="hinweis">Entschieden. Du kannst noch umentscheiden, bis es weitergeht. Was passiert, erfährst du am Ende.</p>` : ""}
  </div>`;
}

setInterval(() => {
  const el = document.getElementById("timer");
  if (!el || status?.phase !== "offen" || !status.endetUm) return;
  const rest = Math.max(0, Math.ceil((status.endetUm - Date.now()) / 1000));
  el.textContent = rest === 0 ? "Zeit um" : `⏳ ${rest} s`;
}, 250);

function verlauf() {
  const zeilen = RUNDEN.filter((r) => ich.ergebnis[r.id]).map((r) => {
    const e = ich.ergebnis[r.id];
    const opt = r.amEnde ? "" : r.optionen.find((o) => o.id === ich.wahl[r.id])?.text;
    const a = aenderungText(e.aenderung);
    return `<li><b>${esc(r.titel)}</b>${opt ? ` – ${esc(opt)}` : ""}<br>${esc(e.text)}${a ? ` <span class="aenderung">${a}</span>` : ""}</li>`;
  }).join("");
  return zeilen ? `<div class="karte"><h3>Was passiert ist</h3><ol class="verlauf">${zeilen}</ol></div>` : "";
}

function renderCodeEingabe() {
  app.innerHTML = `<div class="karte mitte">
    <h1>${esc(SPIEL.titel)}</h1><p>${esc(SPIEL.untertitel)}</p>
    <form id="f"><input id="c" maxlength="4" placeholder="Spielcode" autocomplete="off" autocapitalize="characters" required>
    <button>Weiter</button></form></div>`;
  document.getElementById("f").onsubmit = (e) => {
    e.preventDefault();
    location.search = "?code=" + document.getElementById("c").value.trim().toUpperCase();
  };
}

function renderBeitreten() {
  if (CHARAKTERE.length === 1) gewaehlterCharakter = CHARAKTERE[0].id;
  const karten = CHARAKTERE.map((c) => `
    <button type="button" class="charakter ${gewaehlterCharakter === c.id ? "aktiv" : ""}" data-char="${c.id}">
      <span class="gross">${c.emoji}</span><b>${esc(c.name)}</b><small>${esc(c.text)}</small>
      <span class="werte-start">${WERTE.map((w) => `${w.emoji} ${c.start?.[w.id] ?? 0}`).join(" ")}</span></button>`).join("");
  app.innerHTML = `<div class="karte">
    <h1>${esc(SPIEL.titel)}</h1><p>${esc(SPIEL.untertitel)}</p>
    <form id="f">
      <input id="n" maxlength="24" placeholder="Dein Name" required>
      ${CHARAKTERE.length > 1 ? `<p class="klein">Wer bist du?</p><div class="charaktere">${karten}</div>` : ""}
      <button id="los" ${gewaehlterCharakter ? "" : "disabled"}>Beitreten</button>
    </form></div>`;
  const name = document.getElementById("n");
  name.value = sessionStorage.getItem("ks:name") || "";
  name.oninput = () => sessionStorage.setItem("ks:name", name.value);
  app.querySelectorAll("[data-char]").forEach((b) => (b.onclick = () => {
    gewaehlterCharakter = b.dataset.char;
    renderBeitreten();
  }));
  document.getElementById("f").onsubmit = async (e) => {
    e.preventDefault();
    if (!gewaehlterCharakter || !name.value.trim()) return;
    await speichern(neuerSpieler(name.value.trim(), gewaehlterCharakter));
    render();
  };
}

app.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-opt]");
  if (!b || !ich || status?.phase !== "offen") return;
  const runde = RUNDEN[status.runde];
  const s = structuredClone(ich);
  s.wahl[runde.id] = b.dataset.opt;
  await speichern(s);
  render();
});

// Jedes Handy wertet seine eigene Wahl aus, sobald die Runde geschlossen wird.
// Ist eine Runde übersprungen worden (Handy war kurz weg), wird sie nachgeholt.
async function pruefeAufloesung() {
  if (!ich || !status || !["ergebnis", "ende"].includes(status.phase)) return;
  let s = ich;
  for (let i = 0; i <= status.runde; i++) s = aufloesen(s, RUNDEN[i]);
  if (JSON.stringify(s) !== JSON.stringify(ich)) await speichern(s);
}

async function start() {
  if (testmodus) document.body.insertAdjacentHTML("beforeend", `<div class="testmodus">Testmodus</div>`);
  if (!code) return render();
  db = await verbinden();
  let letzterStatus, letztesIch;
  db.beobachten(`spiele/${code}/status`, async (s) => {
    const j = JSON.stringify(s);
    if (j === letzterStatus) return;
    letzterStatus = j;
    status = s;
    await pruefeAufloesung();
    render();
  });
  db.beobachten(`spiele/${code}/spieler/${spielerId()}`, async (s) => {
    const j = JSON.stringify(s);
    if (j === letztesIch) return;
    letztesIch = j;
    if (!s && !ich) {
      if (params.get("name") && params.get("char")) return speichern(neuerSpieler(params.get("name"), params.get("char")));
      return render();
    }
    ich = normal(s);
    await pruefeAufloesung();
    render();
  });
}

start();
