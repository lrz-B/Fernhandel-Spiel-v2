// Datenverbindung. Mit Firebase-Config: Firebase Realtime Database.
// Ohne: Testmodus über localStorage (nur Tabs auf demselben Gerät).
//
// Datenmodell:
//   spiele/<code>/status            { runde: -1..n, phase: "lobby"|"offen"|"ergebnis"|"ende" }
//   spiele/<code>/spieler/<id>      Spielerzustand (siehe engine.neuerSpieler)
import { FIREBASE_CONFIG } from "./config.js";

export const testmodus = !FIREBASE_CONFIG;

async function firebaseBackend() {
  const v = "10.12.2";
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`);
  const db = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-database.js`);
  const app = initializeApp(FIREBASE_CONFIG);
  const d = db.getDatabase(app);
  const r = (p) => db.ref(d, p);
  return {
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
      for (const k of teile.slice(0, -1)) o = o[k] ??= {};
      if (wert === null) delete o[teile.at(-1)];
      else o[teile.at(-1)] = JSON.parse(JSON.stringify(wert));
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
