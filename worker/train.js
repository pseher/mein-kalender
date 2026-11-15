// Mein Kalender – Zug-Wächter: Verspätung, Gleiswechsel, Ausfall
// Datenquelle: offizielle DB Timetables API (DB API Marketplace, kostenlos) – Secrets DB_CLIENT_ID und DB_API_KEY
const TT = "https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1";
const norm = s => String(s || "").toUpperCase().replace(/[\s\-]/g, "");
const attrs = tag => Object.fromEntries([...String(tag).matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2].replace(/&amp;/g, "&").replace(/&quot;/g, '"')]));
const el = (xml, name) => { const m = String(xml).match(new RegExp(`<${name}\\b([^>]*?)/?>`)); return m ? attrs(m[1]) : null; };
const stops = xml => [...String(xml).matchAll(/<s\b([^>]*)>([\s\S]*?)<\/s>/g)].map(m => ({ id: attrs(m[1]).id, tl: el(m[2], "tl") || {}, ar: el(m[2], "ar"), dp: el(m[2], "dp") }));
async function tt(env, path) {
  const r = await fetch(TT + path, { headers: { "DB-Client-Id": env.DB_CLIENT_ID, "DB-Api-Key": env.DB_API_KEY, Accept: "application/xml" } }).catch(() => null);
  return r && r.ok ? r.text() : null;
}
// Ortszeit (Europe/Berlin) ↔ Date
const offMin = (d, tz) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d).map(x => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(d.getTime() / 60e3) * 60e3) / 60e3; };
const fromTT = (s, tz) => { if (!s || s.length < 10) return null; const u = Date.UTC(2000 + +s.slice(0, 2), +s.slice(2, 4) - 1, +s.slice(4, 6), +s.slice(6, 8), +s.slice(8, 10)); return new Date(u - offMin(new Date(u), tz) * 60e3); };
const local = (d, tz) => Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit" }).formatToParts(d).map(x => [x.type, x.value]));
const matches = (s, want) => { const c = s.tl.c || "", n = s.tl.n || "", l = (s.ar || s.dp || {}).l || ""; return norm(c + n) === want || (l && (norm(c + l) === want || norm(l) === want)); };

// w: { id, train: "IC 1934", st: "Magdeburg Hbf", at: ISO (geplant am Bahnhof), title }
export async function trainCheck(env, w, prev, now, tz = "Europe/Berlin") {
  if (!env.DB_CLIENT_ID || !env.DB_API_KEY) return { state: prev, msgs: [] };
  let s = { ...prev };
  if (!s.eva) { const x = await tt(env, `/station/${encodeURIComponent(w.st)}`); const st = x && el(x, "station"); if (!st?.eva) return { state: { ...s, err: "station" }, msgs: [] }; s.eva = st.eva; s.sn = st.name; }
  const t0 = new Date(w.at), want = norm(w.train);
  // geplante Fahrt einmal suchen (Stunde der Terminzeit und die davor/danach)
  if (!s.sid) {
    let best = null;
    for (const dh of [0, -1, 1]) { const L = local(new Date(t0.getTime() + dh * 3600e3), tz), x = await tt(env, `/plan/${s.eva}/${L.year}${L.month}${L.day}/${L.hour}`); if (!x) continue;
      for (const p of stops(x)) if (matches(p, want)) for (const [k, e] of [["arr", p.ar], ["dep", p.dp]]) { if (!e?.pt) continue; const pt = fromTT(e.pt, tz), diff = Math.abs(pt - t0) + (k === "dep" ? 60e3 : 0);
        if (!best || diff < best.diff) best = { diff, sid: p.id, kind: k, pt: pt.toISOString(), pp: e.pp || "" }; }
      if (best && best.diff < 20 * 60e3) break; }
    if (!best || best.diff > 3 * 3600e3) return { state: { ...s, miss: (s.miss || 0) + 1 }, msgs: [] };
    Object.assign(s, { sid: best.sid, kind: best.kind, pt: best.pt, pp: best.pp });
  }
  // Echtzeit-Änderungen am Bahnhof
  const x = await tt(env, `/fchg/${s.eva}`); if (!x) return { state: s, msgs: [] };
  const ch = stops(x).find(p => p.id === s.sid), e = ch ? (s.kind === "arr" ? ch.ar : ch.dp) : null;
  const plan = new Date(s.pt), real = e?.ct ? fromTT(e.ct, tz) : plan, d = Math.max(0, Math.round((real - plan) / 60e3));
  const pl = e?.cp || s.pp || "", cancelled = e?.cs === "c";
  const hm = t => t.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const what = `${s.kind === "arr" ? "Ankunft" : "Abfahrt"} ${(s.sn || w.st).trim()}`, msgs = [], tag = "zug-" + w.id;
  const m = (title, body, urgent) => msgs.push({ title, body, tag, url: "/app/", urgent });
  const pd = prev.seen ? (prev.d || 0) : 0, ns = { ...s, d, pl, c: cancelled, seen: true };
  if (cancelled) { if (!prev.c) m(`⚠️ ${w.train} fällt aus`, `${what}, geplant ${hm(plan)}${w.title ? ` – „${w.title}“` : ""} – bitte Alternativen prüfen`, true); return { state: ns, msgs }; }
  if (d >= 5 && (!prev.seen || pd < 5 || Math.abs(d - pd) >= 5)) m(`🚆 ${w.train}: +${d} Min.`, `${what} jetzt ca. ${hm(real)} statt ${hm(plan)}${pl ? ` · Gleis ${pl}` : ""}`, true);
  else if (d < 3 && prev.seen && pd >= 5) m(`🚆 ${w.train} wieder fast pünktlich`, `${what} ca. ${hm(real)}${pl ? ` · Gleis ${pl}` : ""}`);
  if (pl && ((prev.pl && pl !== prev.pl) || (!prev.plWarn && s.pp && pl !== s.pp))) { m(`🔀 Gleiswechsel: ${w.train}`, `${what} jetzt Gleis ${pl}${s.pp && s.pp !== pl ? ` (statt ${s.pp})` : ""}`, true); ns.plWarn = true; }
  if (!prev.ok && now >= plan.getTime() - 25 * 60e3 && d < 5 && !msgs.length) { m(`✅ ${w.train} pünktlich`, `${what} ${hm(real)}${pl ? ` · Gleis ${pl}` : ""}`); ns.ok = true; }
  if (msgs.length) ns.ok = true;
  return { state: ns, msgs };
}
