// Mein Kalender – Zug-Wächter: Verspätung, Gleiswechsel, Ausfall (Daten: v6.db.transport.rest, Community-Dienst ohne Schlüssel)
const TR = "https://v6.db.transport.rest";
const STC = new Map();
const norm = s => String(s || "").toUpperCase().replace(/[\s\-]/g, "");
const get = async url => { const r = await fetch(url, { headers: { "User-Agent": "mein-kalender (kontakt@herdzeit.de)" }, cf: { cacheTtl: 30 } }).catch(() => null); if (!r || !r.ok) return null; return r.json().catch(() => null); };
async function stationId(name) {
  if (STC.has(name)) return STC.get(name);
  const j = await get(`${TR}/locations?query=${encodeURIComponent(name)}&results=3&stops=true&addresses=false&poi=false`);
  const s = (Array.isArray(j) ? j : []).find(x => x.type === "stop" || x.type === "station");
  const v = s ? { id: s.id, name: s.name } : null; STC.set(name, v); return v;
}
// w: { id, train: "IC 1934", st: "Magdeburg Hbf", at: ISO (geplant am Bahnhof), title }
export async function trainCheck(w, prev, now, tz) {
  const st = prev.sid ? { id: prev.sid, name: prev.sn } : await stationId(w.st);
  if (!st) return { state: { ...prev, err: "station" } };
  const want = norm(w.train), t0 = Date.parse(w.at), when = new Date(t0 - 45 * 60e3).toISOString();
  let hit = null, kind = "arr";
  for (const k of ["arrivals", "departures"]) {
    const j = await get(`${TR}/stops/${encodeURIComponent(st.id)}/${k}?when=${encodeURIComponent(when)}&duration=120&results=300&remarks=false&linesOfStops=false`);
    const L = Array.isArray(j) ? j : (j?.[k] || []);
    const c = L.filter(x => norm(x.line?.name) === want || norm((x.line?.productName || "") + (x.line?.fahrtNr || "")) === want);
    if (c.length) { hit = c.sort((a, b) => Math.abs(Date.parse(a.plannedWhen) - t0) - Math.abs(Date.parse(b.plannedWhen) - t0))[0]; kind = k === "arrivals" ? "arr" : "dep"; break; }
  }
  const base = { ...prev, sid: st.id, sn: st.name };
  if (!hit) return { state: { ...base, miss: (prev.miss || 0) + 1 } };
  const hm = d => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: tz || "Europe/Berlin" });
  const plan = new Date(hit.plannedWhen || w.at), real = hit.when ? new Date(hit.when) : plan;
  const delay = hit.delay == null ? null : Math.round(hit.delay / 60), pl = hit.platform || hit.plannedPlatform || "", ppl = hit.plannedPlatform || "";
  const cancelled = !!hit.cancelled, what = `${kind === "arr" ? "Ankunft" : "Abfahrt"} ${st.name.replace(/\s*\(.*?\)\s*/g, " ").trim()}`;
  const msgs = [], tag = "zug-" + w.id, m = (title, body, urgent) => msgs.push({ title, body, tag, url: "/app/", urgent });
  const s = { ...base, d: delay ?? prev.d ?? 0, pl, c: cancelled, kind, seen: true };
  if (cancelled) { if (!prev.c) m(`⚠️ ${w.train} fällt aus`, `${what}, geplant ${hm(plan)} – ${w.title ? "„" + w.title + "“ – " : ""}bitte Alternativen prüfen`, true); return { state: s, msgs }; }
  const d = delay || 0, pd = prev.seen ? (prev.d || 0) : 0;
  if (d >= 5 && (!prev.seen || pd < 5 || Math.abs(d - pd) >= 5)) m(`🚆 ${w.train}: +${d} Min.`, `${what} jetzt ca. ${hm(real)} statt ${hm(plan)}${pl ? ` · Gleis ${pl}` : ""}`, true);
  else if (d < 3 && prev.seen && pd >= 5) m(`🚆 ${w.train} wieder fast pünktlich`, `${what} ca. ${hm(real)}${pl ? ` · Gleis ${pl}` : ""}`);
  if (pl && ((prev.pl && pl !== prev.pl) || (!prev.plWarn && ppl && pl !== ppl))) { m(`🔀 Gleiswechsel: ${w.train}`, `${what} jetzt Gleis ${pl}${ppl && ppl !== pl ? ` (statt ${ppl})` : ""}`, true); s.plWarn = true; }
  if (!prev.ok && now >= plan.getTime() - 25 * 60e3 && d < 5 && !msgs.length) { m(`✅ ${w.train} pünktlich`, `${what} ${hm(real)}${pl ? ` · Gleis ${pl}` : ""}`); s.ok = true; }
  if (msgs.length) s.ok = true;
  return { state: s, msgs };
}
