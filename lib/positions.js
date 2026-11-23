// Positions and what each one can do (Jonathan 2026-10-30: "a full admin page so I can pick what access each position has").
// The Admin page edits the list; it's saved with the people in team/admin/users-*.json. Admin always has everything.
export const PERMS = [
  ["edit", "Change the estimate", "Counts, runs, office mark-ups, sheets, new jobs"],
  ["cost", "Prices, bid sheet and proposal", "Total cost and every dollar amount"],
  ["hours", "Man hours by category", "Hours allotted to each part of the job, no dollars"],
  ["tracker", "Bid tracker", ""],
  ["lists", "Parts lists and labor rates", "Changes wait for an admin's OK"],
  ["counts", "Count sheet, supplier sheet and underground", ""],
  ["order", "Order page", "Material order from the drawings"],
  ["marks", "Their own mark-ups", "Office mark-ups show faded, and they can hide them"],
  ["scale", "Measure and set the scale", "Their scale is used only where the office hasn't set one"],
  ["notesdel", "Delete sent messages", "Remove a Highlight & send message after it's sent (like the COO and CEO)"],
  ["pins", "Turn location pins green", "Mark a pin done once it's laid out in the field (the mark-up crew)"],
  ["install", "Mark items installed", "Turn lights, receptacles and runs green as the crew installs them (the crew lead)"],
  ["subs", "Add subcontractors", "Give a sub a password and pick which jobs they see"],
  ["crew", "Manage their crew's sign-ins", "Add their own foremen and electricians and change their passwords"],
];
export const ALL = PERMS.map(p => p[0]);
export const DEFAULT_POSITIONS = [
  { key: "admin", name: "Admin", perms: ALL },
  { key: "estimator", name: "Estimator", perms: ALL },
  { key: "pm", name: "Project manager", perms: ["cost", "hours", "tracker", "lists", "counts", "order", "marks", "scale", "subs", "crew"] },
  { key: "super", name: "Superintendent", perms: ["hours", "counts", "order", "marks", "scale", "install"] },
  { key: "foreman", name: "Foreman", perms: ["marks", "scale", "install"] },
  // a PM's crew (Jonathan 2026-11-23): the PM gives their foremen and electricians their sign-ins
  { key: "electrician", name: "Electrician", perms: ["marks"] },
  // subs see only the jobs a PM shares with them (Jonathan 2026-10-30)
  { key: "sub", name: "Subcontractor", perms: ["marks"] },
];
export const SUB = "sub";
// the positions a PM can give sign-ins to (their crew); see api/crew.js
export const CREW = ["foreman", "electrician"];
const LEGACY = { office: "estimator", field: "super" };
export const roleKey = r => LEGACY[r] || r;
// a permission added after a position was saved starts at that position's default (e.g. "install" for the foreman)
const OLD_KNOWN = ALL.filter(x => x !== "install" && x !== "crew");
function addNew(p) {
  const known = Array.isArray(p.known) ? p.known : OLD_KNOWN, def = DEFAULT_POSITIONS.find(d => d.key === p.key);
  const perms = (p.perms || []).filter(x => ALL.includes(x));
  if (def) def.perms.forEach(x => { if (!known.includes(x) && !perms.includes(x)) perms.push(x); });
  return { key: String(p.key), name: String(p.name || p.key), perms, known: [...ALL] };
}
export function positionsOf(saved) {
  const list = Array.isArray(saved) && saved.length ? saved.map(addNew) : DEFAULT_POSITIONS.map(p => ({ ...p, perms: [...p.perms], known: [...ALL] }));
  const admin = list.find(p => p.key === "admin");
  if (admin) admin.perms = [...ALL]; else list.unshift({ key: "admin", name: "Admin", perms: [...ALL] });
  if (!list.some(p => p.key === SUB)) list.push({ ...DEFAULT_POSITIONS.find(p => p.key === SUB), perms: ["marks"] }); // the PM's sub sign-ins need it
  CREW.forEach(k => { if (!list.some(p => p.key === k)) { const d = DEFAULT_POSITIONS.find(p => p.key === k); list.push({ ...d, perms: [...d.perms], known: [...ALL] }); } }); // and so does their crew
  return list;
}
// what a role can do: admin gets "admin" too
export function permsFor(positions, role) {
  const k = roleKey(role);
  if (k === "admin") return [...ALL, "admin"];
  const p = positionsOf(positions).find(x => x.key === k);
  return p ? [...p.perms] : [];
}
