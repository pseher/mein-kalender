-- Mein Kalender – Datenbank (Supabase, Postgres)
-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen.
-- Grundidee: ein einfacher Dokumentspeicher wie bisher im Artefakt.
-- Jede Zeile gehört genau einem Nutzer; Row-Level-Security sorgt dafür,
-- dass niemand fremde Zeilen lesen oder ändern kann.

-- 1) Private Daten jedes Nutzers (Termine, Aufgaben, Einstellungen, Dateien …)
create table if not exists public.docs (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  coll       text        not null,           -- z. B. 'events', 'tasks', 'prefs', 'files', 'docs'
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, coll, id)
);
alter table public.docs enable row level security;
create policy "docs: eigene lesen"   on public.docs for select using (user_id = auth.uid());
create policy "docs: eigene anlegen" on public.docs for insert with check (user_id = auth.uid());
create policy "docs: eigene ändern"  on public.docs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "docs: eigene löschen" on public.docs for delete using (user_id = auth.uid());

-- 2) Geteilte Termine: Ablage pro Absender, Inhalt Ende-zu-Ende verschlüsselt.
--    Alle Angemeldeten dürfen lesen (sie können nur entschlüsseln, wofür sie den Code haben),
--    schreiben darf nur der Absender selbst.
create table if not exists public.outbox (
  owner      uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  coll       text        not null,           -- '' (Liste der Links), 'x' (Namen), 'ev' (Termine)
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (owner, coll, id)
);
alter table public.outbox enable row level security;
create policy "outbox: Angemeldete lesen" on public.outbox for select to authenticated using (true);
create policy "outbox: eigene anlegen"    on public.outbox for insert with check (owner = auth.uid());
create policy "outbox: eigene ändern"     on public.outbox for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "outbox: eigene löschen"    on public.outbox for delete using (owner = auth.uid());

-- 3) KI-Nutzung pro Nutzer und Tag (schreibt nur der Worker mit dem Service-Schlüssel)
create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null default current_date,
  task     text not null,
  calls    int  not null default 0,
  tok_in   int  not null default 0,
  tok_out  int  not null default 0,
  primary key (user_id, day, task)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage: eigene lesen" on public.ai_usage for select using (user_id = auth.uid());

-- Zähler atomar erhöhen (vom Worker aufgerufen)
create or replace function public.ai_count(p_user uuid, p_task text, p_in int, p_out int)
returns void language sql security definer set search_path = public as $$
  insert into ai_usage (user_id, day, task, calls, tok_in, tok_out)
  values (p_user, current_date, p_task, 1, p_in, p_out)
  on conflict (user_id, day, task) do update
    set calls = ai_usage.calls + 1, tok_in = ai_usage.tok_in + excluded.tok_in, tok_out = ai_usage.tok_out + excluded.tok_out;
$$;
revoke all on function public.ai_count(uuid, text, int, int) from public, anon, authenticated;

-- Live-Aktualisierung (wie onSnapshot im Artefakt)
alter publication supabase_realtime add table public.docs, public.outbox;
