// Mein Kalender – Tarife (Kostenlos / Plus / Familie)
//
// BILLING_MODE (Variable im Cloudflare-Dashboard):
//   "off"      – keine Tarif-Grenzen (nur die allgemeinen Schutzgrenzen gelten)
//   "simulate" – Grenzen je Tarif gelten, „Abo abschließen“ wird nur simuliert (Standard in der Testphase)
//   "live"     – Grenzen gelten, Tarife kommen nur noch aus echten Käufen (Google Play) oder vom Betreiber
// TRIAL_DAYS  – Plus gratis für neue Konten (Tage, Standard 0)
// PLANS_JSON  – eigene Grenzen, z. B. {"free":{"ai":30,"img":5},"plus":{"ai":300}}
// PRICE_PLUS / PRICE_FAMILY – Monatspreis in Euro, z. B. "2.99" (leer = „Preis folgt“) – für Anzeige und anteilige Gutschrift
//
// Wechsel: höherer Tarif sofort (mit anteiliger Gutschrift für die ungenutzten Tage, neue Laufzeit 1 Monat ab heute),
//          niedrigerer Tarif zum Ende der laufenden Abrechnungsperiode, Kündigung ebenso.
//
// Der Tarif liegt in den app_metadata des Supabase-Kontos – die kann nur der Server ändern, nicht die App.

export const PLAN_BASE = {
  free:   { label: "Kostenlos", ai: 30,  img: 5,  flight: false, family: false },
  plus:   { label: "Plus",      ai: 300, img: 50, flight: true,  family: false },
  family: { label: "Familie",   ai: 300, img: 50, flight: true,  family: true, seats: 5 },
};

export function plans(env) {
  let extra = {}; try { extra = JSON.parse(env.PLANS_JSON || "{}"); } catch {}
  const P = {}; for (const k of Object.keys(PLAN_BASE)) P[k] = { ...PLAN_BASE[k], ...(extra[k] || {}) };
  return P;
}
export const mode = env => ["off", "simulate", "live"].includes(env.BILLING_MODE) ? env.BILLING_MODE : "simulate";

const adm = env => ({ apikey: env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json", ...(String(env.SUPABASE_SERVICE_KEY).startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` }) });
const RANK = { free: 0, plus: 1, family: 2 };
export const priceOf = (env, id) => { const v = parseFloat(String(id === "plus" ? env.PRICE_PLUS : id === "family" ? env.PRICE_FAMILY : "0").replace(",", ".")); return id === "free" ? 0 : isFinite(v) ? v : null; };
const addMonth = t => { const d = new Date(t); const r = new Date(d); r.setUTCMonth(d.getUTCMonth() + 1); if (r.getUTCDate() !== d.getUTCDate()) r.setUTCDate(0); return r.getTime(); };
// Ende der laufenden Abrechnungsperiode (monatlich ab „since“)
export const periodEnd = since => { let e = Date.parse(since || new Date().toISOString()), now = Date.now(), n = 0; do { e = addMonth(e); } while (e <= now && ++n < 600); return e; };
const nextMonth = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10); };

// Welcher Tarif gilt gerade für dieses Konto?
export function planOf(env, user) {
  const P = plans(env), m = user?.app_metadata?.plan || {}, now = Date.now();
  const admin = !!user?.email && String(env.ADMIN_EMAIL || "").toLowerCase().split(",").map(x => x.trim()).includes(String(user.email).toLowerCase());
  let id = P[m.id] ? m.id : admin ? "plus" : "free", trial = false, since = m.since || null;      // Betreiber ohne gesetzten Tarif: Plus (zum Testen auf „Kostenlos“ umstellen)
  if (m.next && P[m.next] && m.nextAt && Date.parse(m.nextAt) <= now) { id = m.next; since = m.nextAt; }      // vorgemerkter Wechsel nach unten ist fällig
  else if (id !== "free" && m.until && Date.parse(m.until) < now) id = "free";        // gekündigt und abgelaufen
  const td = +(env.TRIAL_DAYS || 0);
  if (id === "free" && td > 0 && !m.id && user?.created_at && now - Date.parse(user.created_at) < td * 864e5) { id = "plus"; trial = true; }
  const pend = m.next && m.nextAt && Date.parse(m.nextAt) > now ? { next: m.next, nextAt: m.nextAt, nextLabel: P[m.next]?.label } : {};
  return { id, trial, src: m.src || (trial ? "trial" : "free"), since, until: id !== "free" ? (m.until || null) : null, periodEnd: id !== "free" && since ? new Date(periodEnd(since)).toISOString() : null, ...pend,
    trialUntil: trial ? new Date(Date.parse(user.created_at) + td * 864e5).toISOString() : null, ...P[id] };
}

// Verbrauch dieses Monats (aus ai_usage)
export async function usageOf(env, uid) {
  const month = new Date().toISOString().slice(0, 8) + "01";
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/ai_usage?user_id=eq.${uid}&day=gte.${month}&select=task,calls`, { headers: adm(env) }).catch(() => null);
  const rows = r && r.ok ? await r.json() : [];
  return { ai: rows.reduce((s, x) => s + x.calls, 0), img: rows.filter(x => String(x.task).startsWith("bilder")).reduce((s, x) => s + x.calls, 0), reset: nextMonth() };
}

async function setPlan(env, uid, plan) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${uid}`, { method: "PUT", headers: adm(env), body: JSON.stringify({ app_metadata: { plan } }) });
  return r.ok;
}

