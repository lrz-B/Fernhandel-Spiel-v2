// =============================================================================
//  ALLE INHALTE DES SPIELS STEHEN IN DIESER DATEI.
// =============================================================================
// Ablauf: Beitreten (nur Name) -> 3 Entscheidungen -> Auflösung am Ende.
//   nach Folie 6:  Runde 1 – Welche Ware?  Ohne Herkunftsorte: Wer bei Folie 6 aufgepasst hat,
//                  weiß, wohin die Ware in Runde 2 NICHT gehört.
//   nach Folie 9:  Runde 2 – Zu welchem Kontor?      (Folie 8, SB S. 70)
//   nach Folie 13: Runde 3 – Was tust du mit dem Gewinn? (Folie 9–11)
//   danach automatisch: die Pest 1350 (Folie 12–13), dann Schicksale
//
// Historische Aussagen stammen aus „Sprechtext und Hintergrundwissen.md“.
// Geldbeträge und Wahrscheinlichkeiten sind SPIELREGELN, keine Quellenangaben.

export const SPIEL = {
  titel: "Kaufleute, Koggen und die Pest",
  untertitel: "Ein Leben im Fernhandel, Lübeck im 14. Jahrhundert",
  timerSekunden: 20,
  schlussfrage: "Wer profitierte vom Fernhandel – und wer zahlte den Preis?",
};

export const WERTE = [
  { id: "geld", name: "Gulden", emoji: "💰", min: 0 },
];

// Nur ein Charakter: Dann gibt es beim Beitreten keine Auswahl.
export const CHARAKTERE = [
  {
    id: "kaufmann",
    name: "Junger Kaufmann in Lübeck",
    emoji: "⚓",
    text: "Du hast 100 Gulden und eine Idee: Fernhandel.",
    start: { geld: 100 },
    merkmale: {},
  },
];

// ---- Hilfswerte für Runde 2 (Spielregel) -----------------------------------
// Woher kommt die Ware? Bringt man sie dorthin zurück, gibt es sie dort schon.
const HERKUNFT = { pelze: "nowgorod", tuche: "bruegge", stockfisch: "bergen", salz: "lueneburg" };
const WARE = { pelze: "Pelze", tuche: "Tuche", stockfisch: "Stockfisch", salz: "Salz" };
const KONTOR = { bruegge: "Brügge", london: "London", bergen: "Bergen", nowgorod: "Nowgorod" };
const OSTEN = ["nowgorod"], WESTEN = ["bruegge", "london"];

function handel(ziel) {
  return (s) => {
    const ware = s.wahl.ware || "salz";
    const von = HERKUNFT[ware];
    const w = WARE[ware], k = KONTOR[ziel];
    if (von === ziel) {
      return [{ p: 1, effekt: { geld: -40 }, tag: "Ware zurückgebracht",
        text: `${w} nach ${k}? Die gibt es dort selbst. Du verkaufst mit Verlust.` }];
    }
    const lang = (OSTEN.includes(von) && WESTEN.includes(ziel)) || (WESTEN.includes(von) && OSTEN.includes(ziel));
    if (lang) {
      return [
        { p: 0.7, effekt: { geld: 200 }, tag: "Großer Gewinn",
          text: `${w} quer über die Ostsee nach ${k}: Dort sind sie selten und teuer. Großer Gewinn!` },
        { p: 0.3, effekt: { geld: -100 }, tag: "Seeräuber",
          text: `Auf dem langen Weg nach ${k} kapern Seeräuber deine Kogge. Alles weg.` },
      ];
    }
    return [
      { p: 0.9, effekt: { geld: 80 }, tag: "Gewinn",
        text: `Du verkaufst ${w} in ${k}. Ein solider Gewinn.` },
      { p: 0.1, effekt: { geld: -100 }, tag: "Seeräuber",
        text: `Seeräuber kapern deine Kogge auf dem Weg nach ${k}. Alles weg.` },
    ];
  };
}

