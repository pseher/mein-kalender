// Mein Kalender – KI-Worker (Cloudflare Worker)
// Nimmt KI-Anfragen der App entgegen, prüft Anmeldung und Tageslimits,
// fragt das Modell und protokolliert die Nutzung. Der API-Schlüssel bleibt hier.
//
// Secrets (wrangler secret put …): ANTHROPIC_KEY, SUPABASE_SERVICE_KEY
// Variablen (wrangler.toml):       SUPABASE_URL, SUPABASE_ANON_KEY, ALLOWED_ORIGINS,
//                                  MODEL_QUICK, MODEL_DEFAULT, DAILY_LIMIT, IMAGE_DAILY_LIMIT,
//                                  GOOGLE_CLIENT_ID  (+ Secret GOOGLE_CLIENT_SECRET für /google/token)

const MAX_PROMPT = 24000, MAX_IMAGES = 5, MAX_IMAGE_B64 = 2_000_000;

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Vary": "Origin",
    };
    const out = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const route = new URL(req.url).pathname;
    if (req.method !== "POST" || !["/ai", "/google/token"].includes(route)) return out(404, { code: "not_found" });
    if (allowed.length && !allowed.includes(origin)) return out(403, { code: "origin" });

    // 1) Wer fragt? (Supabase-Anmeldung prüfen)
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return out(401, { code: "not_signed_in" });
    const who = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth } });
    if (!who.ok) return out(401, { code: "not_signed_in" });
    const user = await who.json();

    // Google-Zugriffsschlüssel erneuern (der Clientschlüssel bleibt hier; nichts wird gespeichert)
    if (route === "/google/token") {
      let rt = ""; try { rt = String((await req.json()).refresh_token || ""); } catch {}
      if (!rt) return out(400, { code: "bad_request" });
      const g = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: rt, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET }) });
      const gb = await g.json().catch(() => ({}));
      if (!g.ok) return out(g.status === 400 ? 401 : 502, { code: gb.error === "invalid_grant" ? "invalid_grant" : "google_error" });
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
    const used = rows.reduce((s, r) => s + r.calls, 0), usedImg = rows.filter(r => r.task === "bilder").reduce((s, r) => s + r.calls, 0);
    if (used >= +(env.DAILY_LIMIT || 40)) return out(429, { code: "rate_limited", message: "Tageslimit erreicht" });
    if (images.length && usedImg >= +(env.IMAGE_DAILY_LIMIT || 10)) return out(429, { code: "rate_limited", message: "Tageslimit für Bilder erreicht" });

    // 4) Modell fragen
    const model = tier === "quick" ? env.MODEL_QUICK : env.MODEL_DEFAULT;
    const content = [...images.map(i => ({ type: "image", source: { type: "base64", media_type: i.type, data: i.data } })), { type: "text", text: prompt }];
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: "user", content }] }),
    });
    if (!r.ok) return out(502, { code: r.status === 429 ? "rate_limited" : "ai_error" });
    const res = await r.json();
    const text = (res.content || []).filter(c => c.type === "text").map(c => c.text).join("");

    // 5) Nutzung zählen (für Limits und echte Kostenzahlen)
    const tin = res.usage?.input_tokens || 0, tout = res.usage?.output_tokens || 0;
    await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/ai_count`, { method: "POST", headers: svc,
      body: JSON.stringify({ p_user: user.id, p_task: images.length ? "bilder" : task, p_in: tin, p_out: tout }) }).catch(() => {});

    // 6) Antwort, bei Bedarf als JSON
    let value;
    if (body.json) { const m = text.match(/[\[{][\s\S]*[\]}]/); try { value = m ? JSON.parse(m[0]) : null; } catch { value = null; } }
    return out(200, { text, value, truncated: res.stop_reason === "max_tokens" });
  },
};
