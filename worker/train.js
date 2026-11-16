// Mein Kalender – Zug-Wächter: Verspätung, Gleiswechsel, Ausfall
// Datenquelle: offizielle DB Timetables API (DB API Marketplace, kostenlos) – Secrets DB_CLIENT_ID und DB_API_KEY
const TT = "https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1";
let LASTERR = "";
const norm = s => String(s || "").toUpperCase().replace(/[\s\-]/g, "");
const attrs = tag => Object.fromEntries([...String(tag).matchAll(/([\w-]+)=(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1], (m[2] ?? m[3] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'")]));
const el = (xml, name) => { const m = String(xml).match(new RegExp(`<${name}\\b([^>]*?)/?>`)); return m ? attrs(m[1]) : null; };
const stops = xml => [...String(xml).matchAll(/<s\s([^>]*)>([\s\S]*?)<\/s>/g)].map(m => ({ id: attrs(m[1]).id, tl: el(m[2], "tl") || {}, ar: el(m[2], "ar"), dp: el(m[2], "dp") }));
async function tt(env, path) {
  const r = await fetch(TT + path, { headers: { "DB-Client-Id": env.DB_CLIENT_ID, "DB-Api-Key": env.DB_API_KEY, Accept: "application/xml" } }).catch(() => null);
  if (r && !r.ok) LASTERR = `HTTP ${r.status}`; else if (!r) LASTERR = "Netzwerk";
  return r && r.ok ? r.text() : null;
}
// Ortszeit (Europe/Berlin) ↔ Date
const offMin = (d, tz) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d).map(x => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(d.getTime() / 60e3) * 60e3) / 60e3; };
const fromTT = (s, tz) => { if (!s || s.length < 10) return null; const u = Date.UTC(2000 + +s.slice(0, 2), +s.slice(2, 4) - 1, +s.slice(4, 6), +s.slice(6, 8), +s.slice(8, 10)); return new Date(u - offMin(new Date(u), tz) * 60e3); };
const local = (d, tz) => Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit" }).formatToParts(d).map(x => [x.type, x.value]));
const matches = (s, want) => { const c = s.tl.c || "", n = s.tl.n || "", l = (s.ar || s.dp || {}).l || ""; return norm(c + n) === want || (l && (norm(c + l) === want || norm(l) === want)); };

// w: { id, train: "IC 1934", st: "Magdeburg Hbf", at: ISO (geplant am Bahnhof), title }
export async function trainCheck(env, w, prev, now, tz = "Europe/Berlin", dbg) {
  if (!env.DB_CLIENT_ID || !env.DB_API_KEY) { dbg?.push("keine DB-Schlüssel"); return { state: prev, msgs: [] }; }
  let s = { ...prev };
  const t0 = new Date(w.at), want = norm(w.train);
  // geplante Fahrt einmal suchen – an allen passenden Bahnhöfen (z. B. „Berlin Hbf“ und „Berlin Hbf (tief)“), Stunde der Terminzeit ±1
  if (!s.sid) {
    // Bahnhof suchen – auch Varianten wie „Berlin Hbf (tief)“, dort liegen bei großen Bahnhöfen oft die Fahrten
    let x0 = null, found = [];
    for (const q of [w.st, `${w.st} (tief)`, `${w.st}*`]) { const x = await tt(env, `/station/${encodeURIComponent(q)}`); if (x) { x0 = x0 || x;
      for (const m of x.matchAll(/<station\b([^>]*?)\/?>/g)) { const a = attrs(m[1]); if (a.eva && !found.some(f => f.eva === a.eva)) found.push(a); } } }
    found = found.slice(0, 4);
    // Große Bahnhöfe haben weitere Nummern im Feld „meta“ (z. B. Berlin Hbf oben/tief/S-Bahn) – die Fahrten liegen oft dort
    const sts = []; for (const x of found) for (const e of [x.eva, ...String(x.meta || "").split("|").filter(Boolean)]) if (!sts.some(y => y.eva === e)) sts.push({ eva: e, name: e === x.eva ? x.name : `${x.name} [${e}]` });
    dbg?.push(`Bahnhof „${w.st}“: ${found.map(x => `${x.name} (${x.eva}${x.meta ? ", weitere: " + x.meta.replace(/\|/g, ", ") : ""})`).join("; ") || (x0 === null ? `Abfrage fehlgeschlagen (${LASTERR})` : "nichts gefunden")}`);
    if (!sts.length) return { state: { ...s, err: "station" }, msgs: [] };
    let best = null;
    for (const st of sts.slice(0, 6)) for (const dh of [0, -1, 1]) { const L = local(new Date(t0.getTime() + dh * 3600e3), tz), x = await tt(env, `/plan/${st.eva}/${L.year}${L.month}${L.day}/${L.hour}`);
      if (!x) { dbg?.push(`Plan ${st.name} ${L.hour} Uhr: keine Antwort (${LASTERR})`); continue; }
      const all = stops(x), hit = all.filter(p => matches(p, want)); dbg?.push(`Plan ${st.name} ${L.hour} Uhr (/plan/${st.eva}/${L.year}${L.month}${L.day}/${L.hour}): ${all.length} Fahrten, ${hit.length}× ${w.train}${all.length ? "" : ` – Antwort: ${x.replace(/\s+/g, " ").slice(0, 160)}`}`);
      if (all.length && !hit.length && dh === 0) dbg?.push(`Beispiele: ${all.slice(0, 6).map(p => `${p.tl.c || "?"} ${p.tl.n || ""}${(p.ar || p.dp || {}).l ? " (Linie " + (p.ar || p.dp).l + ")" : ""}`).join(", ")}`);
      for (const p of hit) for (const [k, e] of [["arr", p.ar], ["dep", p.dp]]) { if (!e?.pt) continue; const pt = fromTT(e.pt, tz), diff = Math.abs(pt - t0) + (k === "dep" ? 60e3 : 0);
        if (!best || diff < best.diff) best = { diff, sid: p.id, kind: k, pt: pt.toISOString(), pp: e.pp || "", eva: st.eva, sn: st.name }; }
      if (best && best.diff < 20 * 60e3) break; }
    if (!best && dbg) {   // Gegenprobe: Frankfurt Hbf jetzt, und Echtzeit-Liste des ersten Bahnhofs
      const L = local(new Date(), tz), xf = await tt(env, `/plan/8000105/${L.year}${L.month}${L.day}/${L.hour}`); dbg.push(`Gegenprobe Frankfurt Hbf ${L.hour} Uhr: ${xf ? stops(xf).length + " Fahrten" : "keine Antwort (" + LASTERR + ")"}`);
      const xc = await tt(env, `/fchg/${sts[0].eva}`); const sc = xc ? stops(xc) : []; dbg.push(`Echtzeit-Liste ${sts[0].name}: ${xc ? sc.length + " Einträge" : "keine Antwort (" + LASTERR + ")"}${sc.length ? " – z. B. " + xc.slice(xc.indexOf("<s "), xc.indexOf("<s ") + 220).replace(/\s+/g, " ") : ""}`);
    }
    if (!best || best.diff > 3 * 3600e3) { dbg?.push("kein passender Zug im Fahrplan"); return { state: { ...s, miss: (s.miss || 0) + 1 }, msgs: [] }; }
    Object.assign(s, { sid: best.sid, kind: best.kind, pt: best.pt, pp: best.pp, eva: best.eva, sn: best.sn });
    dbg?.push(`gefunden: ${best.kind === "arr" ? "Ankunft" : "Abfahrt"} ${best.sn} geplant ${best.pt} Gleis ${best.pp || "?"}`);
  }
  // Echtzeit-Änderungen am Bahnhof
  const x = await tt(env, `/fchg/${s.eva}`); if (!x) { dbg?.push("Echtzeit: keine Antwort"); return { state: s, msgs: [] }; }
  const ch = stops(x).find(p => p.id === s.sid), e = ch ? (s.kind === "arr" ? ch.ar : ch.dp) : null;
  dbg?.push(`Echtzeit: ${e ? `neu ${e.ct || "–"} Gleis ${e.cp || "–"}${e.cs === "c" ? " AUSFALL" : ""}` : "keine Änderung gemeldet (= planmäßig)"}`);
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
