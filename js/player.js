// Spielerseite (Handy).
// Ablauf: Name eingeben -> Entscheidungen (solange die Spielleitung die Runde offen hat)
// -> Auflösung. Ausgewertet wird zentral auf dem Beamer, das Handy zeigt nur an.
import { verbinden, testmodus, fehlerAnzeigen, verbindungsHinweis } from "./backend.js";
import { SPIEL, CHARAKTERE, RUNDEN, WERTE } from "./content.js";
import { neuerSpieler, optionErlaubt, sperrgrund, schicksal, normal, charakter, kostenText, kopie } from "./engine.js";

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

const ausgewertet = () => RUNDEN.every((r) => ich.ergebnis[r.id]);

function aenderungText(a) {
  return WERTE.filter((w) => a[w.id]).map((w) => `${a[w.id] > 0 ? "+" : ""}${a[w.id]} ${esc(w.name)}`).join(" · ");
}

function statusleiste() {
  const zeigeWerte = status?.phase === "ende" && ausgewertet();
  return `<div class="leiste"><span>${esc(ich.name)}</span>
    ${zeigeWerte ? WERTE.map((w) => `<span>${w.emoji} ${ich.werte[w.id] ?? 0}</span>`).join("") : ""}
    ${zeigeWerte && ich.tot ? "<span>💀</span>" : ""}</div>`;
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
    inhalt = `<div class="karte mitte"><div class="gross">⚓</div>
      <h2>Du bist dabei, ${esc(ich.name)}!</h2><p>${esc(charakter(ich.charakter)?.text || "")}</p>
      <p class="hinweis">Gleich geht's los. Schau nach vorne!</p></div>`;
  } else if (status.phase === "offen" && runde) {
    inhalt = renderFrage(runde);
  } else if (status.phase === "zu" && runde) {
    const opt = runde.optionen.find((o) => o.id === ich.wahl[runde.id]);
    inhalt = `<div class="karte mitte"><p class="klein">${esc(runde.titel)}</p>
      <h2>Abstimmung beendet</h2>
      <p>${opt ? `Deine Wahl: <b>${esc(opt.text)}</b>` : "Du hast nichts gewählt. Dann gilt eine Standard-Wahl."}</p>
      <p class="hinweis">Was daraus wird, erfährst du am Ende.</p></div>`;
  } else if (status.phase === "ende") {
    inhalt = ausgewertet() ? renderSchicksal() : `<div class="karte mitte"><p>Wird ausgewertet …</p></div>`;
  } else {
    inhalt = `<div class="karte mitte"><p>Warte …</p></div>`;
  }
  app.innerHTML = statusleiste() + inhalt;
}

function renderFrage(runde) {
  const gewaehlt = ich.wahl[runde.id];
  const knoepfe = runde.optionen.map((o) => {
    const ok = runde.typ === "quiz" || optionErlaubt(ich, o);
    return `<button class="option ${gewaehlt === o.id ? "aktiv" : ""}" data-opt="${o.id}" ${ok ? "" : "disabled"}>
      ${esc(o.text)}${o.kosten ? ` <span class="preis">${esc(kostenText(o.kosten))}</span>` : ""}${ok ? "" : `<small>${esc(sperrgrund(ich, o))}</small>`}</button>`;
  }).join("");
  return `<div class="karte">
    <p class="klein">${esc(runde.titel)}</p>
    <h2>${esc(runde.frage)}</h2>
    <div class="optionen">${knoepfe}</div>
    ${gewaehlt ? `<p class="hinweis">Gespeichert. Du kannst noch umentscheiden, bis die Abstimmung beendet wird.</p>` : ""}
  </div>`;
}

function renderSchicksal() {
  const f = schicksal(ich);
  const platz = ich.platz ? `<p class="platz">Platz ${ich.platz} von ${ich.von} auf der Rangliste</p>` : "";
  return `<div class="karte mitte schicksal"><p class="klein">Dein Schicksal</p>
      ${f.bild ? `<img class="schicksalsbild" src="${esc(f.bild)}" alt="">` : `<div class="gross">${f.emoji}</div>`}
      <h2>${esc(f.titel)}</h2><p>${esc(f.text)}</p>
      <p class="klein">Endstand: ${WERTE.map((w) => `${ich.werte[w.id]} ${esc(w.name)}`).join(" · ")}</p>${platz}</div>
    ${verlauf()}`;
}

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
      <span class="gross">${c.emoji}</span><b>${esc(c.name)}</b><small>${esc(c.text)}</small></button>`).join("");
  app.innerHTML = `<div class="karte">
    <h1>${esc(SPIEL.titel)}</h1><p>${esc(SPIEL.untertitel)}</p>
    <form id="f">
      <input id="n" maxlength="24" placeholder="Dein Name" autocomplete="off" required>
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
  const s = kopie(ich);
  s.wahl[runde.id] = b.dataset.opt;
  ich = s;
  render();                            // sofort markieren, dann speichern
  try {
    await speichern(s);
  } catch (err) {
    fehlerkasten("Deine Wahl konnte nicht gespeichert werden. Bitte nochmal tippen. (" + err.message + ")");
  }
});

// Fehler sichtbar machen statt still nichts zu tun
function fehlerkasten(text) {
  let el = document.getElementById("fehler");
  if (!el) {
    el = document.createElement("div");
    el.id = "fehler";
    el.className = "offline";
    el.style.top = "auto"; el.style.bottom = "0";
    document.body.appendChild(el);
  }
  el.textContent = text;
}
window.addEventListener("error", (e) => fehlerkasten("Fehler: " + e.message));
window.addEventListener("unhandledrejection", (e) => fehlerkasten("Fehler: " + (e.reason?.message || e.reason)));

async function start() {
  if (testmodus) document.body.insertAdjacentHTML("beforeend", `<div class="testmodus">Testmodus</div>`);
  if (!code) return render();
  try {
    db = await verbinden();
  } catch (e) {
    console.error(e);
    return fehlerAnzeigen(app);
  }
  verbindungsHinweis(db);
  let letzterStatus, letztesIch;
  db.beobachten(`spiele/${code}/status`, (s) => {
    const j = JSON.stringify(s);
    if (j === letzterStatus) return;
    letzterStatus = j;
    status = s;
    render();
  });
  db.beobachten(`spiele/${code}/spieler/${spielerId()}`, (s) => {
    const j = JSON.stringify(s);
    if (j === letztesIch) return;
    letztesIch = j;
    if (!s && !ich) {
      // Demo-Seite: automatisch beitreten
      if (params.get("name") && params.get("char")) return speichern(neuerSpieler(params.get("name"), params.get("char")));
      return render();
    }
    ich = normal(s);
    render();
  });
}

start();
