// =================== Eigene App: Ersatz für die claude.ai-Schnittstellen ===================
// Stellt window.claude.use(...) mit denselben Formen bereit, die der Kalender aus dem Artefakt kennt:
// db (Supabase), user (Supabase-Anmeldung), sample (KI über den Worker), downloads (Datei speichern).
// mcp: Google Kalender direkt über die Google-API (Schlüssel aus der Google-Anmeldung, Erneuerung über den Worker).
window.MK_APP = true;
(() => {
  const CFG = window.MK_CFG;
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  window.mkSupabase = sb;
  let session = null;
  const ready = sb.auth.getSession().then(r => { session = r.data.session; keepGoogle(session); return session; }).catch(() => null);
  // Neu laden nur bei einem echten Wechsel NACH dem Start (z. B. Anmeldung in einem anderen Tab),
  // nie während die Seite selbst die Anmeldung aus der Adresse übernimmt – sonst lädt sie endlos neu.
  let startedWith = undefined;   // undefined = Start läuft noch, sonst: true/false
  ready.then(s => { startedWith = !!s; });
  sb.auth.onAuthStateChange((ev, s) => {
    if (s) { session = s; keepGoogle(s); } else if (ev === "SIGNED_OUT") { session = null; Object.values(GK).forEach(k => lsSet(k, "")); }
    if (startedWith === undefined) return;
    if (ev === "SIGNED_OUT" && startedWith) location.reload();
    if (ev === "SIGNED_IN" && !startedWith && s) location.reload();
  });
  // Eine Anmeldung für beides: Konto + Zugriff auf Google Kalender (Google fragt die Kalender-Rechte einzeln ab)
  const G_SCOPES = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";
  window.mkSignIn = () => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname, scopes: G_SCOPES, queryParams: { access_type: "offline", prompt: "consent" } } });
  window.mkConnectGoogle = () => { try { sessionStorage.setItem("mk-wz-g", "1"); } catch {} return window.mkSignIn(); };
  // Google-Schlüssel aus der Anmeldung merken (nur in diesem Browser)
  const GK = { at: "mk-g-at", exp: "mk-g-exp", rt: "mk-g-rt" };
  const lsGet = k => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
  const lsSet = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };
  const keepGoogle = s => { if (!s?.provider_token) return; lsSet(GK.at, s.provider_token); lsSet(GK.exp, String(Date.now() + 50 * 60e3)); if (s.provider_refresh_token) lsSet(GK.rt, s.provider_refresh_token); };
  window.mkSignOut = async () => { try { await sb.auth.signOut(); } catch {} location.reload(); };

  // ---------- db: Pfade wie im Artefakt auf zwei Tabellen abbilden ----------
  // data/users/<uid>/k/<coll>  → docs   (user_id = ich, coll)
  // out                        → outbox (owner = Dokument-ID, coll = '')
  // out/<owner>/<sub>          → outbox (owner, coll = sub)
  const parse = path => {
    const p = String(path).split("/");
    if (p[0] === "data" && p[1] === "users" && p[3] === "k" && p.length >= 5) return { table: "docs", own: "user_id", owner: p[2], coll: p.slice(4).join("/") };
    if (p[0] === "out" && p.length === 1) return { table: "outbox", own: "owner", owner: null, coll: "" };
    if (p[0] === "out" && p.length === 3) return { table: "outbox", own: "owner", owner: p[1], coll: p[2] };
    throw Object.assign(new Error("Pfad nicht unterstützt: " + path), { code: "invalid_argument" });
  };
  const clone = v => JSON.parse(JSON.stringify(v ?? null));
  const docSnap = (id, data) => ({ id, exists: data != null, data: () => (data == null ? undefined : clone(data)) });
  const err = e => Object.assign(new Error(e?.message || "Speichern fehlgeschlagen"), { code: e?.code === "42501" ? "permission_denied" : "unavailable" });
  let chanN = 0;
  const live = (t, filter, refetch) => {   // Änderungen in der Tabelle → neu laden (gebündelt)
    let timer = null; const kick = () => { clearTimeout(timer); timer = setTimeout(refetch, 120); };
    const ch = sb.channel(`mk-${t.table}-${++chanN}`).on("postgres_changes", { event: "*", schema: "public", table: t.table, ...(filter ? { filter } : {}) }, kick).subscribe();
    return () => { clearTimeout(timer); sb.removeChannel(ch); };
  };

  function collection(path, wheres = []) {
    const t = parse(path);
    const base = () => {
      let q = sb.from(t.table).select("id, data, owner:" + t.own).eq("coll", t.coll);
      if (t.owner) q = q.eq(t.own, t.owner);
      for (const [f, op, v] of wheres) if (op === "==") q = q.eq(`data->>${f}`, String(v));
      return q;
    };
    const fetchAll = async () => {
      const { data, error } = await base(); if (error) throw err(error);
      return { docs: data.map(r => docSnap(t.table === "outbox" && !t.coll ? r.owner : r.id, r.data)) };
    };
    const api = {
      where: (f, op, v) => collection(path, [...wheres, [f, op, v]]),
      get: fetchAll,
      onSnapshot(next, onErr) {
        let off = false; const run = () => fetchAll().then(s => { if (!off) next(s); }).catch(e => { if (!off) onErr?.(e); });
        run(); const stop = live(t, t.owner ? `${t.own}=eq.${t.owner}` : null, run);
        return () => { off = true; stop(); };
      },
      async add(v) { const id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); await api.doc(id).set(v); return { id }; },
      doc(id) {
        const own = t.table === "outbox" && !t.coll ? id : t.owner;   // 'out/<uid>' gehört <uid>
        const key = t.table === "outbox" && !t.coll ? "_" : id;
        const one = () => sb.from(t.table).select("data").eq("coll", t.coll).eq(t.own, own).eq("id", key).maybeSingle();
        const get = async () => { const { data, error } = await one(); if (error) throw err(error); return docSnap(id, data?.data ?? null); };
        const set = async v => { const row = { coll: t.coll, id: key, data: clone(v), updated_at: new Date().toISOString() }; if (own) row[t.own] = own;
          const { error } = await sb.from(t.table).upsert(row, { onConflict: `${t.own},coll,id` }); if (error) throw err(error); };
        return {
          get, set,
          async update(patch) { const cur = (await get()).data() || {}; await set({ ...cur, ...clone(patch) }); },
          async delete() { const { error } = await sb.from(t.table).delete().eq("coll", t.coll).eq(t.own, own).eq("id", key); if (error) throw err(error); },
          onSnapshot(next, onErr) {
            let off = false; const run = () => get().then(s => { if (!off) next(s); }).catch(e => { if (!off) onErr?.(e); });
            run(); const stop = live(t, own ? `${t.own}=eq.${own}` : null, run);
            return () => { off = true; stop(); };
          },
        };
      },
    };
    return api;
  }
  const db = { collection, doc: path => { const p = String(path).split("/"); return collection(p.slice(0, -1).join("/")).doc(p.at(-1)); } };

  // ---------- user ----------
  const user = {
    id: async () => session?.user?.id || null,
    me: async () => ({ id: session?.user?.id || null, name: session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || "", email: session?.user?.email || null, avatar: session?.user?.user_metadata?.avatar_url || null }),
    isOwner: async () => false, canEdit: async () => false, can: async () => true, profiles: async () => ({}), search: async () => [],
  };

  // ---------- sample: KI über den Worker ----------
  const toB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(b); });
  const textOf = input => Array.isArray(input) ? input.map(m => (m.role === "assistant" ? "Assistent: " : "") + m.content).join("\n\n") : String(input);
  async function ask(input, opts = {}, json) {
    const s = session || await ready; if (!s) throw Object.assign(new Error("Nicht angemeldet"), { code: "not_granted" });
    const images = [];
    for (const b of (opts.images || []).slice(0, 5)) images.push({ type: b.type || "image/jpeg", data: await toB64(b) });
    const r = await fetch(CFG.workerUrl + "/ai", { method: "POST", signal: opts.signal,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.access_token },
      body: JSON.stringify({ prompt: textOf(input), tier: opts.modelTier === "quick" ? "quick" : "default", json, images, task: opts.task || "" }) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(body.message || "KI nicht erreichbar"), { code: body.code || "unavailable" });
    opts.onText?.({ text: body.text || "", delta: body.text || "" });
    return body;
  }
  const sample = async (input, opts) => { const b = await ask(input, opts, false); return { text: b.text || "", truncated: !!b.truncated }; };
  sample.json = async (input, opts) => { const b = await ask(input, opts, true); if (b.value == null) throw Object.assign(new Error("Keine gültige Antwort"), { code: "bad_output", text: b.text }); return b.value; };
  sample.limits = async () => ({ tools: {}, images: { maxCount: 5, maxInputBytes: 1_500_000, mediaTypes: ["image/jpeg", "image/png", "image/webp"] } });

  // ---------- downloads ----------
  const downloads = { save: async ({ filename, data }) => {
    const blob = data instanceof Blob ? data : new Blob([data]); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } };

  // ---------- mcp: Google Kalender direkt über die Google-API ----------
  const GAPI = "https://www.googleapis.com/calendar/v3";
  const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";
  const gErr = (code, message) => Object.assign(new Error(message || code), { code });
  let refreshing = null;
  async function gToken(force) {
    if (!force && lsGet(GK.at) && +lsGet(GK.exp) > Date.now()) return lsGet(GK.at);
    const rt = lsGet(GK.rt); if (!rt) throw gErr("needs_reauth");
    refreshing ??= (async () => {
      const s = session || await ready;
      const r = await fetch(CFG.workerUrl + "/google/token", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + s?.access_token }, body: JSON.stringify({ refresh_token: rt }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok || !b.access_token) { if (b.code === "invalid_grant") lsSet(GK.rt, ""); throw gErr(b.code === "invalid_grant" ? "needs_reauth" : "upstream_error"); }
      lsSet(GK.at, b.access_token); lsSet(GK.exp, String(Date.now() + Math.max(60, (b.expires_in || 3600) - 300) * 1000)); return b.access_token;
    })().finally(() => { refreshing = null; });
    return refreshing;
  }
  async function gFetch(path, { method = "GET", body, signal } = {}, retry = true) {
    let r;
    try { r = await fetch(GAPI + path, { method, signal, headers: { Authorization: "Bearer " + await gToken(), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { if (e?.code) throw e; throw gErr("upstream_error"); }
    if (r.status === 401 && retry) { lsSet(GK.exp, "0"); await gToken(true); return gFetch(path, { method, body, signal }, false); }
    if (r.status === 204) return {};
    const b = await r.json().catch(() => ({}));
    if (r.status === 401 || (r.status === 403 && /insufficient|scope|PERMISSION/i.test(JSON.stringify(b)))) throw gErr("needs_reauth");
    if (r.status === 429 || r.status >= 500) throw gErr("upstream_error");
    if (!r.ok) throw gErr("tool_error", b?.error?.message);
    return b;
  }
  const rfc = local => new Date(local).toISOString();                       // "2026-11-20T00:00:00" (Ortszeit) → UTC
  const cal = i => encodeURIComponent(i?.calendarId || "primary");
  const when = (i, k) => i.allDay ? { date: String(i[k]).slice(0, 10) } : { dateTime: i[k], timeZone: TZ };
  const evBody = (i, partial) => { const b = {};
    if (i.summary != null) b.summary = i.summary; if (i.description != null) b.description = i.description; if (i.location != null) b.location = i.location;
    if (i.startTime) b.start = when(i, "startTime"); if (i.endTime) b.end = when(i, "endTime");
    if (i.recurrenceData) b.recurrence = i.recurrenceData; return b; };
  const TOOLS = {
    async list_calendars() { const b = await gFetch("/users/me/calendarList?maxResults=250");
      return { calendars: (b.items || []).map(c => ({ id: c.id, summary: c.summaryOverride || c.summary || c.id, primary: !!c.primary, accessRole: c.accessRole, backgroundColor: c.backgroundColor })) }; },
    async list_events(i, signal) { const q = new URLSearchParams({ singleEvents: "true", maxResults: String(Math.min(2500, i.pageSize || 250)) });
      if (i.startTime) q.set("timeMin", rfc(i.startTime)); if (i.endTime) q.set("timeMax", rfc(i.endTime));
      if (i.orderBy === "startTime") q.set("orderBy", "startTime"); if (i.pageToken) q.set("pageToken", i.pageToken); if (i.query) q.set("q", i.query);
      (i.eventType || []).forEach(t => q.append("eventTypes", String(t).toLowerCase()));
      const b = await gFetch(`/calendars/${cal(i)}/events?${q}`, { signal });
      return { events: b.items || [], nextPageToken: b.nextPageToken || "", summary: b.summary || "" }; },
    async create_event(i) { return gFetch(`/calendars/${cal(i)}/events?sendUpdates=none`, { method: "POST", body: evBody(i) }); },
    async update_event(i) { return gFetch(`/calendars/${cal(i)}/events/${encodeURIComponent(i.eventId)}?sendUpdates=none`, { method: "PATCH", body: evBody(i, true) }); },
    async delete_event(i) { return gFetch(`/calendars/${cal(i)}/events/${encodeURIComponent(i.eventId)}?sendUpdates=none`, { method: "DELETE" }); },
  };
  const CACHE = new Map();                                                   // tool|input → { t, v }
  async function callTool(_server, tool, input = {}, opts = {}) {
    const fn = TOOLS[tool]; if (!fn) throw gErr("not_in_manifest");
    const key = tool + "|" + JSON.stringify(input), st = opts.cache?.staleTime || 0, hit = CACHE.get(key);
    if (st && hit && Date.now() - hit.t < st) return { payload: hit.v, cache: { storedAt: hit.t } };
    const v = await fn(input, opts.signal);
    if (/^list_/.test(tool)) CACHE.set(key, { t: Date.now(), v }); else [...CACHE.keys()].forEach(k => k.startsWith("list_events|") && CACHE.delete(k));
    return { payload: v };
  }
  const mcp = {
    callTool,
    invalidate: async (_s, tool) => { [...CACHE.keys()].forEach(k => (!tool || k.startsWith(tool + "|")) && CACHE.delete(k)); },
    watchTool(server, tool, input, handler, opts = {}) {
      let off = false; const run = () => callTool(server, tool, input, opts).then(r => !off && handler({ type: "data", result: r })).catch(e => !off && handler({ type: "error", error: { code: e?.code || "upstream_error" } }));
      run(); const iv = opts.refetchInterval ? setInterval(() => { if (!document.hidden) { CACHE.delete(tool + "|" + JSON.stringify(input)); run(); } }, opts.refetchInterval) : null;
      return () => { off = true; clearInterval(iv); };
    },
    listTools: async () => [{ server: "Google Calendar", tools: Object.keys(TOOLS) }],
  };

  window.claude = { use: async name => {
    const s = await ready;
    if (name === "db") return s ? db : null;
    if (name === "user") return s ? user : null;
    if (name === "sample") return s && CFG.workerUrl ? sample : null;
    if (name === "downloads") return downloads;
    if (name === "mcp") return s && CFG.workerUrl ? mcp : null;
    return null;
  } };
})();
