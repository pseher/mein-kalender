// PlanFlink – Tarife (Kostenlos / Plus / Familie)
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
// Familie: bis zu 4 Konten (abschließende Person + 3 Eingeladene) teilen sich EIN Kontingent. Mitglieder (oft Kinder)
//          bekommen nie ein Kaufangebot – nur die abschließende Person wird informiert und kann ein Zusatzpaket buchen.
// Zusatzpaket (Plus und Familie): ADDON_JSON z. B. {"ai":200,"img":20}, Preis PRICE_ADDON z. B. "0.99" – gilt bis Monatsende.
//   Schutz vor Fehlkäufen: höchstens ADDON_MAX_MONTH (3) pro Monat, ADDON_MAX_DAY (1) pro Tag, und erst wenn
//   weniger als ADDON_MIN_LEFT (20 %, also ab 80 % Verbrauch) des Kontingents übrig sind – sonst verfällt Bezahltes ungenutzt.
//
// Der Tarif liegt in den app_metadata des Supabase-Kontos – die kann nur der Server ändern, nicht die App.

export const PLAN_BASE = {
  free:   { label: "Kostenlos", ai: 30,  img: 5,  mb: 100,  flight: false, family: false },
  plus:   { label: "Plus",      ai: 300, img: 50, mb: 2000, flight: true,  family: false },
  family: { label: "Familie",   ai: 500, img: 60, mb: 2000, flight: true,  family: true, seats: 4, shared: true },   // Kontingent gilt gemeinsam für alle 4
};

export function plans(env) {
  let extra = {}; try { extra = JSON.parse(env.PLANS_JSON || "{}"); } catch {}
  const P = {}; for (const k of Object.keys(PLAN_BASE)) P[k] = { ...PLAN_BASE[k], ...(extra[k] || {}) };
  return P;
}
export const mode = env => ["off", "simulate", "live"].includes(env.BILLING_MODE) ? env.BILLING_MODE : "simulate";

const adm = env => ({ apikey: env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json", ...(String(env.SUPABASE_SERVICE_KEY).startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` }) });
const RANK = { free: 0, plus: 1, family: 2 };
export const addonOf = env => { let a = {}; try { a = JSON.parse(env.ADDON_JSON || "{}"); } catch {} return { ai: 200, img: 20, ...a, price: (v => isFinite(v) ? v : null)(parseFloat(String(env.PRICE_ADDON || "").replace(",", "."))),
  maxMonth: +(env.ADDON_MAX_MONTH || 3), maxDay: +(env.ADDON_MAX_DAY || 1), minLeft: +(env.ADDON_MIN_LEFT || 20) }; };
// Darf jetzt ein Zusatzpaket gebucht werden? → { ok, why, month, day }
export function addonCheck(env, meta, plan, use) {
  const A = addonOf(env), list = (meta?.addons || []).filter(a => a.m === curMonth()), today = new Date().toISOString().slice(0, 10);
  const month = list.length, day = list.filter(a => String(a.at || "").slice(0, 10) === today).length, left = Math.max(0, plan.ai - use.ai), leftI = Math.max(0, plan.img - use.img);
  const low = left <= plan.ai * A.minLeft / 100 || leftI <= plan.img * A.minLeft / 100;
  const why = month >= A.maxMonth ? "month" : day >= A.maxDay ? "day" : !low ? "enough" : null;
  return { ok: !why, why, month, day, maxMonth: A.maxMonth, maxDay: A.maxDay, minLeft: A.minLeft };
}
const curMonth = () => new Date().toISOString().slice(0, 7);
// Zusatzpakete dieses Monats aufs Kontingent rechnen
const withAddons = (p, meta) => { const A = (meta?.addons || []).filter(a => a.m === curMonth()); if (!A.length) return p;
  const ai = A.reduce((s, a) => s + (a.ai || 0), 0), img = A.reduce((s, a) => s + (a.img || 0), 0); return { ...p, ai: p.ai + ai, img: p.img + img, addon: { n: A.length, ai, img } }; };
export const priceOf = (env, id) => { const v = parseFloat(String(id === "plus" ? env.PRICE_PLUS : id === "family" ? env.PRICE_FAMILY : "0").replace(",", ".")); return id === "free" ? 0 : isFinite(v) ? v : null; };
const addMonth = t => { const d = new Date(t); const r = new Date(d); r.setUTCMonth(d.getUTCMonth() + 1); if (r.getUTCDate() !== d.getUTCDate()) r.setUTCDate(0); return r.getTime(); };
// Ende der laufenden Abrechnungsperiode (monatlich ab „since“)
export const periodEnd = since => { let e = Date.parse(since || new Date().toISOString()), now = Date.now(), n = 0; do { e = addMonth(e); } while (e <= now && ++n < 600); return e; };
const nextMonth = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10); };

