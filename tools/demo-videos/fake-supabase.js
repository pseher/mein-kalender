// Minimaler Supabase-Ersatz für Tests: Tabellen im Speicher, Ketten-Abfragen, Realtime-Kanäle
window.__sbdb = { docs: [{ user_id: "9999", coll: "prefs", id: "profile", data: { setupDone: true, state: "BE", gcalAsked: true, gcalSel: ["primary"] } }], outbox: [] }; window.__sblog = [];
window.supabase = { createClient: () => {
  const chans = new Set(); const S = JSON.parse(sessionStorage.getItem("fake-session") || "null");
  const fire = table => chans.forEach(c => c.table === table && c.cb());
  const q = (table) => { const f = []; let mode = "select", payload = null, single = false;
    const api = { select() { return api; }, eq(k, v) { f.push([k, v]); return api; }, maybeSingle() { single = true; return api; },
      upsert(row) { mode = "upsert"; payload = row; return api; }, delete() { mode = "delete"; return api; },
      then(res, rej) { try {
        const T = window.__sbdb[table], key = table === "docs" ? "user_id" : "owner";
        const match = r => f.every(([k, v]) => k.startsWith("data->>") ? String(r.data?.[k.slice(7)]) === v : String(r[k]) === String(v));
        let out;
        if (mode === "upsert") { const i = T.findIndex(r => r[key] === payload[key] && r.coll === payload.coll && r.id === payload.id); if (i >= 0) T[i] = payload; else T.push(payload); window.__sblog.push("upsert " + table + " " + payload.coll + "/" + payload.id); setTimeout(() => fire(table)); out = { error: null }; }
        else if (mode === "delete") { const n = T.length; for (let i = T.length - 1; i >= 0; i--) if (match(T[i])) T.splice(i, 1); setTimeout(() => fire(table)); out = { error: null, n: n - T.length }; }
        else { const rows = T.filter(match).map(r => ({ id: r.id, data: JSON.parse(JSON.stringify(r.data)), owner: r[key] })); out = { data: single ? (rows[0] || null) : rows, error: null }; }
        res(out); } catch (e) { rej(e); } } };
    return api; };
  return {
    auth: { getSession: async () => ({ data: { session: S } }), onAuthStateChange: cb => { setTimeout(() => { cb("INITIAL_SESSION", S); cb("SIGNED_IN", S); }, 0); setTimeout(() => cb("SIGNED_IN", S), 600); return { data: { subscription: { unsubscribe() {} } } }; }, signInWithOAuth: async o => { window.__sblog.push("oauth " + o.provider); }, signOut: async () => sessionStorage.removeItem("fake-session") },
    from: q,
    channel: () => { const c = { on: (_e, o, cb) => { c.table = o.table; c.cb = cb; return c; }, subscribe: () => { chans.add(c); return c; } }; return c; },
    removeChannel: c => chans.delete(c),
  }; } };
