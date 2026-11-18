// Mein Kalender – Worker (wird bei Änderungen in worker/ automatisch von Cloudflare bereitgestellt)
// Mein Kalender – KI-Worker (Cloudflare Worker)
// Nimmt KI-Anfragen der App entgegen, prüft Anmeldung und Tageslimits,
// fragt das Modell und protokolliert die Nutzung. Der API-Schlüssel bleibt hier.
//
// Secrets (wrangler secret put …): ANTHROPIC_KEY, SUPABASE_SERVICE_KEY
// Variablen (wrangler.toml):       SUPABASE_URL, SUPABASE_ANON_KEY, ALLOWED_ORIGINS,
//                                  MODEL_QUICK, MODEL_DEFAULT, DAILY_LIMIT, IMAGE_DAILY_LIMIT,
//                                  GOOGLE_CLIENT_ID  (+ Secret GOOGLE_CLIENT_SECRET für /google/token)

import { vapid, runSchedule, testPush, pushTo } from "./push.js";
import { trainCheck } from "./train.js";
import { flightCheck } from "./flight.js";
import { filesRoute, deleteUserFiles } from "./files.js";
import { billingRoute, planOf, resolvePlan, usageOf, planBlock, noteFamilyLimit, mode as billMode } from "./billing.js";

const VERSION = "2026-11-18a";
const PRICE = { "claude-sonnet-5-5": [2, 10], "claude-haiku-4-5-20251001": [1, 5], "claude-haiku-4-5": [1, 5], "claude-haiku-5-5": [0.1, 0.5], "claude-opus-5-5": [5, 25] };   // $ je 1 Mio. Tokens (Ein-, Ausgabe) – wie im Dashboard
const MAX_PROMPT = 24000, MAX_IMAGES = 5, MAX_IMAGE_B64 = 2_000_000;