// Welcher Tarif gilt gerade für dieses Konto?
export function planOf(env, user) {
  const P = plans(env), now = Date.now(); let m = user?.app_metadata?.plan || {};
  if (m.src === "family" || m.src === "family_left") m = {};          // Mitglied einer Familie: wird in resolvePlan() geprüft
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

const getUser = async (env, id) => { const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${id}`, { headers: adm(env) }).catch(() => null); return r && r.ok ? r.json().catch(() => null) : null; };
const nameOf = u => u?.user_metadata?.full_name || u?.user_metadata?.name || (u?.email ? u.email.replace(/^(.).*?(@.*)$/, "$1…$2") : "Jemand");

// Tarif inkl. Familie (Mitglied → gilt, solange die Familie der abschließenden Person aktiv ist)
export async function resolvePlan(env, user) {
  const m = user?.app_metadata?.plan || {}, P = plans(env);
  if (m.src === "family" && m.owner) {
    const o = await getUser(env, m.owner), op = o ? planOf(env, o) : null, mem = o?.app_metadata?.plan?.members || [];
    if (op && op.id === "family" && mem.includes(user.id)) return withAddons({ ...P.family, id: "family", member: true, owner: o.id, ownerName: nameOf(o), src: "family", since: op.since, periodEnd: op.periodEnd, until: op.until, pool: [o.id, ...mem] }, o.app_metadata.plan);
    return { ...planOf(env, user), leftFamily: true, fromName: o ? nameOf(o) : "" };
  }
  const p = planOf(env, user);
  if (m.src === "family_left") p.leftFamily = m.left || true;
  if (p.id === "family") { p.owner = user.id; p.members = m.members || []; p.pool = [user.id, ...p.members]; }
  return p.id === "free" ? p : withAddons(p, m);
}

// Verbrauch dieses Monats (aus ai_usage) – bei Familie für alle Konten zusammen
export async function usageOf(env, uid) {
  const month = new Date().toISOString().slice(0, 8) + "01", ids = [].concat(uid).filter(Boolean);
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/ai_usage?user_id=in.(${ids.join(",")})&day=gte.${month}&select=user_id,task,calls`, { headers: adm(env) }).catch(() => null);
  const rows = r && r.ok ? await r.json() : [];
  const by = {}; for (const x of rows) by[x.user_id] = (by[x.user_id] || 0) + x.calls;
  return { ai: rows.reduce((s, x) => s + x.calls, 0), img: rows.filter(x => String(x.task).startsWith("bilder")).reduce((s, x) => s + x.calls, 0), by, reset: nextMonth() };
}