// -----------------------------------------------------------------------------
// RUNDEN
//   amEnde: true  -> keine Entscheidung, wird erst bei der Auflösung ausgewürfelt
// -----------------------------------------------------------------------------
export const RUNDEN = [
  {
    id: "ware",
    folie: "nach Folie 6 (Waren und Wege)",
    titel: "Welche Ware?",
    frage: "Du kaufst mit deinen 100 Gulden Ware ein. Womit handelst du?",
    standard: "salz",
    optionen: [
      { id: "pelze", text: "Pelze", ausgang: [{ p: 1, text: "Du kaufst Pelze in Nowgorod.", tag: "Pelze" }] },
      { id: "tuche", text: "Tuche", ausgang: [{ p: 1, text: "Du kaufst Tuche in Brügge.", tag: "Tuche" }] },
      { id: "stockfisch", text: "Stockfisch", ausgang: [{ p: 1, text: "Du kaufst Stockfisch in Bergen.", tag: "Stockfisch" }] },
      { id: "salz", text: "Salz", ausgang: [{ p: 1, text: "Du kaufst Salz in Lüneburg.", tag: "Salz" }] },
    ],
  },
  {
    id: "kontor",
    folie: "nach Folie 9 (Kontore, Chronik)",
    titel: "Zu welchem Kontor?",
    frage: "Deine Kogge ist beladen. Zu welchem Kontor der Hanse bringst du die Ware?",
    standard: "bergen",
    optionen: [
      { id: "bruegge", text: "Brügge", ausgang: handel("bruegge") },
      { id: "london", text: "London", ausgang: handel("london") },
      { id: "bergen", text: "Bergen", ausgang: handel("bergen") },
      { id: "nowgorod", text: "Nowgorod", ausgang: handel("nowgorod") },
    ],
  },
  {
    id: "gewinn",
    folie: "nach Folie 13 (vor der Auflösung)",
    titel: "Was tust du mit deinem Geld?",
    frage: "Zurück in Lübeck. Was machst du mit deinem Geld?",
    standard: "getreide",
    optionen: [
      {
        id: "rat", text: "Einen Sitz im Stadtrat anstreben",
        // Folie 10: Stadträte; besitzende Bürger, oft Kaufleute, gewinnen
        ausgang: (s) => s.werte.geld >= 200
          ? [{ p: 1, setzt: { ratsherr: true }, tag: "In den Rat gewählt",
              text: "Du bist reich genug. Der Rat nimmt dich auf – du regierst die Stadt mit." }]
          : [{ p: 1, tag: "Vom Rat abgelehnt",
              text: "Der Rat lacht dich aus. Ohne Vermögen hast du dort nichts zu sagen." }],
      },
      {
        id: "getreide", text: "Getreide einlagern",
        // Folie 9: 1366 teure Zeit, Roggen sehr teuer
        ausgang: [{ p: 1, effekt: { geld: (s) => Math.round(s.werte.geld * 0.5) }, tag: "Getreide verkauft",
          text: "1366 wird Roggen teuer. Du verkaufst dein Getreide mit Gewinn." }],
      },
      {
        id: "fuerst", text: "Einem Fürsten Geld leihen",
        // Folie 11: Herrscher gewannen Macht, Kriege und Gewalt
        ausgang: [
          { p: 0.5, effekt: { geld: (s) => s.werte.geld }, tag: "Fürst zahlt zurück",
            text: "Der Fürst gewinnt seinen Krieg und zahlt dir das Doppelte zurück." },
          { p: 0.5, effekt: { geld: (s) => -s.werte.geld }, tag: "Fürst zahlt nicht",
            text: "Der Fürst braucht das Geld für seinen Krieg. Du siehst es nie wieder." },
        ],
      },
    ],
  },
  {
    id: "pest",
    amEnde: true,
    titel: "1350: Die Pest",
    frage: "Die Pest erreicht Lübeck über die Handelswege.",
    optionen: [
      {
        id: "pest", text: "Pest",
        // Folie 12–13: Die Pest kam über die Handelswege und traf am Ende alle.
        ausgang: [
          { p: 0.4, tot: true, tag: "Gestorben", text: "Die Pest kommt über die Handelswege nach Lübeck. Du stirbst." },
          { p: 0.6, tag: "Überlebt", text: "Die Pest kommt über die Handelswege nach Lübeck. Du überlebst." },
        ],
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// SCHICKSALE. Von oben nach unten: die ERSTE passende Regel gilt.
//   bild: Bild, das der Spieler am Ende sieht (Ordner img/)
// -----------------------------------------------------------------------------
export const SCHICKSALE = [
  { id: "tot_rat", bild: "img/tot_rat.png", wenn: (s) => s.tot && s.merkmale.ratsherr, emoji: "💀👑",
    titel: "Ratsherr – bis die Pest kam", text: "Du hattest Macht und Geld. Die Pest hat nicht danach gefragt." },
  { id: "tot_reich", bild: "img/tot_reich.png", wenn: (s) => s.tot && s.werte.geld >= 200, emoji: "💀💰",
    titel: "Reich, aber an der Pest gestorben", text: "Der Handel hat dich reich gemacht – und dir die Pest gebracht." },
  { id: "tot_arm", bild: "img/tot_arm.png", wenn: (s) => s.tot, emoji: "💀",
    titel: "Arm und an der Pest gestorben", text: "Vom Handel hattest du wenig. Seinen Preis hast du trotzdem gezahlt." },
  { id: "ratsherr", bild: "img/ratsherr.png", wenn: (s) => s.merkmale.ratsherr, emoji: "👑",
    titel: "Ratsherr in Lübeck", text: "Der Fernhandel hat dich reich und mächtig gemacht." },
  { id: "reich", bild: "img/reich.png", wenn: (s) => s.werte.geld >= 250, emoji: "💰",
    titel: "Reicher Fernhändler", text: "Du gehörst zu den besitzenden Bürgern der Stadt." },
  { id: "klein", bild: "img/klein.png", wenn: (s) => s.werte.geld >= 100, emoji: "⚓",
    titel: "Kleiner Kaufmann", text: "Kein Vermögen, aber du kommst über die Runden." },
  { id: "ruiniert", bild: "img/ruiniert.png", wenn: () => true, emoji: "🧺",
    titel: "Ruiniert", text: "Der Handel war ein Glücksspiel. Jetzt schleppst du als Tagelöhner Fässer am Hafen." },
];
