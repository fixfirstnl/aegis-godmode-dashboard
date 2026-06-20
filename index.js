export default {
  async fetch(request, env, ctx) {
    const db = env.DB;
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE, PATCH",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
    const err = (msg, status = 400) => json({ ok: false, error: msg, status }, status);
    const q = () => { const r = {}; for (const [k, v] of url.searchParams) r[k] = v; return r; };

    try {
      if (path === "/api/health" && method === "GET") {
        return json({ ok: true, status: "ok", version: "2.20.0", service: "aegis-godmode-api", timestamp: Date.now(), d1: "connected" });
      }
      if (path === "/api/terminals" && method === "GET") {
        const { results } = await db.prepare("SELECT * FROM terminals ORDER BY id").all();
        return json({ ok: true, terminals: results || [] });
      }
      if (path === "/api/terminals/overview" && method === "GET") {
        const { results } = await db.prepare("SELECT * FROM terminals ORDER BY id").all();
        const t = results || [];
        return json({ ok: true, summary: { count: t.length, total_balance: t.reduce((s, x) => s + (x.balance || 0), 0), total_equity: t.reduce((s, x) => s + (x.equity || 0), 0), total_profit: t.reduce((s, x) => s + (x.profit || 0), 0), total_positions: t.reduce((s, x) => s + (x.positions || 0), 0), connected_count: t.filter(x => x.connected).length, total_terminals: t.length }, terminals: t });
      }
      if (path === "/api/connect" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const i = b.index !== undefined ? parseInt(b.index) : 0;
        const { results } = await db.prepare("SELECT * FROM terminals ORDER BY id LIMIT 1 OFFSET ?").bind(i).all();
        if (!results || !results.length) return err("Terminal not found", 404);
        return json({ ok: true, terminal: results[0], connected: true });
      }
      if (path === "/api/data" && method === "GET") {
        const { results: terminals } = await db.prepare("SELECT * FROM terminals WHERE connected = 1").all();
        const account = terminals && terminals[0] ? terminals[0] : null;
        return json({ ok: true, account, positions: [], terminal: account });
      }
      if (path === "/api/history/equity" && method === "GET") {
        const p = q();
        const term = p.terminal || "%";
        const hours = parseInt(p.hours) || 24;
        const since = Math.floor(Date.now() / 1000) - (hours * 3600);
        const { results } = await db.prepare("SELECT * FROM equity_history WHERE terminal_name LIKE ? AND timestamp >= ? ORDER BY timestamp DESC").bind(term, since).all();
        return json({ ok: true, terminal: p.terminal || "all", hours, history: results || [] });
      }
      if (path === "/api/position/close" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        if (!b.ticket) return err("ticket is required");
        await db.prepare("UPDATE trades SET status = 'closed', closed_at = ? WHERE ticket = ?").bind(Math.floor(Date.now()/1000), b.ticket).run();
        return json({ ok: true, success: true, ticket: b.ticket, reason: b.reason || "manual", action: "close" });
      }
      if (path === "/api/position/closeall" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        await db.prepare("UPDATE trades SET status = 'closed', closed_at = ? WHERE status = 'open'").bind(Math.floor(Date.now()/1000)).run();
        return json({ ok: true, success: true, reason: b.reason || "manual", action: "closeall" });
      }
      if (path === "/api/alerts/config" && method === "GET") {
        const { results } = await db.prepare("SELECT * FROM alerts_config ORDER BY id").all();
        const mapped = (results || []).map(r => ({ type: r.type, threshold: r.threshold, enabled: r.enabled === 1, telegram: r.telegram === 1, sound: r.sound === 1, flash: r.flash === 1 }));
        return json({ ok: true, config: mapped });
      }
      if (path === "/api/alerts/config" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const c = b.config || [];
        const u = [];
        for (const x of c) {
          if (!x.type) continue;
          await db.prepare("INSERT INTO alerts_config (type, threshold, enabled, telegram, sound, flash) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(type) DO UPDATE SET threshold=excluded.threshold, enabled=excluded.enabled, telegram=excluded.telegram, sound=excluded.sound, flash=excluded.flash").bind(x.type, x.threshold || 0, x.enabled !== undefined ? (x.enabled ? 1 : 0) : 1, x.telegram !== undefined ? (x.telegram ? 1 : 0) : 0, x.sound !== undefined ? (x.sound ? 1 : 0) : 0, x.flash !== undefined ? (x.flash ? 1 : 0) : 0).run();
          u.push(x.type);
        }
        return json({ ok: true, success: true, updated: u });
      }
      if (path === "/api/alerts/history" && method === "GET") {
        const p = q();
        const lim = parseInt(p.limit) || 50;
        const { results } = await db.prepare("SELECT * FROM alerts_history ORDER BY timestamp DESC LIMIT ?").bind(lim).all();
        return json({ ok: true, alerts: results || [] });
      }
      if (path === "/api/logs" && method === "GET") {
        const p = q();
        const lev = (p.level || "").toUpperCase();
        const lim = parseInt(p.limit) || 100;
        let sql = "SELECT * FROM logs";
        const params = [];
        if (lev && lev !== "ALL") { sql += " WHERE level = ?"; params.push(lev); }
        sql += " ORDER BY id DESC LIMIT ?";
        params.push(lim);
        const { results } = await db.prepare(sql).bind(...params).all();
        return json({ ok: true, entries: results || [] });
      }
      if (path === "/api/logs/download" && method === "GET") {
        const p = q();
        const fmt = (p.format || "csv").toLowerCase();
        const { results } = await db.prepare("SELECT * FROM logs ORDER BY id DESC").all();
        const logs = results || [];
        if (fmt === "csv") {
          const rows = logs.map(r => [r.id, r.timestamp, r.level, r.message, r.created_at].join(","));
          const csv = "id,timestamp,level,message,created_at\n" + rows.join("\n");
          return new Response(csv, { status: 200, headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=aegis-logs.csv", ...cors } });
        }
        return json({ ok: true, logs });
      }
      if (path === "/api/config" && method === "GET") {
        const { results } = await db.prepare("SELECT * FROM config ORDER BY key").all();
        const m = {};
        (results || []).forEach(r => m[r.key] = r.value);
        return json({ ok: true, config: m });
      }
      if (path === "/api/config" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const u = [];
        for (const [k, v] of Object.entries(b)) {
          await db.prepare("INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(k, String(v)).run();
          u.push(k);
        }
        return json({ ok: true, success: true, updated: u });
      }
      if (path === "/api/calendar" && method === "GET") {
        const now = Date.now();
        return json({ ok: true, events: [{ id: 1, time: "08:30", currency: "USD", title: "Non-Farm Payrolls", impact: "high", forecast: "185K", actual: "210K", previous: "190K", timestamp: now - 3600000 }, { id: 2, time: "10:00", currency: "EUR", title: "ECB Interest Rate Decision", impact: "high", forecast: "4.25%", actual: "4.25%", previous: "4.50%", timestamp: now + 7200000 }, { id: 3, time: "14:00", currency: "GBP", title: "UK GDP QoQ", impact: "medium", forecast: "0.3%", actual: null, previous: "0.2%", timestamp: now + 18000000 }, { id: 4, time: "16:30", currency: "USD", title: "FOMC Meeting Minutes", impact: "high", forecast: null, actual: null, previous: null, timestamp: now + 28800000 }, { id: 5, time: "20:00", currency: "JPY", title: "Tokyo CPI", impact: "low", forecast: "2.8%", actual: null, previous: "2.7%", timestamp: now + 36000000 }] });
      }
      if (path === "/api/telegram/test" && method === "POST") {
        return json({ ok: true, success: true, status: "ok", message: "Telegram test message sent (simulated)" });
      }
      if (path === "/api/trades" && method === "GET") { const { results } = await db.prepare("SELECT * FROM trades ORDER BY id DESC LIMIT 50").all(); return json({ ok: true, trades: results || [] }); }
      if (path === "/api/signals" && method === "GET") { const { results } = await db.prepare("SELECT * FROM signals ORDER BY id DESC LIMIT 50").all(); return json({ ok: true, signals: results || [] }); }
      if (path === "/api/metrics" && method === "GET") { const { results } = await db.prepare("SELECT * FROM metrics ORDER BY id DESC LIMIT 50").all(); return json({ ok: true, metrics: results || [] }); }
      return err("Not Found", 404);
    } catch (e) {
      console.error("Worker error:", e);
      return err(e.message || "Internal Server Error", 500);
    }
  }
};
