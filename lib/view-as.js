import { isPerson, roleKey, permsFor } from "./session.js";
// "View as" (Jonathan 2026-11-22, the same idea as the Leadership app's): an admin picks someone on the Admin page's
// list, or just a position, and the app shows exactly what they see, without signing out. The sign-in cookie then
// carries that person (so the website allows and refuses what it would for them) plus `ra`, the admin really
// signed in, which is the only way back. Saves made while viewing count as the person being viewed.

// The admin really signed in, checked against the Admin page's list (still there, turned on, same password), or null.
export function realAdmin(real, users) {
  if (!real || roleKey(real.r) !== "admin") return null;
  if (!isPerson(real)) return { n: real.n || "Office", r: "admin", id: real.id, v: real.v || 0 };
  const u = users.find(x => x.id === real.id);
  if (!u || u.off || roleKey(u.role) !== "admin" || (u.v || 0) !== (real.v || 0)) return null;
  return { n: u.name, r: "admin", id: u.id, v: u.v || 0 };
}
export const realOf = who => (who && who.ra) || who;
// Position views (nobody in particular) use id "view"; a person view uses that person's id.
export const VIEW_ID = "view";
export function asPerson(u, real, positions) {
  const r = roleKey(u.role);
  return { n: u.name, r, id: u.id, v: u.v || 0, p: permsFor(positions, r).join(","), ra: real };
}
export function asPosition(pos, real, positions) {
  return { n: `${real.n} (as ${pos.name})`, r: pos.key, id: VIEW_ID, v: 0, p: permsFor(positions, pos.key).join(","), ra: real };
}
// What the dropdown offers: every person who is turned on (but the admin themself), then every position.
export function viewList(users, positions, real) {
  const posName = k => (positions.find(p => p.key === k) || {}).name || k;
  const people = users.filter(u => !u.off && u.id !== real.id)
    .map(u => ({ id: "u:" + u.id, name: u.company ? `${u.name} (${u.company})` : u.name, position: posName(roleKey(u.role)) }))
    .sort((a, b) => a.position.localeCompare(b.position) || a.name.localeCompare(b.name));
  // a sub sees only the jobs shared with them, so a sub is picked by name, not as a position
  const roles = positions.filter(p => p.key !== "admin" && p.key !== "sub").map(p => ({ id: "p:" + p.key, name: `Any ${p.name}`, position: "Positions" }));
  return [...people, ...roles];
}