// Prüfung vor jeder KI-Anfrage: null = ok, sonst Antwort für 429
export function planBlock(env, plan, use, hasImages) {
  if (mode(env) === "off") return null;
  const base = { code: "rate_limited", reason: "plan", plan: plan.id, reset: use.reset };
  if (use.ai >= plan.ai) return { ...base, kind: "ai", used: use.ai, limit: plan.ai, message: `Deine ${plan.ai} KI-Aktionen für diesen Monat sind aufgebraucht – ab dem 1. geht es weiter. Eintragen über das Formular klappt weiterhin.` };
  if (hasImages && use.img >= plan.img) return { ...base, kind: "img", used: use.img, limit: plan.img, message: `Deine ${plan.img} Ticket-Auswertungen für diesen Monat sind aufgebraucht – ab dem 1. geht es weiter. Ohne Anhang klappt es weiterhin.` };
  return null;
}

// Routen: /billing/status, /billing/simulate, /billing/play/verify, /admin/plan
export async function billingRoute(route, req, env, user, isAdmin, out) {
  const P = plans(env), md = mode(env);
  const prices = { plus: priceOf(env, "plus"), family: priceOf(env, "family") };
  // Was ein Wechsel bedeutet (für die Anzeige vor dem Bestätigen und für die Simulation)
  const quote = (cur, want) => {
    const now = Date.now(), from = cur.id, up = RANK[want] > RANK[from];
    if (want === from) return { kind: "same" };
    if (!up) return { kind: "down", at: from === "free" ? null : new Date(periodEnd(cur.since)).toISOString() };
    const pOld = priceOf(env, from), pNew = priceOf(env, want);
    let credit = null, days = 0;
    if (from !== "free" && cur.since && !cur.trial) { const st = Date.parse(cur.since), en = periodEnd(cur.since), beg = Math.max(st, (() => { let b = st; while (addMonth(b) <= now) b = addMonth(b); return b; })());
      const left = Math.max(0, en - now), len = Math.max(1, en - beg); days = Math.round(left / 864e5); credit = pOld == null ? null : Math.round(pOld * left / len * 100) / 100; }
    return { kind: "up", price: pNew, credit: from === "free" || cur.trial ? 0 : credit, days, pay: pNew == null || credit == null && from !== "free" && !cur.trial ? null : Math.max(0, Math.round((pNew - (from === "free" || cur.trial ? 0 : credit)) * 100) / 100), until: new Date(addMonth(now)).toISOString() };
  };
  if (route === "/billing/status") {
    const plan = planOf(env, user), use = await usageOf(env, user.id);
    return out(200, { mode: md, plan, use, plans: P, prices, trialDays: +(env.TRIAL_DAYS || 0) });
  }
  if (route === "/billing/simulate") {
    if (md !== "simulate" && !isAdmin) return out(403, { code: "not_simulating" });
    let b = {}; try { b = await req.json(); } catch {}
    const want = String(b.plan || ""), cur = user?.app_metadata?.plan || {}, eff = planOf(env, user), nowIso = new Date().toISOString();
    if (b.quote) return out(200, { ok: true, quote: P[want] ? quote(eff, want) : null, plan: eff });
    let next;
    if (want === "cancel" || (want === "free" && eff.id !== "free")) {          // kündigen: läuft bis zum Ende der bezahlten Periode
      if (eff.id === "free") return out(200, { ok: true, plan: eff });
      next = { ...cur, id: eff.id, since: eff.since || nowIso, until: new Date(periodEnd(eff.since || nowIso)).toISOString(), cancelled: nowIso, next: null, nextAt: null };
    } else if (want === "resume") next = { ...cur, until: null, cancelled: null, next: null, nextAt: null };
    else if (P[want] && want !== "free") {
      const q = quote(eff, want);
      if (q.kind === "same") next = { ...cur, until: null, cancelled: null, next: null, nextAt: null };
      else if (q.kind === "up") next = { id: want, src: "sim", since: nowIso, until: null, prev: eff.id, credit: q.credit, paid: q.pay };        // sofort, neue Laufzeit ab heute
      else next = { ...cur, id: eff.id, since: eff.since || nowIso, until: null, cancelled: null, next: want, nextAt: q.at };                      // zum Periodenende
    } else return out(400, { code: "bad_plan" });
    if (!(await setPlan(env, user.id, next))) return out(502, { code: "save_failed" });
    return out(200, { ok: true, plan: planOf(env, { ...user, app_metadata: { ...(user.app_metadata || {}), plan: next } }) });
  }
  if (route === "/billing/play/verify") {
    // Vorbereitet für Google Play: Kaufbeleg (purchaseToken) prüfen über die Google Play Developer API
    // (Dienstkonto als Secret GOOGLE_PLAY_SA, Paketname PLAY_PACKAGE). Bis dahin: nicht eingerichtet.
    return out(501, { code: "play_not_configured" });
  }
  if (route === "/admin/plan") {
    if (!isAdmin) return out(403, { code: "not_admin" });
    let b = {}; try { b = await req.json(); } catch {}
    const uid = String(b.user || ""), want = String(b.plan || "");
    if (!/^[0-9a-f-]{20,}$/i.test(uid) || !P[want]) return out(400, { code: "bad_request" });
    const ok = await setPlan(env, uid, { id: want, src: "admin", since: new Date().toISOString(), until: null });
    return out(ok ? 200 : 502, { ok });
  }
  return null;
}

// Für den Zeitplan: Tarife aller Konten (für „Flug live“ nur in Plus/Familie)
export async function planMap(env) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: adm(env) }).catch(() => null);
  const j = r && r.ok ? await r.json().catch(() => ({})) : {}, M = {};
  for (const u of j.users || []) M[u.id] = planOf(env, u);
  return M;
}
