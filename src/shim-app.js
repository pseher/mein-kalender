// =================== Eigene App: Ersatz für die claude.ai-Schnittstellen ===================
// Stellt window.claude.use(...) mit denselben Formen bereit, die der Kalender aus dem Artefakt kennt:
// db (Supabase), user (Supabase-Anmeldung), sample (KI über den Worker), downloads (Datei speichern).
// Google Kalender (mcp) folgt in Phase 3 – bis dahin null.
window.MK_APP = true;
(() => {
  const CFG = window.MK_CFG;
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  window.mkSupabase = sb;
  let session = null;
  const ready = sb.auth.getSession().then(r => { session = r.data.session; return session; }).catch(() => null);
  // Neu laden nur bei einem echten Wechsel NACH dem Start (z. B. Anmeldung in einem anderen Tab),
  // nie während die Seite selbst die Anmeldung aus der Adresse übernimmt – sonst lädt sie endlos neu.
  let startedWith = undefined;   // undefined = Start läuft noch, sonst: true/false
  ready.then(s => { startedWith = !!s; });
  sb.auth.onAuthStateChange((ev, s) => {
    if (s) session = s; else if (ev === "SIGNED_OUT") session = null;
    if (startedWith === undefined) return;
    if (ev === "SIGNED_OUT" && startedWith) location.reload();
    if (ev === "SIGNED_IN" && !startedWith && s) location.reload();
  });
  window.mkSignIn = () => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
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

  window.claude = { use: async name => {
    const s = await ready;
    if (name === "db") return s ? db : null;
    if (name === "user") return s ? user : null;
    if (name === "sample") return s && CFG.workerUrl ? sample : null;
    if (name === "downloads") return downloads;
    return null;   // mcp (Google Kalender) folgt in Phase 3
  } };
})();
