// Mein Kalender – Worker (wird bei Änderungen in worker/ automatisch von Cloudflare bereitgestellt)
// Mein Kalender – KI-Worker (Cloudflare Worker)
// Nimmt KI-Anfragen der App entgegen, prüft Anmeldung und Tageslimits,
// fragt das Modell und protokolliert die Nutzung. Der API-Schlüssel bleibt hier.
//
// Secrets (wrangler secret put …): ANTHROPIC_KEY, SUPABASE_SERVICE_KEY
// Variablen (wrangler.toml):       SUPABASE_URL, SUPABASE_ANON_KEY, ALLOWED_ORIGINS,
//                                  MODEL_QUICK, MODEL_DEFAULT, DAILY_LIMIT, IMAGE_DAILY_LIMIT,
//                                  GOOGLE_CLIENT_ID  (+ Secret GOOGLE_CLIENT_SECRET für /google/token)

import { vapid, runSchedule, testPush } from "./push.js";
import { trainCheck } from "./train.js";

const MAX_PROMPT = 24000, MAX_IMAGES = 5, MAX_IMAGE_B64 = 2_000_000;

export default {
  // Zeitplan (wrangler.toml → [triggers]): fällige Benachrichtigungen verschicken
  async scheduled(ev, env, ctx) { ctx.waitUntil(runSchedule(env).catch(e => console.log("push", e))); },
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Vary": "Origin",
    };
    const out = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const route = new URL(req.url).pathname;
    if (req.method === "GET" && route === "/push/key") { const v = await vapid(env).catch(() => null); return out(v ? 200 : 503, v ? { key: v.pub } : { code: "no_vapid" }); }
    if (req.method === "GET" && route === "/status") return out(200, { ok: true, version: "2026-11-16g", model: env.MODEL_DEFAULT, quick: env.MODEL_QUICK, keys: { admin: !!env.ADMIN_EMAIL, db: !!(env.DB_CLIENT_ID && env.DB_API_KEY), vapid: !!env.VAPID_JWK, anthropic: !!env.ANTHROPIC_KEY, supabase: !!env.SUPABASE_SERVICE_KEY, google: !!env.GOOGLE_CLIENT_SECRET }, routes: ["/ai", "/google/token", "/account/delete", "/page", "/push/key", "/push/test"] });
    if (req.method !== "POST" || !["/ai", "/google/token", "/account/delete", "/page", "/push/test", "/admin/me", "/admin/stats", "/admin/train"].includes(route)) return out(404, { code: "not_found" });
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
    if (route === "/admin/stats") {
      if (!isAdmin) return out(403, { code: "not_admin" });
      const sv = { apikey: env.SUPABASE_SERVICE_KEY, ...(String(env.SUPABASE_SERVICE_KEY).startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` }) };
      const since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
      const j = async u => { const r = await fetch(u, { headers: sv }); return r.ok ? r.json() : []; };
      const [ai, use, subs, ur] = await Promise.all([
        j(`${env.SUPABASE_URL}/rest/v1/ai_usage?day=gte.${since}&select=user_id,day,task,calls,tok_in,tok_out&limit=20000`),
        j(`${env.SUPABASE_URL}/rest/v1/docs?coll=eq.usage&id=gte.${since}&select=user_id,id,data&limit=20000`),
        j(`${env.SUPABASE_URL}/rest/v1/docs?coll=eq.pushsub&select=user_id&limit=20000`),
        fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: sv }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      ]);
      const users = (ur.users || []).map(u => ({ id: u.id, created: u.created_at, last: u.last_sign_in_at, me: u.id === user.id }));
      return out(200, { at: new Date().toISOString(), models: { quick: env.MODEL_QUICK, default: env.MODEL_DEFAULT }, users, ai, use: use.map(r => ({ u: r.user_id, d: r.id, f: r.data?.f || {} })), push: [...new Set(subs.map(s => s.user_id))].length });
    }
    // Zug-Wächter prüfen (nur Admin, eigene Züge): zeigt Schritt für Schritt, was die Bahn antwortet – ohne Benachrichtigung
    if (route === "/admin/train") {
      if (!isAdmin) return out(403, { code: "not_admin" });
      const sv = { apikey: env.SUPABASE_SERVICE_KEY, ...(String(env.SUPABASE_SERVICE_KEY).startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` }) };
      const rows = await fetch(`${env.SUPABASE_URL}/rest/v1/docs?user_id=eq.${user.id}&coll=eq.push&id=in.(plan,sent)&select=id,data`, { headers: sv }).then(r => r.ok ? r.json() : []);
      const plan = rows.find(r => r.id === "plan")?.data || {}, sent = rows.find(r => r.id === "sent")?.data || {};
      const res = [];
      for (const w of (plan.watch || []).filter(w => Date.parse(w.at) > Date.now() - 30 * 60e3).slice(0, 6)) { const dbg = []; try { const r = await trainCheck(env, w, {}, Date.now(), plan.tz, dbg); res.push({ w, dbg, msgs: r.msgs, state: sent.trains?.[w.id] || null }); } catch (e) { res.push({ w, dbg: [...dbg, "Fehler: " + String(e).slice(0, 120)] }); } }
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
    const today = new Date().toISOString().slice(0, 10);
    const u = await fetch(`${env.SUPABASE_URL}/rest/v1/ai_usage?user_id=eq.${user.id}&day=eq.${today}&select=task,calls`, { headers: svc });
    const rows = u.ok ? await u.json() : [];
    const used = rows.reduce((s, r) => s + r.calls, 0), usedImg = rows.filter(r => String(r.task).startsWith("bilder")).reduce((s, r) => s + r.calls, 0);
    if (used >= +(env.DAILY_LIMIT || 40)) return out(429, { code: "rate_limited", message: "Tageslimit erreicht" });
    if (images.length && usedImg >= +(env.IMAGE_DAILY_LIMIT || 10)) return out(429, { code: "rate_limited", message: "Tageslimit für Bilder erreicht" });

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
    return out(200, { text, value, truncated: res.stop_reason === "max_tokens" });
  },
};
