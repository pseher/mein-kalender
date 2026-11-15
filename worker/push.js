// Mein Kalender – Web-Push (RFC 8291 aes128gcm + VAPID RFC 8292), nur WebCrypto, keine Pakete
import { trainCheck } from "./train.js";
const enc = new TextEncoder();
export const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64u = s => { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const cat = (...a) => { const n = a.reduce((s, x) => s + x.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

// VAPID-Schlüssel aus dem Secret VAPID_JWK (privater P-256-Schlüssel als JWK mit x, y, d)
let VK = null;
export async function vapid(env) {
  if (VK) return VK;
  if (!env.VAPID_JWK) return null;
  const jwk = JSON.parse(env.VAPID_JWK);
  const key = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y, d: jwk.d, ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const pub = b64u(cat(new Uint8Array([4]), unb64u(jwk.x), unb64u(jwk.y)));
  VK = { key, pub }; return VK;
}
async function vapidAuth(env, endpoint) {
  const v = await vapid(env), aud = new URL(endpoint).origin;
  const h = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const c = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || "mailto:kontakt@herdzeit.de" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, v.key, enc.encode(`${h}.${c}`));
  return `vapid t=${h}.${c}.${b64u(sig)}, k=${v.pub}`;
}
const hkdf = async (salt, ikm, info, bytes) => new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info },
  await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), bytes * 8));
