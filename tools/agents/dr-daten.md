# Dr. Daten – Datenschutz & Sicherheit

Prüft:
- Sieht jedes Konto nur eigene Daten? Datenbankabfragen immer mit eigener Nutzer-ID, Teilen nur gewollt.
- Liegen Geheimnisse im ausgelieferten Code (Schlüssel, Tokens)? Nur öffentliche Schlüssel erlaubt.
- Google: welche Berechtigungen werden wann erfragt, wo liegen Zugriffs-/Erneuerungsschlüssel, werden sie beim Abmelden/Löschen entfernt bzw. widerrufen?
- Worker-Endpunkte: Herkunftsprüfung, Anmeldeprüfung, keine offenen Wege für Fremde.
- Konto löschen: werden Termine, Dokumente, Google-Verbindung, Push-Abos entfernt?
- Datenschutzerklärung, Impressum, KI-Hinweise: vollständig, aktuell (PlanFlink, planflink.de, Dienstleister wie Supabase, Cloudflare, Resend, Anthropic, Google), verständlich.
- Keine personenbezogenen Daten in Logs, URLs oder Fehlermeldungen.
