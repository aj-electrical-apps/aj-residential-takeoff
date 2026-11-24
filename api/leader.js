import { whoIs, has } from "../lib/session.js";
import { loadSchedule, saveSchedule, loadMaster, saveMaster } from "../lib/team-store.js";

// The Leadership tab (Jonathan 2026-11-23): "a tab that lets ppl have access to a leadership side of this app that will let
// us do scheduling and adjust a master spread sheet to adjust the parts list. the jobs will have a schedule that they will
// be able to just load times from the bid sheet." Who gets it: positions with "leader", or a person an admin turned it on for.
// GET  ?what=master        anyone signed in: { items, by, saved }  (every estimate prices residential items from it)
// GET                      leaders: { schedule: { jobs, by, saved }, master: { items, by, saved } }
// POST { op: "sched", id, entry }   leaders: one job's schedule (entry null removes it); other jobs are left alone
//      { op: "master", set: { <item id>: { price, labor, material, mins, notes } }, del: [<item id>] }   leaders
const H = { "Cache-Control": "no-store" };
const bad = (error, status = 400) => Response.json({ error }, { status, headers: H });
const isLeader = who => has(who, "leader") || has(who, "admin");
const num = (v, max) => { const n = +v; return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null; };
const day = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "";
const txt = (v, n) => String(v == null ? "" : v).slice(0, n);
function cleanEntry(e) {
  if (!e || typeof e !== "object") return null;
  const phases = (Array.isArray(e.phases) ? e.phases : []).slice(0, 12).map(p => ({
    name: txt(p && p.name, 40) || "Work", start: day(p && p.start), hours: num(p && p.hours, 1e5) || 0,
    crew: Math.max(1, Math.round(num(p && p.crew, 50) || 4)), day: Math.max(1, num(p && p.day, 24) || 10), done: !!(p && p.done),
  }));
  return { phases, note: txt(e.note, 500), lead: txt(e.lead, 40), bidHours: num(e.bidHours, 1e5), loaded: txt(e.loaded, 30) };
}
function cleanItem(o) {
  if (!o || typeof o !== "object") return null;
  const out = {};
  ["price", "labor", "material", "mins"].forEach(k => { const n = num(o[k], 1e6); if (n != null && o[k] !== "" && o[k] != null) out[k] = Math.round(n * 100) / 100; });
  if (typeof o.notes === "string") out.notes = txt(o.notes, 300);
  // parts, one line each: { q, u: "ft" | "ea" | "$", n, c } (wire in feet, boxes and devices each, misc in dollars)
  if (Array.isArray(o.parts)) out.parts = o.parts.slice(0, 20).map(p => {
    if (!p || typeof p !== "object") return null;
    const n = txt(p.n, 60).trim(); if (!n) return null;
    const q = num(p.q, 1e5), c = num(p.c, 1e5), part = { q: q > 0 ? Math.round(q * 100) / 100 : 0, u: ["ft", "ea", "$"].includes(p.u) ? p.u : "ea", n };
    if (c > 0 && part.u !== "$") part.c = Math.round(c * 100) / 100;
    return part;
  }).filter(Boolean);
  return Object.keys(out).length ? out : null;
}
const view = s => ({ by: (s.data && s.data.by) || "", saved: s.saved || null });
export async function GET(request) {
  try {
    const who = await whoIs(request);
    if (!who) return bad("Please sign in again.", 401);
    const q = new URL(request.url).searchParams, m = await loadMaster();
    const master = { items: (m.data && m.data.items) || {}, ...view(m) };
    if (q.get("what") === "master") return Response.json(master, { headers: H });
    if (!isLeader(who)) return bad("Ask an admin to turn on the Leadership tab for you.", 403);
    const s = await loadSchedule();
    return Response.json({ schedule: { jobs: (s.data && s.data.jobs) || {}, ...view(s) }, master }, { headers: H });
  } catch (e) { return bad(e.message, 500); }
}
export async function POST(request) {
  try {
    const who = await whoIs(request);
    if (!isLeader(who)) return bad("Ask an admin to turn on the Leadership tab for you.", 403);
    const b = await request.json().catch(() => ({})), by = txt(who.n, 30), at = new Date().toISOString();
    if (b.op === "sched") {
      if (typeof b.id !== "string" || !/^[\w-]{1,80}$/.test(b.id)) return bad("Bad job.");
      const s = await loadSchedule(), jobs = { ...((s.data && s.data.jobs) || {}) };
      const e = cleanEntry(b.entry);
      if (e) jobs[b.id] = { ...e, by, at }; else delete jobs[b.id];
      if (JSON.stringify(jobs).length > 4e6) return bad("The schedule is too big.");
      await saveSchedule(jobs, by);
      return Response.json({ jobs, by, saved: at }, { headers: H });
    }
    if (b.op === "master") {
      const m = await loadMaster(), items = { ...((m.data && m.data.items) || {}) };
      // each item keeps its history (hist: [{ at, ...values }], {} = back to the starting sheet), so a job can be
      // locked at the prices of the day it was last saved (the job's resLock in the app)
      const hist = id => ((items[id] && items[id].hist) || []).slice(-19);
      Object.entries(b.set || {}).forEach(([id, o]) => { if (!/^[\w-]{1,40}$/.test(id)) return; const c = cleanItem(o); items[id] = c ? { ...c, hist: [...hist(id), { at, ...c }] } : { hist: [...hist(id), { at }] }; });
      (Array.isArray(b.del) ? b.del : []).forEach(id => { id = String(id); if (/^[\w-]{1,40}$/.test(id) && items[id]) items[id] = { hist: [...hist(id), { at }] }; });
      await saveMaster(items, by);
      return Response.json({ items, by, saved: at }, { headers: H });
    }
    return bad("Unknown change.");
  } catch (e) { return bad(e.message, 500); }
}
