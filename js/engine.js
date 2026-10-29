// Spiellogik: prüft Optionen, würfelt Ausgänge, bestimmt das Schicksal.
// Inhalte kommen ausschließlich aus content.js.
import { CHARAKTERE, RUNDEN, SCHICKSALE, WERTE } from "./content.js";

export const charakter = (id) => CHARAKTERE.find((c) => c.id === id);

export function neuerSpieler(name, charakterId) {
  const c = charakter(charakterId);
  const werte = {};
  for (const w of WERTE) werte[w.id] = c.start?.[w.id] ?? 0;
  return {
    name: name.slice(0, 24),
    charakter: c.id,
    werte,
    merkmale: { ...(c.merkmale || {}) },
    tot: false,
    wahl: {},       // rundeId -> optionId
    ergebnis: {},   // rundeId -> { text, tag, aenderung, tot }
    beigetreten: Date.now(),
  };
}

// Firebase speichert leere Objekte nicht; hier wieder auffüllen.
export function normal(s) {
  if (!s) return s;
  s.werte ??= {};
  for (const w of WERTE) s.werte[w.id] ??= 0;
  s.merkmale ??= {};
  s.wahl ??= {};
  s.ergebnis ??= {};
  for (const e of Object.values(s.ergebnis)) e.aenderung ??= {};
  return s;
}

function bezahlbar(s, kosten) {
  return !kosten || Object.entries(kosten).every(([k, v]) => (s.werte[k] ?? 0) >= v);
}

export function optionErlaubt(s, opt) {
  if (opt.nur && !opt.nur.includes(s.charakter)) return false;
  if (!bezahlbar(s, opt.kosten)) return false;
  if (opt.bedingung && !opt.bedingung(s)) return false;
  return true;
}

export function kostenText(kosten) {
  if (!kosten) return "";
  return Object.entries(kosten).map(([k, v]) => {
    const w = WERTE.find((x) => x.id === k);
    return `${v} ${w ? w.name : k}`;
  }).join(", ");
}

export function sperrgrund(s, opt) {
  if (!bezahlbar(s, opt.kosten)) return `Zu teuer: ${kostenText(opt.kosten)} nötig.`;
  return opt.sperrgrund || "Für dich nicht möglich.";
}

function wuerfeln(liste) {
  let r = Math.random();
  for (const a of liste) if ((r -= a.p) <= 0) return a;
  return liste[liste.length - 1];
}

function anwenden(s, effekt, aenderung) {
  for (const [k, v] of Object.entries(effekt || {})) {
    const d = typeof v === "function" ? v(s) : v;
    const w = WERTE.find((x) => x.id === k);
    const vorher = s.werte[k] ?? 0;
    let neu = vorher + d;
    if (w?.min != null) neu = Math.max(w.min, neu);
    s.werte[k] = neu;
    aenderung[k] = (aenderung[k] || 0) + (neu - vorher);
  }
}

// Wendet die Wahl eines Spielers für eine Runde an. Gibt den neuen Zustand zurück.
export function aufloesen(spieler, runde) {
  const s = normal(structuredClone(spieler));
  if (s.ergebnis[runde.id] || s.tot) return s;
  const aenderung = {};

  if (runde.typ === "quiz") {
    const gewaehlt = runde.optionen.find((o) => o.id === s.wahl[runde.id]);
    const richtig = !!gewaehlt?.richtig;
    // "vorher" kann die Runde für einzelne Spieler ersetzen (z. B. Hunger bei wenig Geld)
    const sonder = runde.vorher?.(s, richtig);
    if (sonder) {
      anwenden(s, sonder.effekt, aenderung);
      if (sonder.setzt) Object.assign(s.merkmale, sonder.setzt);
      s.ergebnis[runde.id] = { text: sonder.text, tag: sonder.tag || "Sonderfall", aenderung, tot: false };
      return s;
    }
    if (richtig) anwenden(s, runde.bonus, aenderung);
    s.ergebnis[runde.id] = {
      text: richtig ? runde.textRichtig : (gewaehlt ? "" : "Keine Antwort. ") + runde.textFalsch,
      tag: richtig ? "Richtig" : "Falsch", aenderung, tot: false,
    };
    return s;
  }

  let opt = runde.optionen.find((o) => o.id === s.wahl[runde.id]);
  let gezoegert = false;
  if (runde.automatisch || runde.amEnde) {
    opt = runde.optionen[0];
  } else if (!opt || !optionErlaubt(s, opt)) {
    const std = runde.optionen.find((o) => o.id === runde.standard);
    opt = (std && optionErlaubt(s, std) ? std : runde.optionen.find((o) => optionErlaubt(s, o)))
      || runde.optionen[runde.optionen.length - 1];
    gezoegert = true;
    s.wahl[runde.id] = opt.id;
  }

  if (opt.kosten) anwenden(s, Object.fromEntries(Object.entries(opt.kosten).map(([k, v]) => [k, -v])), aenderung);
  if (opt.setzt) Object.assign(s.merkmale, opt.setzt);

  const liste = typeof opt.ausgang === "function" ? opt.ausgang(s) : opt.ausgang;
  const a = wuerfeln(liste);
  anwenden(s, a.effekt, aenderung);
  if (a.setzt) Object.assign(s.merkmale, a.setzt);
  if (a.tot) s.tot = true;

  s.ergebnis[runde.id] = {
    text: (gezoegert ? "Du hast zu lange gezögert. " : "") + a.text,
    tag: a.tag || opt.id,
    option: opt.id,
    aenderung,
    tot: !!a.tot,
  };
  return s;
}

export function schicksal(s) {
  return SCHICKSALE.find((x) => x.wenn(normal(s))) || SCHICKSALE[SCHICKSALE.length - 1];
}

export function timerSekunden(runde, standard) {
  return runde?.timer ?? standard;
}

export { RUNDEN };
