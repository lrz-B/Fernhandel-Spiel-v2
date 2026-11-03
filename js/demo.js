// Demo: Beamer + vier Handys in einem Fenster, dazu Bot-Spieler.
// Nur für den Testmodus gedacht. Für das echte Spiel nicht nötig.
import { verbinden } from "./backend.js?v=3";
import { CHARAKTERE, RUNDEN } from "./content.js?v=3";
import { neuerSpieler, optionErlaubt, normal } from "./engine.js?v=3";

const BOTS = 20;
const NAMEN = ["Hinrich", "Gesa", "Tidemann", "Wobbeke", "Gerd", "Alheyd", "Johann", "Margarete", "Hermen", "Tale",
  "Clawes", "Geseke", "Bertold", "Kunne", "Albert", "Mette", "Detmar", "Grete", "Lambert", "Telse"];
const HANDYS = [["Anna"], ["Ben"], ["Can"], ["Dana"]].map(([n]) => [n, CHARAKTERE[0].id]);

const db = await verbinden();
let code = null, stops = [];

function zufall(liste) { return liste[Math.floor(Math.random() * liste.length)]; }

async function warteAufCode() {
  for (;;) {
    const c = localStorage.getItem("ks:host");
    if (c && (await db.lesen(`spiele/${c}/status`))) return c;
    await new Promise((r) => setTimeout(r, 300));
  }
}

function handysLaden() {
  const link = document.getElementById("eigener");
  link.href = `index.html?code=${code}&neu`;
  link.textContent = `Eigenen Spieler-Tab öffnen (Spiel ${code})`;
  const el = document.getElementById("handys");
  el.innerHTML = HANDYS.map(([name, ch], i) => {
    const c = CHARAKTERE.find((x) => x.id === ch);
    return `<figure><figcaption>📱 ${name}</figcaption>
      <iframe src="index.html?code=${code}&slot=${i}&name=${name}&char=${ch}"></iframe></figure>`;
  }).join("");
}

async function botsAnlegen() {
  for (let i = 0; i < BOTS; i++) {
    const ch = CHARAKTERE[i % CHARAKTERE.length].id;
    await db.setzen(`spiele/${code}/spieler/bot${i}`, neuerSpieler(NAMEN[i] + " (Bot)", ch));
  }
}

async function botsSpielen(status) {
  if (!status) return;
  const runde = RUNDEN[status.runde];
  for (let i = 0; i < BOTS; i++) {
    const pfad = `spiele/${code}/spieler/bot${i}`;
    let s = normal(await db.lesen(pfad));
    if (!s) continue;
    if (status.phase === "offen" && runde && !s.wahl[runde.id] && !s.tot && !runde.automatisch) {
      const erlaubt = runde.optionen.filter((o) => runde.typ === "quiz" || optionErlaubt(s, o));
      // Bots wählen etwas verzögert, damit die Balken auf dem Beamer wachsen
      setTimeout(async () => {
        const jetzt = await db.lesen(`spiele/${code}/status`);
        if (jetzt?.phase !== "offen" || jetzt.runde !== status.runde) return;  // Abstimmung schon vorbei
        const t = normal(await db.lesen(pfad));
        if (!t || t.wahl[runde.id]) return;
        t.wahl[runde.id] = zufall(erlaubt).id;
        await db.setzen(pfad, t);
      }, 500 + Math.random() * 4000);
    }
  }
}

async function start() {
  stops.forEach((f) => f && f());
  code = await warteAufCode();
  handysLaden();
  const status = await db.lesen(`spiele/${code}/status`);
  if (status.phase === "lobby" && !(await db.lesen(`spiele/${code}/spieler/bot0`))) await botsAnlegen();
  let letzter;
  stops = [db.beobachten(`spiele/${code}/status`, (s) => {
    const j = JSON.stringify(s);
    if (j === letzter) return;
    letzter = j;
    botsSpielen(s);
  })];
}

// Klickt jemand auf „Neues Spiel“, ändert sich der Code: Demo neu aufsetzen.
setInterval(() => {
  const c = localStorage.getItem("ks:host");
  if (c && code && c !== code) { code = null; start(); }
}, 1000);

start();
