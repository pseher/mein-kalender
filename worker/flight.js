// Mein Kalender – Flug-Wächter: Verspätung, Gate, Gepäckband, Landung, Ausfall (Daten: AirLabs, Secret AIRLABS_KEY)
const AL = "https://airlabs.co/api/v9/flight";
export const STAT = { al: 0 };   // AirLabs-Aufrufe im aktuellen Lauf (fürs Dashboard)
const hmT = (d, tz) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: tz || "Europe/Berlin" });
// w: { id, mode: "flug", train: "LH 123", st, at (geplante Zeit am Flughafen), prefer: "arr"|"dep", title }
export async function flightCheck(env, w, prev, now, tz = "Europe/Berlin", dbg) {
  if (!env.AIRLABS_KEY) { dbg?.push("kein AIRLABS_KEY"); return { state: prev, msgs: [] }; }
  const t0 = Date.parse(w.at), mins = (t0 - now) / 60e3;
  // sparsam: bis 1 Std. vorher nur alle 15 Min., danach alle 5 Min.
  if (!dbg && prev.chk && mins > 60 && now - Date.parse(prev.chk) < 14 * 60e3) return { state: prev, msgs: [] };
  let code = prev.code || (/\d/.test(w.train || "") ? String(w.train).replace(/\s+/g, "").toUpperCase() : "");
  // keine Flugnummer (z. B. Screenshot ohne Nummer): einmal über Strecke + Abflugzeit im Flugplan nachschlagen
  if (!code && w.route?.dep && w.route?.arr) {
    const q = new URLSearchParams({ dep_iata: w.route.dep, arr_iata: w.route.arr, api_key: env.AIRLABS_KEY }); if (w.route.al) q.set("airline_iata", w.route.al);
    STAT.al++; const rs = await fetch(`https://airlabs.co/api/v9/schedules?${q}`).catch(() => null), js = rs && rs.ok ? await rs.json().catch(() => ({})) : {};
    const L = Array.isArray(js.response) ? js.response : [], want = w.route.time || "";
    const hit = L.filter(x => !want || String(x.dep_time || "").slice(11, 16) === want).sort((a, b) => Math.abs((a.dep_time_ts || 0) * 1000 - t0) - Math.abs((b.dep_time_ts || 0) * 1000 - t0))[0];
    dbg?.push(`Flugplan ${w.route.dep} → ${w.route.arr}${w.route.al ? " (" + w.route.al + ")" : ""}${want ? " ab " + want : ""}: ${L.length} Flüge${hit ? ", gefunden " + hit.flight_iata : rs && !rs.ok ? " (HTTP " + rs.status + ")" : ", keiner passt"}`);
    if (!hit?.flight_iata) return { state: { ...prev, chk: new Date(now).toISOString(), miss: (prev.miss || 0) + 1 }, msgs: [] };
    code = hit.flight_iata; prev = { ...prev, code };
  }
  if (!code) { dbg?.push("keine Flugnummer und keine Strecke erkannt"); return { state: prev, msgs: [] }; }
  STAT.al++; const r = await fetch(`${AL}?flight_iata=${encodeURIComponent(code)}&api_key=${encodeURIComponent(env.AIRLABS_KEY)}`).catch(() => null);
  if (!r || !r.ok) { dbg?.push(`AirLabs: keine Antwort (${r ? "HTTP " + r.status : "Netzwerk"})`); return { state: { ...prev, chk: new Date(now).toISOString() }, msgs: [] }; }
  const j = await r.json().catch(() => ({})), f = j.response;
  if (j.error || !f) { dbg?.push(`AirLabs: ${j.error?.message || "Flug nicht gefunden"}`); return { state: { ...prev, chk: new Date(now).toISOString(), miss: (prev.miss || 0) + 1 }, msgs: [] }; }
  const kind = w.prefer === "dep" ? "dep" : "arr";
  const ts = k => f[`${k}_time_ts`] ? f[`${k}_time_ts`] * 1000 : f[`${k}_time_utc`] ? Date.parse(f[`${k}_time_utc`].replace(" ", "T") + "Z") : null;
  const es = k => f[`${k}_estimated_ts`] ? f[`${k}_estimated_ts`] * 1000 : f[`${k}_estimated_utc`] ? Date.parse(f[`${k}_estimated_utc`].replace(" ", "T") + "Z") : null;
  const plan = ts(kind);
  if (plan && Math.abs(plan - t0) > 18 * 3600e3) { dbg?.push(`AirLabs liefert einen anderen Tag (${new Date(plan).toLocaleString("de-DE", { timeZone: tz })}) – später nochmal`); return { state: { ...prev, chk: new Date(now).toISOString() }, msgs: [] }; }
  const est = es(kind) || plan, d = Math.max(0, (f[`${kind}_delayed`] ?? Math.round(((est || 0) - (plan || 0)) / 60e3)) || 0);
  const gate = f[`${kind}_gate`] || "", term = f[`${kind}_terminal`] || "", bag = kind === "arr" ? f.arr_baggage || "" : "", status = String(f.status || ""), cancelled = /cancel/i.test(status);
  const ap = kind === "arr" ? f.arr_iata : f.dep_iata, what = `${kind === "arr" ? "Landung" : "Abflug"} ${ap || w.st || ""}`.trim();
  dbg?.push(`gefunden: ${f.flight_iata || code} ${f.dep_iata || "?"} → ${f.arr_iata || "?"} · Status ${status || "?"}`);
  dbg?.push(`${what}: planmäßig ${plan ? hmT(new Date(plan), tz) : "?"}${d ? ` · jetzt ca. ${hmT(new Date(est), tz)} (+${d} Min.)` : ""}${term ? " · Terminal " + term : ""}${gate ? " · Gate " + gate : ""}${bag ? " · Gepäckband " + bag : ""}`);
  const msgs = [], tag = "flug-" + w.id, m = (title, body, urgent) => msgs.push({ title, body, tag, url: "/app/", urgent });
  const lbl = /\d/.test(w.train || "") ? w.train : code.replace(/^([A-Z0-9]{2})(\d)/, "$1 $2"); w = { ...w, train: lbl };
  const ns = { ...prev, code, seen: true, chk: new Date(now).toISOString(), kind, sn: ap || w.st, pt: plan ? new Date(plan).toISOString() : w.at, d, pl: gate, term, bag, status, c: cancelled, flight: true };
  if (cancelled) { if (!prev.c) m(`❌ ${w.train} gestrichen`, `${what}, geplant ${plan ? hmT(new Date(plan), tz) : ""}${w.title ? ` – „${w.title}“` : ""}`, true); return { state: ns, msgs }; }
  const pd = prev.seen ? (prev.d || 0) : 0;
  if (d >= 15 && (!prev.seen || pd < 15 || Math.abs(d - pd) >= 10)) m(`✈️ ${w.train}: +${d} Min.`, `${what} jetzt ca. ${hmT(new Date(est), tz)} statt ${hmT(new Date(plan), tz)}${term ? " · Terminal " + term : ""}`, true);
  else if (d < 10 && prev.seen && pd >= 15) m(`✈️ ${w.train} holt auf`, `${what} ca. ${hmT(new Date(est), tz)}`);
  if (kind === "dep" && gate && prev.pl && gate !== prev.pl) m(`🚪 Gate geändert: ${w.train}`, `jetzt Gate ${gate} (statt ${prev.pl})${term ? " · Terminal " + term : ""}`, true);
  if (kind === "arr" && status === "landed" && prev.status !== "landed") m(`🛬 ${w.train} gelandet`, `${ap || ""} ${hmT(new Date(est || now), tz)}${term ? " · Terminal " + term : ""}${bag ? " · Gepäckband " + bag : ""}`, true);
  else if (kind === "arr" && bag && !prev.bag) m(`🧳 ${w.train}: Gepäckband ${bag}`, `${what} ca. ${hmT(new Date(est), tz)}${term ? " · Terminal " + term : ""}`);
  if (!prev.ok && plan && now >= plan - 40 * 60e3 && d < 15 && !msgs.length) { m(`✅ ${w.train} planmäßig`, `${what} ${hmT(new Date(est), tz)}${d >= 5 ? ` (+${d} Min.)` : ""}${term ? " · Terminal " + term : ""}${gate ? " · Gate " + gate : ""}`); ns.ok = true; }
  if (msgs.length) ns.ok = true;
  return { state: ns, msgs };
}
