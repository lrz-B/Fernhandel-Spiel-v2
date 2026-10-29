# Kaufleute, Koggen und die Pest

Handyspiel zum Referat „Fernhandel im Spätmittelalter“. Läuft im Browser, ohne App.

**Ablauf:** Beitreten (nur Name) → drei Entscheidungen → Auflösung am Ende.
1. nach Folie 6: Welche Ware? (Pelze, Tuche, Stockfisch, Salz)
2. nach Folie 9: Zu welchem Kontor? (Brügge, London, Bergen, Nowgorod)
3. nach Folie 13: Was tust du mit deinem Geld? (Stadtrat, Getreide, Fürst)
4. Auflösung: Ergebnisse aller Entscheidungen, dann trifft die Pest zufällig, dann Schicksal.

**Steuerung am Beamer** (Knopf, Pfeil rechts, Leertaste, Enter oder Clicker), kein Timer:
Entscheidung starten → Entscheidung beenden → … → **Lösung aufdecken** (Verteilung der
Schicksale) → **Rangliste zeigen** (Top 10 nach Geld). Beim Aufdecken rechnet der Beamer
alle Ergebnisse aus, auch für Handys, die gerade gesperrt sind.

## Demo

```
python start.py
```

Öffnet `http://localhost:8766/demo.html`: Beamer, vier Handys, 20 Bots.
Oben gibt es einen Link für einen eigenen Spieler-Tab (im selben Browser!).

| Datei | Zweck |
|---|---|
| `index.html` | Seite für die Spieler (Handy) |
| `host.html` | Spielleitung für den Beamer: QR-Code, Spielerzahl, Timer, Auflösung, Schicksale. Weiter mit Knopf, **Pfeil rechts**, Leertaste, Enter oder Clicker |
| `js/content.js` | **Alle Inhalte**: Werte, Charaktere, Runden, Quiz, Schicksale |
| `demo.html`, `js/demo.js` | nur Demo mit Bots, für das echte Spiel unnötig |
| `js/config.js` | Firebase-Zugang (leer = Testmodus) |
| `js/engine.js`, `host.js`, `player.js`, `backend.js` | Programm, muss für Inhalte nicht angefasst werden |

## Lokal starten (Testmodus)

Solange in `js/config.js` `FIREBASE_CONFIG = null` steht, läuft der Testmodus:
Nur Browser-Tabs auf demselben Rechner sind verbunden.

```
python start.py
```

1. `http://localhost:8766/host.html` öffnen (zeigt Spielcode, z. B. `ABCD`)
2. Weitere Tabs: `http://localhost:8766/index.html?code=ABCD&neu`
   (`&neu` = jeder Tab ist ein eigener Spieler)
3. In den Tabs beitreten, im Host-Tab mit Pfeil rechts weiterschalten.

## Firebase einrichten (für echte Handys)

1. https://console.firebase.google.com → **Projekt hinzufügen**, Analytics aus
2. **Build → Realtime Database → Datenbank erstellen**, Standort `europe-west1`, gesperrter Modus
3. Reiter **Regeln** ersetzen und veröffentlichen:

```json
{
  "rules": {
    "spiele": {
      "$code": {
        ".read": true,
        "status": { ".write": true },
        "spieler": { "$id": { ".write": true } }
      }
    }
  }
}
```

4. Zahnrad → Projekteinstellungen → **Web-App hinzufügen** (`</>`), den
   `firebaseConfig`-Block in `js/config.js` als `FIREBASE_CONFIG` eintragen
   (muss `databaseURL` enthalten).
5. Online stellen, z. B. mit GitHub Pages (Repository öffentlich, Settings → Pages → main).
   Handys brauchen eine https-Adresse; `localhost` geht nur am eigenen Rechner.
6. Vorher **im Klassenraum mit echten Handys testen** (Schul-WLAN kann Seiten blockieren;
   mobile Daten als Ausweichweg).

Hinweis: Die Firebase-Konfiguration ist kein Geheimnis. Wer den Spielcode kennt,
kann mitschreiben – für ein Klassenspiel ausreichend.

## Inhalte eintragen

Alles in `js/content.js`. Kurz:

- **WERTE**: was Spieler haben (z. B. Gulden, Ansehen)
- **CHARAKTERE**: Name, Text, Startwerte (`start: { geld: 300 }`), Merkmale
- **RUNDEN**: eine pro Folie. Optionen mit `nur` (nur bestimmte Charaktere),
  `kosten`, zufälligen `ausgang`-Listen (`p` = Wahrscheinlichkeit) und `effekt`.
  `typ: "quiz"` für eine Quizrunde mit Bonus, `vorher` für Sonderfälle (z. B. Hunger),
  `automatisch: true` für ein Ereignis ohne Wahl, `aufloesung` = Satz auf dem Beamer.
- **SCHICKSALE**: Regeln von oben nach unten, die erste passende gilt.

Nach jeder Änderung den Testmodus einmal komplett durchspielen.

## Checkliste vor dem Referat (05.11.)

- [ ] `js/config.js` enthält die Firebase-Daten (oben steht dann nicht mehr „Testmodus“)
- [ ] Spiel ist online: `https://<benutzername>.github.io/<repo>/host.html` öffnet sich
- [ ] Probe im Klassenraum mit 3–4 Handys: QR-Code scannen, beitreten, eine Runde spielen
- [ ] Wenn das Schul-WLAN blockt: Handys mit mobilen Daten testen
- [ ] Am Referatstag `host.html` vor Beginn öffnen, Folie 2 zeigen, QR-Code bleibt stehen

Schutz eingebaut: Kommt keine Verbindung zustande, zeigt das Handy nach 15 Sekunden
„Keine Verbindung“ statt endlos zu laden. Reißt sie ab, erscheint oben ein roter Hinweis,
die Seite verbindet sich von selbst neu. Der QR-Code kommt aus `js/vendor/` und braucht keinen fremden Server.
