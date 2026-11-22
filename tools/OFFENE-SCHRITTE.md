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

### Begründung (englisch, Stand 22.11.2026)
**calendar.events:** PlanFlink is a family calendar assistant. After the user explicitly connects Google Calendar (a separate step after sign-in), PlanFlink reads events from the calendars the user selects and shows them alongside PlanFlink entries. When the user creates an entry (typed, from a pasted message or a ticket), PlanFlink inserts it into the chosen Google calendar. Users can edit, move (tap another day) and delete Google events directly from the event's detail view. calendar.events.readonly is insufficient because writing is a core feature; calendar.events.owned would hide events in shared family calendars. Event data is processed in the user's browser. It is stored in PlanFlink's database (EU) only for features the user invokes: when the user edits and saves an event, attaches a document or checklist, imports birthdays/trips during setup, or enables reminders (title/time/place of upcoming events for push notifications). It is sent transiently to our AI provider (Anthropic) only when the user invokes an AI feature. It is never sold, used for advertising or for model training, and it is deleted with the entry or the account.

**calendar.calendarlist.readonly:** Used solely to call calendarList.list so the user can pick which of their calendars to display and which one to write to. No event data is read with this scope.

### Drehbuch Demovideo (ca. 2:40, Google-Seiten auf Englisch, nur Testtermine)
1. 0:00 planflink.de, zur Kachel „Mit Google Kalender“ scrollen, Datenschutz §6 öffnen.
2. 0:20 planflink.de/app/ → „Mit Google anmelden“.
3. 0:30 Adresszeile mit `client_id=…apps.googleusercontent.com` zeigen; Zustimmungsseite: „PlanFlink“, nur Name/E-Mail.
4. 0:50 ☰ → **Google Kalender** → **Mit Google verbinden** → Hinweis „Google Kalender verbinden“ → **Weiter zu Google** (neues Konto alternativ: Einrichtungsschritt „Ja, Google verbinden“).
5. 1:00 Adresszeile mit Client-ID; Zustimmung mit beiden Kalender-Berechtigungen, Häkchen setzen (Warnseite „nicht überprüft“ → Erweitert ist im Video ok).
6. 1:20 ☰ → Google Kalender → Abschnitt **Kalender**: Häkchen zeigen (Einblendung: calendar.calendarlist.readonly).
7. 1:35 Monatsansicht mit Google-Terminen → Termin antippen → Detail „Google · Mein Kalender“ → **⋯ Weitere Aktionen** → **↗ In Google öffnen** (Einblendung: calendar.events, lesen).
8. 1:50 **+ Eintragen** → Freitext „Zahnarzt Fr 10 Uhr“ → Zielkalender prüfen → speichern → in calendar.google.com zeigen.
9. 2:05 Google-Termin antippen → **✏️ Ändern** → Titel ändern → **Speichern** → in Google prüfen. Dann **📅 Verschieben** → anderen Tag antippen → „Verschoben auf …“ → in Google prüfen. Dann **⋯ Weitere Aktionen → 🗑 Löschen** → „In Google löschen?“ bestätigen → in Google prüfen.
10. 2:30 ☰ → Google Kalender → **Google-Verbindung trennen** → **Trennen**; myaccount.google.com/permissions zeigen.
Hochladen auf YouTube als „Nicht gelistet“. Erst einreichen, wenn Datenschutzerklärung (Stand 22.11.2026) online ist.

## Play Store (später)
Google-Play-Console-Konto (25 $), PWA als Trusted Web Activity verpacken (z. B. PWABuilder), Digital-Asset-Links-Datei auf planflink.de, geschlossener Test mit 12 Testern über 14 Tage, Store-Eintrag (Symbol, Screenshots, Beschreibung, Datenschutzangaben).