async function setPlan(env, uid, plan) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${uid}`, { method: "PUT", headers: adm(env), body: JSON.stringify({ app_metadata: { plan } }) });
  return r.ok;
}

// Prüfung vor jeder KI-Anfrage: null = ok, sonst Antwort für 429
export function planBlock(env, plan, use, hasImages) {
  if (mode(env) === "off") return null;
  const base = { code: "rate_limited", reason: "plan", plan: plan.id, reset: use.reset };
  if (use.ai >= plan.ai) return { ...base, member: !!plan.member, owner: plan.member ? plan.ownerName : null, kind: "ai", used: use.ai, limit: plan.ai, message: plan.shared ? `Das gemeinsame Familien-Kontingent ist für diesen Monat aufgebraucht – ab dem 1. geht es weiter. Eintragen über das Formular klappt weiterhin.` : `Deine ${plan.ai} KI-Aktionen für diesen Monat sind aufgebraucht – ab dem 1. geht es weiter. Eintragen über das Formular klappt weiterhin.` };
  if (hasImages && use.img >= plan.img) return { ...base, member: !!plan.member, owner: plan.member ? plan.ownerName : null, kind: "img", used: use.img, limit: plan.img, message: `Deine ${plan.img} Ticket-Auswertungen für diesen Monat sind aufgebraucht – ab dem 1. geht es weiter. Ohne Anhang klappt es weiterhin.` };
  return null;
}

// Routen: /billing/status, /billing/simulate, /billing/play/verify, /admin/plan
// Mitglied stößt an die Grenze → die abschließende Person einmal pro Monat benachrichtigen
export async function noteFamilyLimit(env, plan, push) {
  if (!plan?.shared || !plan.owner) return;
  const o = await getUser(env, plan.owner), om = o?.app_metadata?.plan; if (!om || om.limitNote === curMonth()) return;
  await setPlan(env, o.id, { ...om, limitNote: curMonth() });
  await push(env, o.id, { title: "👨‍👩‍👧 Familien-Kontingent aufgebraucht", body: "Eure gemeinsamen KI-Aktionen sind für diesen Monat verbraucht. Unter „Tarif“ kannst du ein Zusatzpaket buchen.", tag: "fam-limit", url: "/app/?plans=1" }).catch(() => {});
}
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
    const plan = await resolvePlan(env, user), use = await usageOf(env, plan.pool || user.id);
    let family = null;
    if (plan.id === "family") { const ids = plan.pool || []; const us = await Promise.all(ids.map(i => i === user.id ? user : getUser(env, i)));
      family = { owner: plan.owner, me: user.id, seats: P.family.seats, members: us.filter(Boolean).map(u => ({ id: u.id, name: nameOf(u), owner: u.id === plan.owner, used: use.by?.[u.id] || 0 })) }; }
    const ometa = plan.member ? null : user.app_metadata?.plan;
    return out(200, { mode: md, plan, use, plans: P, prices, family, addon: { ...addonOf(env), ...(ometa && ["plus", "family"].includes(plan.id) ? addonCheck(env, ometa, plan, use) : { ok: false, why: "plan" }) }, trialDays: +(env.TRIAL_DAYS || 0) });
  }
  if (route.startsWith("/billing/family/")) {
    let b = {}; try { b = await req.json(); } catch {}
    const op = route.split("/")[3], me = user.app_metadata?.plan || {}, nowIso = new Date().toISOString();
    if (op === "invite") {
      const pl = planOf(env, user); if (pl.id !== "family") return out(403, { code: "no_family" });
      if ((me.members || []).length >= P.family.seats - 1) return out(409, { code: "full" });
      const code = [...crypto.getRandomValues(new Uint8Array(6))].map(x => "abcdefghjkmnpqrstuvwxyz23456789"[x % 31]).join("");
      const inv = [...(me.invites || []).filter(i => Date.parse(i.exp) > Date.now()), { c: code, exp: new Date(Date.now() + 7 * 864e5).toISOString() }].slice(-5);
      if (!(await setPlan(env, user.id, { ...me, invites: inv }))) return out(502, { code: "save_failed" });
      return out(200, { ok: true, code, exp: inv.at(-1).exp });
    }
    if (op === "peek" || op === "join") {
      const code = String(b.code || "").toLowerCase().replace(/[^a-z0-9]/g, ""); if (!code) return out(400, { code: "bad_code" });
      const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: adm(env) }).catch(() => null), all = r && r.ok ? (await r.json().catch(() => ({}))).users || [] : [];
      const o = all.find(u => (u.app_metadata?.plan?.invites || []).some(i => i.c === code && Date.parse(i.exp) > Date.now()));
      if (!o || planOf(env, o).id !== "family") return out(404, { code: "invalid" });
      const om = o.app_metadata.plan, mem = om.members || [];
      if (o.id === user.id) return out(409, { code: "own" });
      if (mem.includes(user.id)) return out(200, { ok: true, already: true, ownerName: nameOf(o) });
      if (mem.length >= P.family.seats - 1) return out(409, { code: "full", ownerName: nameOf(o) });
      const mine = planOf(env, user); if (mine.id !== "free" && !mine.trial && me.src !== "family") return out(409, { code: "has_plan", plan: mine.label, ownerName: nameOf(o) });
      if (op === "peek") return out(200, { ok: true, ownerName: nameOf(o), seatsLeft: P.family.seats - 1 - mem.length });
      if (!(await setPlan(env, o.id, { ...om, members: [...mem, user.id], invites: (om.invites || []).filter(i => i.c !== code) }))) return out(502, { code: "save_failed" });
      await setPlan(env, user.id, { id: "family", src: "family", owner: o.id, since: nowIso });
      return out(200, { ok: true, ownerName: nameOf(o) });
    }
    if (op === "remove" || op === "leave") {
      const ownerId = op === "leave" ? me.owner : user.id, uid = op === "leave" ? user.id : String(b.user || "");
      if (!ownerId || !uid) return out(400, { code: "bad_request" });
      const o = op === "leave" ? await getUser(env, ownerId) : user; if (!o) return out(404, { code: "invalid" });
      const om = o.app_metadata?.plan || {};
      if (!(om.members || []).includes(uid)) return out(404, { code: "not_member" });
      await setPlan(env, o.id, { ...om, members: om.members.filter(x => x !== uid) });
      await setPlan(env, uid, { id: "free", src: "family_left", left: nowIso, from: o.id });
      return out(200, { ok: true });
    }
    return out(404, { code: "not_found" });
  }
  if (route === "/billing/simulate") {
    if (md !== "simulate" && !isAdmin) return out(403, { code: "not_simulating" });
    let b = {}; try { b = await req.json(); } catch {}
    let cur = user?.app_metadata?.plan || {};
    if (cur.src === "family" && cur.owner && !b.quote && b.plan !== "cancel") {          // Mitglied schließt eigenes Abo ab → verlässt die Familie
      const o = await getUser(env, cur.owner); const om = o?.app_metadata?.plan; if (om?.members) await setPlan(env, o.id, { ...om, members: om.members.filter(x => x !== user.id) }); cur = {};
    }
    if (cur.src === "family" || cur.src === "family_left") cur = {};
    const want = String(b.plan || ""), eff = planOf(env, { ...user, app_metadata: { ...(user.app_metadata || {}), plan: cur } }), nowIso = new Date().toISOString();
    if (b.quote) return out(200, { ok: true, quote: P[want] ? quote(eff, want) : null, plan: eff });
    if (b.addon) {                                             // Zusatzpaket bis Monatsende (nur Plus und Familie, nur die abschließende Person)
      if (cur.src === "family" || !["plus", "family"].includes(eff.id)) return out(403, { code: "no_addon" });
      const rp = await resolvePlan(env, user), chk = addonCheck(env, cur, rp, await usageOf(env, rp.pool || user.id));
      if (!chk.ok) return out(409, { code: "addon_" + chk.why, ...chk });
      const A = addonOf(env), next = { ...cur, addons: [...(cur.addons || []).filter(a => a.m >= curMonth()), { m: curMonth(), ai: A.ai, img: A.img, at: new Date().toISOString(), price: A.price }].slice(-12) };
      if (!(await setPlan(env, user.id, next))) return out(502, { code: "save_failed" });
      return out(200, { ok: true, addon: true });
    }
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
  const U = j.users || [];
  for (const u of U) M[u.id] = planOf(env, u);
  for (const u of U) { const m = u.app_metadata?.plan; if (m?.src === "family" && m.owner && M[m.owner]?.id === "family" && (U.find(x => x.id === m.owner)?.app_metadata?.plan?.members || []).includes(u.id)) M[u.id] = M[m.owner]; }
  return M;
}
