// Dokumente (Tickets, Buchungen, PDFs) in Cloudflare R2 – je Nutzer ein eigener Ordner "<user-id>/".
// Bindung in wrangler.toml: [[r2_buckets]] binding = "DOCS". Fehlt sie, antwortet die App-Schnittstelle mit 501
// und die App speichert wie bisher in der Datenbank.
import { resolvePlan, PLAN_BASE } from "./billing.js";

const MAX_FILE = 6_000_000;                       // 6 MB je Datei (die App verkleinert vorher auf ≤ 5 MB)
const TYPES = /^(application\/pdf|image\/(jpeg|png|webp|gif|heic|heif))$/;
const ID_RE = /^[A-Za-z0-9_-]{4,48}$/;

// Speicher je Tarif in MB – überschreibbar mit FILES_MB_JSON, z. B. {"free":100,"plus":2000,"family":2000}
export function filesLimitMb(env, planId) {
  let x = {}; try { x = JSON.parse(env.FILES_MB_JSON || "{}"); } catch {}
  return +(x[planId] ?? PLAN_BASE[planId]?.mb ?? PLAN_BASE.free.mb ?? 100);
}

export async function usageBytes(env, uid) {
  let used = 0, n = 0, cursor;
  do { const l = await env.DOCS.list({ prefix: uid + "/", cursor, limit: 1000 }); for (const o of l.objects) { used += o.size; n++; } cursor = l.truncated ? l.cursor : undefined; } while (cursor);
  return { used, n };
}

export async function deleteUserFiles(env, uid) {
  if (!env.DOCS || !uid) return 0;
  let gone = 0, cursor;
  do { const l = await env.DOCS.list({ prefix: uid + "/", cursor, limit: 1000 }); const keys = l.objects.map(o => o.key); if (keys.length) { await env.DOCS.delete(keys); gone += keys.length; } cursor = l.truncated ? l.cursor : undefined; } while (cursor);
  return gone;
}

export async function filesRoute(req, env, route, cors, allowed, origin) {
  const H = { ...cors, "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS" };
  const out = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...H, "Content-Type": "application/json" } });
  if (allowed.length && !allowed.includes(origin)) return out(403, { code: "origin" });
  if (!env.DOCS) return out(501, { code: "no_storage" });
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return out(401, { code: "not_signed_in" });
  const who = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth } });
  if (!who.ok) return out(401, { code: "not_signed_in" });
  const user = await who.json(), uid = user.id;

  // Belegung abfragen
  if (route === "/files") {
    const [{ used, n }, rp] = await Promise.all([usageBytes(env, uid), resolvePlan(env, user).catch(() => ({ id: "free" }))]);
    return out(200, { used, n, limit: filesLimitMb(env, rp?.id || "free") * 1e6, plan: rp?.id || "free" });
  }
  const id = route.slice("/files/".length);
  if (!ID_RE.test(id)) return out(400, { code: "bad_id" });
  const key = `${uid}/${id}`;

  if (req.method === "GET") {
    const o = await env.DOCS.get(key);
    if (!o) return out(404, { code: "not_found" });
    return new Response(o.body, { headers: { ...H, "Content-Type": o.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": "private, max-age=31536000, immutable" } });
  }
  if (req.method === "DELETE") { await env.DOCS.delete(key); return out(200, { ok: true }); }
  if (req.method === "PUT") {
    const type = (req.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
    if (!TYPES.test(type)) return out(415, { code: "bad_type" });
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return out(400, { code: "empty" });
    if (buf.byteLength > MAX_FILE) return out(413, { code: "too_big", max: MAX_FILE });
    const [{ used }, rp] = await Promise.all([usageBytes(env, uid), resolvePlan(env, user).catch(() => ({ id: "free" }))]);
    const limit = filesLimitMb(env, rp?.id || "free") * 1e6, old = await env.DOCS.head(key);
    if (used - (old?.size || 0) + buf.byteLength > limit) return out(413, { code: "quota", used, limit });
    await env.DOCS.put(key, buf, { httpMetadata: { contentType: type } });
    return out(200, { ok: true, size: buf.byteLength, used: used - (old?.size || 0) + buf.byteLength, limit });
  }
  return out(405, { code: "method" });
}