async function encrypt(sub, payload) {
  const ua = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(auth, shared, cat(enc.encode("WebPush: info\0"), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, cat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);   // 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
// Eine Nachricht an ein Abo schicken. Ergebnis: HTTP-Status (201 ok, 404/410 = Abo ungültig)
export async function sendPush(env, sub, msg) {
  const body = await encrypt(sub, JSON.stringify(msg));
  const r = await fetch(sub.endpoint, { method: "POST", body, headers: {
    Authorization: await vapidAuth(env, sub.endpoint), TTL: String(msg.ttl || 6 * 3600), Urgency: msg.urgent ? "high" : "normal",
    "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream" } }).catch(() => ({ status: 0 }));
  return r.status;
}

// ---- Zeitplan: alle paar Minuten fällige Nachrichten verschicken ----
const svcH = env => ({ apikey: env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json", ...(String(env.SUPABASE_SERVICE_KEY).startsWith("sb_") ? {} : { Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` }) });
const rest = (env, path, init = {}) => fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...svcH(env), ...(init.headers || {}) } });
const getDocs = async (env, q) => { const r = await rest(env, `docs?${q}`); return r.ok ? r.json() : []; };
const upsertDoc = (env, user_id, coll, id, data) => rest(env, "docs?on_conflict=user_id,coll,id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id, coll, id, data, updated_at: new Date().toISOString() }) });
const delDoc = (env, user_id, coll, id) => rest(env, `docs?user_id=eq.${user_id}&coll=eq.${coll}&id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });

async function sendToUser(env, uid, subs, msgs) {
  let ok = 0;
  for (const s of subs) for (const m of msgs) {
    const st = await sendPush(env, s.data, m);
    if (st === 404 || st === 410) { await delDoc(env, uid, "pushsub", s.id); break; }
    if (st >= 200 && st < 300) ok++;
  }
  return ok;
}
export async function runSchedule(env) {
  if (!(await vapid(env))) return { skipped: "no VAPID_JWK" };
  const now = Date.now(), subsAll = await getDocs(env, "coll=eq.pushsub&select=user_id,id,data");
  const byUser = new Map(); subsAll.forEach(s => (byUser.get(s.user_id) || byUser.set(s.user_id, []).get(s.user_id)).push(s));
  if (!byUser.size) return { users: 0 };
  const ids = [...byUser.keys()].join(",");
  const plans = await getDocs(env, `coll=eq.push&id=in.(plan,sent)&user_id=in.(${ids})&select=user_id,id,data`);
  const shares = await getDocs(env, `coll=eq.prefs&id=eq.share&user_id=in.(${ids})&select=user_id,data`);
  let sent = 0;
  for (const [uid, subs] of byUser) {
    const plan = plans.find(p => p.user_id === uid && p.id === "plan")?.data || {}, st = plans.find(p => p.user_id === uid && p.id === "sent")?.data || {};
    const done = new Set(st.ids || []), msgs = [], pref = plan.pref || {};
    for (const it of plan.items || []) { const at = Date.parse(it.at); if (at <= now && at > now - 40 * 60e3 && !done.has(it.id)) { msgs.push({ title: it.t, body: it.b || "", tag: it.id, url: it.u || "/app/", route: it.r || "" }); done.add(it.id); } }
    // Geteilte Termine: neue/geänderte Einträge der verbundenen Personen (Inhalt ist verschlüsselt – nur „wer“ und „wie viele“)
    let seen = st.shareSeen || new Date(now - 10 * 60e3).toISOString(), newSeen = seen;
    if (pref.shared !== false) {
      const c = (shares.find(s => s.user_id === uid)?.data?.contacts || []).filter(x => x.uid && x.L);
      if (c.length) {
        const rows = await (await rest(env, `outbox?coll=eq.ev&owner=neq.${uid}&updated_at=gt.${encodeURIComponent(seen)}&data->>l=in.(${c.map(x => x.L).join(",")})&select=owner,updated_at,data&limit=200`)).json().catch(() => []);
        const per = new Map();
        for (const r of Array.isArray(rows) ? rows : []) { if (r.updated_at > newSeen) newSeen = r.updated_at; if (r.data?.o === uid && r.data?.del) continue;
          const who = c.find(x => x.L === r.data?.l)?.name || "Jemand", k = who; const p = per.get(k) || { n: 0, del: 0 }; r.data?.del ? p.del++ : p.n++; per.set(k, p); }
        for (const [who, p] of per) msgs.push({ title: `👥 ${who}`, body: p.n && p.del ? `hat ${p.n} Termin(e) geteilt oder geändert und ${p.del} gelöscht` : p.n ? (p.n === 1 ? "hat einen Termin mit dir geteilt oder geändert" : `hat ${p.n} Termine mit dir geteilt oder geändert`) : (p.del === 1 ? "hat einen geteilten Termin gelöscht" : `hat ${p.del} geteilte Termine gelöscht`), tag: "share-" + who, url: "/app/" });
      }
    }
    // Zug-Wächter: ab 2,5 Std. vorher bis 30 Min. danach alle 5 Minuten nachsehen
    let trains = st.trains || {}, trCh = false;
    if (pref.train !== false) for (const w of (plan.watch || []).slice(0, 4)) { const t = Date.parse(w.at); if (!(now >= t - 150 * 60e3 && now <= t + 30 * 60e3)) continue;
      try { const r = await trainCheck(env, w, trains[w.id] || {}, now, plan.tz); trains = { ...trains, [w.id]: r.state }; trCh = true; (r.msgs || []).forEach(m => msgs.push(m)); } catch {} }
    if (msgs.length) sent += await sendToUser(env, uid, subs, msgs.slice(0, 8));
    if (msgs.length || trCh || newSeen !== seen || !st.shareSeen) {
      const keep = [...done].filter(id => (plan.items || []).some(i => i.id === id)).slice(-400);   // nur noch geplante merken
      const tk = Object.fromEntries(Object.entries(trains).filter(([id]) => (plan.watch || []).some(w => w.id === id)));
      await upsertDoc(env, uid, "push", "sent", { ids: keep, shareSeen: newSeen > seen ? newSeen : seen, trains: tk, at: new Date(now).toISOString() });
    }
  }
  return { users: byUser.size, sent };
}
export async function testPush(env, uid) {
  const subs = await getDocs(env, `user_id=eq.${uid}&coll=eq.pushsub&select=user_id,id,data`);
  if (!subs.length) return { ok: false, code: "no_subscription" };
  const n = await sendToUser(env, uid, subs, [{ title: "🔔 Test von Mein Kalender", body: "So sehen deine Benachrichtigungen aus.", tag: "test", url: "/app/", urgent: true }]);
  return { ok: n > 0, sent: n, devices: subs.length };
}
