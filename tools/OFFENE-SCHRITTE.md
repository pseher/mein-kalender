# PlanFlink – offene Schritte (Stand 21.11.2026)

## Von Peter zu erledigen (Google Cloud Console, Projekt „PlanFlink“)
1. **Datenzugriff:** `calendar.readonly` entfernen, `calendar.calendarlist.readonly` hinzufügen; `calendar.events` bleibt. Speichern.
2. **Clients → PlanFlink Web:** alte Supabase-Weiterleitungsadresse entfernen; nur `https://planflink.de/app/` behalten.

## Nächste Runde (Vorschlag)
1. **Datenbank-Absicherung beim Teilen** (Dr. Daten): Tabelle `outbox` ist für alle Angemeldeten lesbar (Metadaten: wer teilt mit wem, wann aktiv). Lösung: offene Leseregel entfernen, stattdessen Datenbankfunktion (security definer), die nur Zeilen zu einer angegebenen Link-ID liefert. Braucht eine SQL-Änderung, die Peter einmal in Supabase ausführt.
2. **Google-Übertragung nachholen** (Max): Scheitert das Eintragen in Google (z. B. Fehler 500), wird es nie erneut versucht. Lösung: beim nächsten Abgleich Einträge mit Kalender, aber ohne Google-ID, nachtragen oder Knopf „Jetzt in Google eintragen“; Meldung bei Ablehnung (4xx) klarer.
3. **Gestaltung für Einsteiger** (Erika): Einrichtung mit „Schritt X von Y“ und Zurück-Knopf; Tippflächen mind. 44 px (z. B. „+ Aufgabe dazu“, „Anpassen“, „Überspringen“, ✕, Farbkreise mit Beschriftung); bei „Sehr groß“ nichts abschneiden (Countdown-Karten umbrechen, kleine Beschriftungen mind. 12 px); Abschlussseite der Einrichtung schlanker, Installationshinweis erst nach dem ersten Termin; Feld „Dein Vorname“ eigener Schritt oder Überschrift „Über dich“.
Danach: Erika, Max und Dr. Daten prüfen nach.

## Kleineres
- Rückflug am letzten Reisetag wird nicht zur Reise gebündelt (Lena).
- Familien-Code länger (≥10 Zeichen) und Versuche begrenzen (Dr. Daten, worker/billing.js).
- Content-Security-Policy in `_headers` (Dr. Daten).
- Querformat-Formular: Speichern-Leiste verdeckt Art-Knöpfe (Max).
- Bis-Datum folgt Von-Datum nicht immer (Max).
- Abholen: Zug-/Flugnummer auch in die Google-Beschreibung (Lena).
- Test `flow.js` auf heutiges Datum umstellen.

## Google-Prüfung (Etappe 2)
1. **Search Console:** planflink.de per DNS-TXT-Eintrag (Cloudflare) bestätigen.
2. **Branding:** Logo 120×120 (PlanFlink-Logo-120.png), Startseite https://planflink.de/, Datenschutz https://planflink.de/datenschutz.html, Domain planflink.de → „Verify branding“ → „Publish branding“.
3. **Data access:** openid, email, profile, calendar.events, calendar.calendarlist.readonly – sonst nichts.
4. **Verification Center:** Begründung je Berechtigung (unten) + YouTube-Link (nicht gelistet) zum Demovideo → „Submit for verification“. Dauer bis ca. 10 Tage, Rückfragen per Mail beantworten.
5. Nach Freigabe in `src/app.js` `G_UNVERIFIED = false` setzen (Hinweis „nicht überprüft“ entfällt).

### Begründung (englisch)
**calendar.events:** PlanFlink is a family calendar assistant. After the user explicitly connects Google Calendar (separate step after sign-in), PlanFlink reads events from the calendars the user selects and shows them alongside PlanFlink entries in month/week/list views. When the user creates an entry (typed, from a pasted message or a ticket), PlanFlink inserts it into the chosen Google calendar, and lets the user edit or delete Google events from within the app. calendar.events.readonly is insufficient because writing is a core feature; calendar.events.owned would hide events in shared family calendars the user subscribes to. Event data stays in Google and the user's browser; it is only sent to our AI provider transiently when the user invokes the assistant, never sold, used for ads or model training.

**calendar.calendarlist.readonly:** Used solely to call calendarList.list so the user can pick which of their calendars to display and which one to write to. No event data is read with this scope.

### Drehbuch Demovideo (ca. 2:30, Google-Seiten auf Englisch, nur Testtermine)
1. 0:00 Startseite planflink.de, zur Google-Kachel scrollen, Datenschutz §6 öffnen.
2. 0:20 planflink.de/app/ → „Mit Google anmelden“.
3. 0:30 Im Google-Fenster Adresszeile bis `client_id=…apps.googleusercontent.com` zeigen; Sprache English; Zustimmungsseite: Name „PlanFlink“, nur Name/E-Mail.
4. 0:50 ☰ → Google Kalender verbinden: Hinweis-Sheet → „Weiter zu Google“.
5. 1:00 Wieder Adresszeile mit Client-ID; Zustimmungsseite mit beiden Kalender-Berechtigungen, Häkchen setzen.
6. 1:20 Kalenderauswahl zeigen (Einblendung: calendarList → calendar.calendarlist.readonly).
7. 1:35 Google-Termine in der Monatsansicht (Einblendung: calendar.events).
8. 1:50 Per Assistent „Zahnarzt Fr 10 Uhr“ eintragen, Google-Kalender wählen, in calendar.google.com zeigen.
9. 2:10 Termin in PlanFlink ändern und löschen, jeweils in Google gegenprüfen.
10. 2:25 „Google-Verbindung trennen“ zeigen und dass PlanFlink unter myaccount.google.com/permissions verschwunden ist.
Hochladen auf YouTube als „Nicht gelistet“.

## Play Store (später)
Google-Play-Console-Konto (25 $), PWA als Trusted Web Activity verpacken (z. B. PWABuilder), Digital-Asset-Links-Datei auf planflink.de, geschlossener Test mit 12 Testern über 14 Tage, Store-Eintrag (Symbol, Screenshots, Beschreibung, Datenschutzangaben).
