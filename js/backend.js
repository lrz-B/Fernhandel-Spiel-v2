// Datenverbindung. Mit Firebase-Config: Firebase Realtime Database.
// Ohne: Testmodus über localStorage (nur Tabs auf demselben Gerät).
//
// Datenmodell:
//   spiele/<code>/status            { runde: -1..n, phase: "lobby"|"offen"|"ende", endetUm }
//   spiele/<code>/spieler/<id>      Spielerzustand (siehe engine.neuerSpieler)
import { FIREBASE_CONFIG, SPIELCODE } from "./config.js?v=4";
export { SPIELCODE };

export const testmodus = !FIREBASE_CONFIG;

function mitZeitlimit(promise, ms) {
  return Promise.race([promise, new Promise((_, nein) => setTimeout(() => nein(new Error("Zeitüberschreitung")), ms))]);
}

async function firebaseBackend() {
  const v = "10.12.2";
  const [{ initializeApp }, db] = await mitZeitlimit(Promise.all([
    import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${v}/firebase-database.js`),
  ]), 15000);
  const app = initializeApp(FIREBASE_CONFIG);
  const d = db.getDatabase(app);
  const r = (p) => db.ref(d, p);
  // Unterschied zwischen Geräteuhr und Serveruhr, damit der Timer überall gleich läuft
  let versatz = 0;
  db.onValue(r(".info/serverTimeOffset"), (snap) => { versatz = snap.val() || 0; });
  // Erste Verbindung abwarten, sonst klare Fehlermeldung
  await mitZeitlimit(new Promise((ja) => {
    const stop = db.onValue(r(".info/connected"), (snap) => { if (snap.val()) { stop(); ja(); } });
  }), 15000);
  return {
    jetzt: () => Date.now() + versatz,
    verbindung(cb) {
      return db.onValue(r(".info/connected"), (snap) => cb(!!snap.val()));
    },
    beobachten(pfad, cb) {
      return db.onValue(r(pfad), (snap) => cb(snap.val()));
    },
    setzen(pfad, wert) {
      return db.set(r(pfad), wert);
    },
    async lesen(pfad) {
      return (await db.get(r(pfad))).val();
    },
  };
}

function lokalesBackend() {
  const PREFIX = "klassenspiel:";
  const kanal = "BroadcastChannel" in window ? new BroadcastChannel("klassenspiel") : null;
  const hoerer = new Set();

  function alles() {
    try { return JSON.parse(localStorage.getItem(PREFIX + "db") || "{}"); } catch { return {}; }
  }
  function holen(baum, pfad) {
    return pfad.split("/").filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), baum) ?? null;
  }
  function benachrichtigen() {
    const baum = alles();
    for (const h of hoerer) h.cb(holen(baum, h.pfad));
  }
  kanal?.addEventListener("message", benachrichtigen);
  window.addEventListener("storage", (e) => { if (e.key === PREFIX + "db") benachrichtigen(); });

  return {
    jetzt: () => Date.now(),
    verbindung(cb) { cb(true); return () => {}; },
    beobachten(pfad, cb) {
      const h = { pfad, cb };
      hoerer.add(h);
      setTimeout(() => cb(holen(alles(), pfad)), 0);
      return () => hoerer.delete(h);
    },
    async setzen(pfad, wert) {
      const baum = alles();
      const teile = pfad.split("/").filter(Boolean);
      let o = baum;
      for (const k of teile.slice(0, -1)) { if (!o[k]) o[k] = {}; o = o[k]; }
      const letzter = teile[teile.length - 1];
      if (wert === null) delete o[letzter];
      else o[letzter] = JSON.parse(JSON.stringify(wert));
      localStorage.setItem(PREFIX + "db", JSON.stringify(baum));
      kanal?.postMessage("x");
      benachrichtigen();
    },
    async lesen(pfad) {
      return holen(alles(), pfad);
    },
  };
}

export async function verbinden() {
  return testmodus ? lokalesBackend() : firebaseBackend();
}

// Gemeinsame Anzeige, wenn keine Verbindung zustande kommt oder sie abreißt.
export function fehlerAnzeigen(app) {
  app.innerHTML = `<div class="karte mitte"><div class="gross">📡</div>
    <h2>Keine Verbindung zum Spiel</h2>
    <p>Das WLAN lässt die Verbindung vielleicht nicht durch. Versuch es mit mobilen Daten oder lade die Seite neu.</p>
    <button onclick="location.reload()">Neu laden</button></div>`;
}

export function verbindungsHinweis(db) {
  let el = null;
  db.verbindung((ok) => {
    if (ok) { el?.remove(); el = null; return; }
    if (!el) {
      el = document.createElement("div");
      el.className = "offline";
      el.textContent = "Verbindung unterbrochen … wird wiederhergestellt";
      document.body.appendChild(el);
    }
  });
}