export default {
  // Zeitplan (wrangler.toml → [triggers]): fällige Benachrichtigungen verschicken
  async scheduled(ev, env, ctx) { ctx.waitUntil(runSchedule(env).catch(e => console.log("push", e))); },
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "",
      "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Vary": "Origin",
    };
    const out = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const route = new URL(req.url).pathname;
    if (req.method === "GET" && route === "/push/key") { const v = await vapid(env).catch(() => null); return out(v ? 200 : 503, v ? { key: v.pub } : { code: "no_vapid" }); }
    if (req.method === "GET" && route === "/status") return out(200, { ok: true, version: VERSION, model: env.MODEL_DEFAULT, quick: env.MODEL_QUICK, keys: { r2: !!env.DOCS, admin: !!env.ADMIN_EMAIL, airlabs: !!env.AIRLABS_KEY, db: !!(env.DB_CLIENT_ID && env.DB_API_KEY), vapid: !!env.VAPID_JWK, anthropic: !!env.ANTHROPIC_KEY, supabase: !!env.SUPABASE_SERVICE_KEY, google: !!env.GOOGLE_CLIENT_SECRET }, routes: ["/ai", "/google/token", "/account/delete", "/page", "/push/key", "/push/test"] });
    if (route === "/files" || route.startsWith("/files/")) return await filesRoute(req, env, route, cors, allowed, origin);   // Dokumente in R2
    if (req.method !== "POST" || !["/ai", "/google/token", "/account/delete", "/page", "/push/test", "/admin/me", "/admin/stats", "/admin/train", "/admin/plan", "/billing/status", "/billing/simulate", "/billing/play/verify", "/billing/family/invite", "/billing/family/peek", "/billing/family/join", "/billing/family/remove", "/billing/family/leave"].includes(route)) return out(404, { code: "not_found" });
    if (allowed.length && !allowed.includes(origin)) return out(403, { code: "origin" });

    // 1) Wer fragt? (Supabase-Anmeldung prüfen)
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return out(401, { code: "not_signed_in" });
    const who = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth } });
    if (!who.ok) return out(401, { code: "not_signed_in" });
    const user = await who.json();

    // Konto löschen: Google-Freigabe zurückziehen, dann den Supabase-Nutzer löschen –
    // alle Zeilen in docs, outbox und ai_usage hängen per „on delete cascade“ daran und verschwinden mit.
    // Betreiber-Dashboard: nur für Konten aus dem Secret ADMIN_EMAIL (kommagetrennt)
    const isAdmin = !!user.email && String(env.ADMIN_EMAIL || "").toLowerCase().split(",").map(x => x.trim()).filter(Boolean).includes(String(user.email).toLowerCase());
    if (route === "/admin/me") return out(200, { admin: isAdmin, configured: !!env.ADMIN_EMAIL });
    if (route.startsWith("/billing/") || route === "/admin/plan") return await billingRoute(route, req, env, user, isAdmin, out);
    if (route === "/admin/stats") {
      if (!isAdmin) return out(403, { code: "not_admin" });
      const sv = { apikey: env.SUPABASE_SERVICE_KEY, ...(String(env.SUPABASE_SERVICE_KEY).startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` }) };
      const since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
      const j = async u => { const r = await fetch(u, { headers: sv }); return r.ok ? r.json() : []; };
      const aidOf = () => user.id, since30 = new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 10);
      const [ai, use, subs, ur, sys, dev, helpq, evs] = await Promise.all([
        j(`${env.SUPABASE_URL}/rest/v1/ai_usage?day=gte.${since}&select=user_id,day,task,calls,tok_in,tok_out&limit=20000`),
        j(`${env.SUPABASE_URL}/rest/v1/docs?coll=eq.usage&id=gte.${since}&select=user_id,id,data&limit=20000`),
        j(`${env.SUPABASE_URL}/rest/v1/docs?coll=eq.pushsub&select=user_id&limit=20000`),
        fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: sv }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        j(`${env.SUPABASE_URL}/rest/v1/docs?user_id=eq.${aidOf()}&coll=eq.sys&id=gte.${since30}&select=id,data&limit=40`),
        j(`${env.SUPABASE_URL}/rest/v1/docs?coll=eq.dev&select=user_id,id,data&limit=2000`),
        j(`${env.SUPABASE_URL}/rest/v1/docs?coll=eq.helpq&select=user_id,data,updated_at&order=updated_at.desc&limit=80`),
        j(`${env.SUPABASE_URL}/rest/v1/docs?coll=eq.events&select=user_id&limit=50000`),
      ]);
      const evn = {}; for (const r of evs) evn[r.user_id] = (evn[r.user_id] || 0) + 1;
      const users = (ur.users || []).map(u => { const pl = u.app_metadata?.plan?.src === "family" ? { id: "family", src: "family", until: null } : planOf(env, u); return { id: u.id, created: u.created_at, last: u.last_sign_in_at, me: u.id === user.id, plan: pl.id, planSrc: pl.src, planUntil: pl.until, trial: pl.trial }; });
      return out(200, { billing: billMode(env), at: new Date().toISOString(), models: { quick: env.MODEL_QUICK, default: env.MODEL_DEFAULT }, limits: { usd: +(env.MONTHLY_USD || 3), day: +(env.DAILY_LIMIT || 40), img: +(env.IMAGE_DAILY_LIMIT || 10), month: +(env.MONTHLY_LIMIT || 400), tok: +(env.MONTHLY_TOKENS || 3000000), maxImages: MAX_IMAGES, maxPrompt: MAX_PROMPT }, users, ai, use: use.map(r => ({ u: r.user_id, d: r.id, f: r.data?.f || {} })), push: [...new Set(subs.map(s => s.user_id))].length, pushBy: subs.reduce((m, s) => (m[s.user_id] = (m[s.user_id] || 0) + 1, m), {}),
        sys: sys.map(r => ({ d: r.id, ...r.data })), dev: dev.map(r => ({ u: r.user_id, id: r.id, ...r.data })), helpq: helpq.map(r => ({ u: r.user_id, q: String(r.data?.q || "").slice(0, 300), at: r.updated_at })), evn,
        version: VERSION, keys: { airlabs: !!env.AIRLABS_KEY, db: !!(env.DB_CLIENT_ID && env.DB_API_KEY), vapid: !!env.VAPID_JWK, anthropic: !!env.ANTHROPIC_KEY, supabase: !!env.SUPABASE_SERVICE_KEY, google: !!env.GOOGLE_CLIENT_SECRET } });
    }
    // Zug-Wächter prüfen (nur Admin, eigene Züge): zeigt Schritt für Schritt, was die Bahn antwortet – ohne Benachrichtigung
    if (route === "/admin/train") {
      if (!isAdmin) return out(403, { code: "not_admin" });
      const sv = { apikey: env.SUPABASE_SERVICE_KEY, ...(String(env.SUPABASE_SERVICE_KEY).startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` }) };
      const rows = await fetch(`${env.SUPABASE_URL}/rest/v1/docs?user_id=eq.${user.id}&coll=eq.push&id=in.(plan,sent)&select=id,data`, { headers: sv }).then(r => r.ok ? r.json() : []);
      const plan = rows.find(r => r.id === "plan")?.data || {}, sent = rows.find(r => r.id === "sent")?.data || {};
      const res = [];
      for (const w of (plan.watch || []).filter(w => Date.parse(w.at) > Date.now() - 30 * 60e3).slice(0, 6)) { const dbg = []; try { const r = await (w.mode === "flug" ? flightCheck : trainCheck)(env, w, {}, Date.now(), plan.tz, dbg); res.push({ w, dbg, msgs: r.msgs, state: sent.trains?.[w.id] || null }); } catch (e) { res.push({ w, dbg: [...dbg, "Fehler: " + String(e).slice(0, 120)] }); } }
      return out(200, { planAt: plan.at || plan.updated || null, pref: plan.pref || {}, watch: res, lastRun: sent.at || null });
    }
    if (route === "/push/test") return out(200, await testPush(env, user.id).catch(e => ({ ok: false, code: "error", detail: String(e).slice(0, 120) })));

    // Link auslesen (Buchungsbestätigung, Ticket-Seite …): Seite holen und als Text zurückgeben – nur öffentliche https-Seiten
    if (route === "/page") {
      let url = ""; try { url = String((await req.json()).url || ""); } catch {}
      let u; try { u = new URL(url); } catch { return out(400, { code: "bad_url" }); }
      if (u.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname) || !u.hostname.includes(".")) return out(400, { code: "bad_url" });
      const ctl = new AbortController(), tmo = setTimeout(() => ctl.abort(), 9000);
      try {
        const r = await fetch(u.toString(), { signal: ctl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (Mein Kalender Link-Vorschau)", "Accept-Language": "de-DE,de;q=0.9" } });
        const ct = r.headers.get("content-type") || "";
        if (!r.ok) return out(200, { ok: false, status: r.status });
        if (/pdf/.test(ct)) { const buf = new Uint8Array(await r.arrayBuffer()); if (buf.length > 6e6) return out(200, { ok: false, status: 413 });
          let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          return out(200, { ok: true, pdf: btoa(bin), url: r.url }); }
        let html = (await r.text()).slice(0, 600000);
        const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
        const meta = [...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:title|og:description|description)["'][^>]+content=["']([^"']+)/gi)].map(m => m[1]).join(" · ");
        const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1].trim()).join("\n").slice(0, 6000);
        const text = html.replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 14000);
        return out(200, { ok: true, url: r.url, title: title.trim().slice(0, 200), meta: meta.slice(0, 600), ld, text });
      } catch { return out(200, { ok: false, status: 0 }); } finally { clearTimeout(tmo); }
    }
    if (route === "/account/delete") {
      let rt = ""; try { rt = String((await req.json()).refresh_token || ""); } catch {}
      if (rt) await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: rt }) }).catch(() => {});
      const adm = { apikey: env.SUPABASE_SERVICE_KEY, ...(env.SUPABASE_SERVICE_KEY.startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` }) };
      const d = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: adm });
      if (!d.ok) return out(502, { code: "delete_failed", detail: `Supabase ${d.status}` });
      await deleteUserFiles(env, user.id).catch(() => {});   // Dokumente in R2 mitlöschen
      return out(200, { ok: true });
    }

    // Google-Zugriffsschlüssel erneuern (der Clientschlüssel bleibt hier; nichts wird gespeichert)
    if (route === "/google/token") {
      let rt = ""; try { rt = String((await req.json()).refresh_token || ""); } catch {}
      if (!rt) return out(400, { code: "bad_request" });
      const g = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: rt, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET }) });
      const gb = await g.json().catch(() => ({}));
      if (!env.GOOGLE_CLIENT_SECRET) return out(500, { code: "google_error", detail: "GOOGLE_CLIENT_SECRET fehlt im Worker" });
      if (!g.ok) return out(gb.error === "invalid_grant" ? 401 : 502, { code: gb.error === "invalid_grant" ? "invalid_grant" : "google_error", detail: `Google ${g.status} ${gb.error || ""}`.trim() });
      return out(200, { access_token: gb.access_token, expires_in: gb.expires_in || 3600 });
    }

    // 2) Anfrage prüfen
    let body; try { body = await req.json(); } catch { return out(400, { code: "bad_request" }); }
    const prompt = String(body.prompt || ""), tier = body.tier === "quick" ? "quick" : "default";
    const task = String(body.task || "allgemein").slice(0, 40), images = Array.isArray(body.images) ? body.images : [];
    if (!prompt || prompt.length > MAX_PROMPT) return out(400, { code: "too_long" });
    if (images.length > MAX_IMAGES || images.some(i => !/^image\/(jpeg|png|webp|gif)$/.test(i?.type || "") || String(i?.data || "").length > MAX_IMAGE_B64)) return out(400, { code: "bad_image" });

    // 3) Tageslimit
    // Neue Supabase-Schlüssel (sb_secret_…) nur als apikey senden; alte JWT-Schlüssel zusätzlich als Bearer
    const svc = { apikey: env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json", ...(env.SUPABASE_SERVICE_KEY.startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` }) };
    const today = new Date().toISOString().slice(0, 10), month = today.slice(0, 8) + "01";
    const u = await fetch(`${env.SUPABASE_URL}/rest/v1/ai_usage?user_id=eq.${user.id}&day=gte.${month}&select=day,task,calls,tok_in,tok_out`, { headers: svc });
    const mrows = u.ok ? await u.json() : [], rows = mrows.filter(r => r.day === today);
    const used = rows.reduce((s, r) => s + r.calls, 0), usedImg = rows.filter(r => String(r.task).startsWith("bilder")).reduce((s, r) => s + r.calls, 0);
    const mCalls = mrows.reduce((s, r) => s + r.calls, 0), mTok = mrows.reduce((s, r) => s + (r.tok_in || 0) + (r.tok_out || 0), 0);
    const L = { day: +(env.DAILY_LIMIT || 40), img: +(env.IMAGE_DAILY_LIMIT || 10), month: +(env.MONTHLY_LIMIT || 400), tok: +(env.MONTHLY_TOKENS || 3000000), usd: +(env.MONTHLY_USD || 3) };
    const mUsd = mrows.reduce((s, r) => { const P = PRICE[String(r.task).split("|")[1]] || PRICE[env.MODEL_DEFAULT] || [2, 10]; return s + ((r.tok_in || 0) * P[0] + (r.tok_out || 0) * P[1]) / 1e6; }, 0);
    if (L.usd > 0 && mUsd >= L.usd) return out(429, { code: "rate_limited", message: "Monatslimit für KI-Anfragen erreicht – ab dem 1. geht es weiter. Das Formular funktioniert weiterhin." });
    if (used >= L.day) return out(429, { code: "rate_limited", message: `Tageslimit erreicht (${L.day} KI-Anfragen) – morgen geht es weiter.` });
    if (images.length && usedImg >= L.img) return out(429, { code: "rate_limited", message: `Tageslimit für Tickets/Bilder erreicht (${L.img}) – morgen geht es weiter. Ohne Anhang klappt es weiterhin.` });
    if (mCalls >= L.month || mTok >= L.tok) return out(429, { code: "rate_limited", message: "Monatslimit für KI-Anfragen erreicht – ab dem 1. geht es weiter. Das Formular funktioniert weiterhin." });
    // Tarif-Grenzen (Kostenlos / Plus / Familie)
    const plan = billMode(env) === "off" ? planOf(env, user) : await resolvePlan(env, user);
    const puse = plan.pool && plan.pool.length > 1 ? await usageOf(env, plan.pool) : { ai: mCalls, img: mrows.filter(r => String(r.task).startsWith("bilder")).reduce((s, r) => s + r.calls, 0), reset: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString().slice(0, 10) };
    const pb = planBlock(env, plan, puse, images.length > 0); if (pb) { if (pb.member) await noteFamilyLimit(env, plan, pushTo).catch(() => {}); return out(429, pb); }

    // 4) Modell fragen
    let model = tier === "quick" ? env.MODEL_QUICK : env.MODEL_DEFAULT;
    const content = [...images.map(i => ({ type: "image", source: { type: "base64", media_type: i.type, data: i.data } })), { type: "text", text: prompt }];
    const call = m => fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: m, max_tokens: tier === "quick" ? 4000 : 8000, messages: [{ role: "user", content }] }),   // Haiku 5.5 denkt adaptiv mit – etwas mehr Platz
    }).catch(e => ({ ok: false, status: 0, json: async () => ({ error: { message: String(e) } }) }));
    let r = await call(model);
    // Ersatzmodell, falls das eingestellte schnelle Modell (noch) nicht verfügbar ist
    if (!r.ok && tier === "quick" && [400, 404].includes(r.status) && env.MODEL_QUICK_FALLBACK && env.MODEL_QUICK_FALLBACK !== model) { model = env.MODEL_QUICK_FALLBACK; r = await call(model); }
    if (!r.ok) { const eb = await r.json().catch(() => ({})); return out(502, { code: r.status === 429 ? "rate_limited" : "ai_error", detail: `Anthropic ${r.status}${env.ANTHROPIC_KEY ? "" : " (ANTHROPIC_KEY fehlt)"}: ${eb?.error?.message || ""}`.slice(0, 200) }); }
    const res = await r.json();
    const text = (res.content || []).filter(c => c.type === "text").map(c => c.text).join("");

    // 5) Nutzung zählen (für Limits und echte Kostenzahlen)
    const tin = res.usage?.input_tokens || 0, tout = res.usage?.output_tokens || 0;
    await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/ai_count`, { method: "POST", headers: svc,
      body: JSON.stringify({ p_user: user.id, p_task: `${images.length ? "bilder" : task || "allgemein"}|${model}`, p_in: tin, p_out: tout }) }).catch(() => {});

    // 6) Antwort, bei Bedarf als JSON
    let value;
    if (body.json) { const m = text.match(/[\[{][\s\S]*[\]}]/); try { value = m ? JSON.parse(m[0]) : null; } catch { value = null; } }
    const quota = billMode(env) === "off" ? null : { plan: plan.id, ai: puse.ai + 1, aiLimit: plan.ai, img: puse.img + (images.length ? 1 : 0), imgLimit: plan.img, reset: puse.reset };
    return out(200, { text, value, truncated: res.stop_reason === "max_tokens", quota });
  },
};
