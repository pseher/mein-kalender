# Mein Kalender – Einrichtung der eigenen App (Phase 0)

Ziel: App unter `https://meinkalender.pages.dev/app/`, Daten in Supabase (EU), KI über einen Cloudflare Worker,
Google Kalender direkt aus dem Browser. Geheime Schlüssel kommen **nie** in dieses Repo und nie in den Chat.

## A · Cloudflare Pages (ca. 5 Min.)
1. dash.cloudflare.com → **Workers & Pages** → **Erstellen** → Reiter **Pages** → **Mit Git verbinden**
2. Repo `pseher/mein-kalender` wählen
3. Framework: **Keins** · Build-Befehl: *leer* · Ausgabeverzeichnis: `/`
4. Projektname: `meinkalender` → Adresse wird `https://meinkalender.pages.dev`
   (Ab jetzt baut Cloudflare bei jedem Push automatisch – kein „Manual Deploy“ mehr.)

## B · Supabase (ca. 10 Min.)
1. supabase.com → **New project** · Name `mein-kalender` · Region **Central EU (Frankfurt)** · DB-Passwort sicher ablegen
2. **SQL Editor** → Inhalt von `supabase/schema.sql` einfügen → **Run**
3. **Project Settings → API**: notieren
   - Project URL (öffentlich)
   - `anon` key (öffentlich)
   - `service_role` key (**geheim** – nur für den Worker)
4. **Authentication → URL Configuration**: Site URL `https://meinkalender.pages.dev/app/`,
   Redirect URLs zusätzlich `https://meinkalender.pages.dev/app/*`

## C · Google Cloud (ca. 15 Min.)
1. console.cloud.google.com → neues Projekt **Mein Kalender**
2. **APIs & Dienste → Bibliothek** → „Google Calendar API“ → **Aktivieren**
3. **OAuth-Zustimmungsbildschirm**: Typ **Extern** · App-Name „Mein Kalender“ · Support-Mail `kontakt@herdzeit.de`
   · Startseite `https://meinkalender.pages.dev` · Datenschutz `https://meinkalender.pages.dev/datenschutz.html`
   · Status **Testen** · **Testnutzer**: deine eigenen Google-Adressen (bis 100 möglich)
4. **Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID** → Typ **Webanwendung**
   - Autorisierte JavaScript-Quellen: `https://meinkalender.pages.dev`
   - Autorisierte Weiterleitungs-URIs: `https://<dein-projekt>.supabase.co/auth/v1/callback`
5. Client-ID (öffentlich) und Clientschlüssel (**geheim**) notieren
6. In Supabase: **Authentication → Providers → Google** → aktivieren, Client-ID + Clientschlüssel eintragen

## D · Anthropic (ca. 5 Min.)
1. console.anthropic.com → **API Keys** → neuen Schlüssel anlegen (**geheim**)
2. **Billing**: kleines Guthaben (z. B. 10 $) und ein **monatliches Limit** setzen

## E · KI-Worker (ca. 10 Min.)
1. Cloudflare → **Workers & Pages** → **Erstellen** → **Worker** → Name `mein-kalender-ki` → **Deploy**
2. **Code bearbeiten** → Inhalt von `worker/ai.js` einfügen → **Deploy**
3. **Einstellungen → Variablen und Geheimnisse**:
   - Variablen (Text): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS` = `https://meinkalender.pages.dev`,
     `MODEL_QUICK` = `claude-haiku-4-5-20251001`, `MODEL_DEFAULT` = `claude-sonnet-5-5`,
     `DAILY_LIMIT` = `40`, `IMAGE_DAILY_LIMIT` = `10`
   - Geheimnisse (Secret): `ANTHROPIC_KEY`, `SUPABASE_SERVICE_KEY`
4. Worker-Adresse notieren, z. B. `https://mein-kalender-ki.<name>.workers.dev`

## Was Claude danach braucht (nur öffentliche Werte)
- Pages-Adresse · Supabase Project URL · Supabase `anon` key · Google Client-ID · Worker-Adresse

**Nicht** schicken: `service_role` key, Google-Clientschlüssel, Anthropic-Schlüssel, DB-Passwort.
