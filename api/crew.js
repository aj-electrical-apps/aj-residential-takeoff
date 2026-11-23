import { randomBytes } from "node:crypto";
import { whoIs, has, isPerson, roleKey } from "../lib/session.js";
import { loadTeam, saveUsers, hashPassword, loginOf, publicUser } from "../lib/team-store.js";
import { CREW } from "../lib/positions.js";

// A PM's crew (Jonathan 2026-11-23: "pm needs to assign his foreman and electricians their login and manage their
// passwords, but admin should be able to see them and change passwords"). Anyone whose position has "Manage their
// crew's sign-ins" adds foremen and electricians here; each one is saved with pm = that PM's id, and a PM only ever
// sees and changes their own crew. Admins see every crew on the Admin page (api/admin.js) and can change anything there.
// GET -> { crew, positions: [{ key, name }] }
// POST { op: "add", name, role, lang, password } | { op: "role", id, role } | { op: "reset", id, password }
//      { op: "off", id, off } | { op: "lang", id, lang } | { op: "remove", id }
const H = { "Cache-Control": "no-store" };
const bad = (error, status = 400) => Response.json({ error }, { status, headers: H });
const NO = "Your position can't manage a crew. Ask an admin.";
// the PM, checked against the list (still there, turned on, same password), like the Admin page checks an admin
async function pmOf(request, users) {
  const who = await whoIs(request);
  if (!who || !has(who, "crew") || !isPerson(who)) return null; // a crew belongs to a person, not a shared password
  const u = users.find(x => x.id === who.id);
  if (!u || u.off || (u.v || 0) !== (who.v || 0)) return null;
  return { id: u.id, n: u.name };
}
const answer = (users, positions, pm) => Response.json({
  crew: users.filter(u => u.pm === pm.id && CREW.includes(roleKey(u.role))).map(publicUser),
  positions: CREW.map(k => ({ key: k, name: (positions.find(p => p.key === k) || {}).name || k })),
}, { headers: H });
export async function GET(request) {
  try {
    const { users, positions } = await loadTeam();
    const pm = await pmOf(request, users);
    if (!pm) return bad(NO, 403);
    return answer(users, positions, pm);
  } catch (e) { return bad(e.message, 500); }
}
export async function POST(request) {
  try {
    let { users, positions } = await loadTeam();
    const pm = await pmOf(request, users);
    if (!pm) return bad(NO, 403);
    const b = await request.json().catch(() => ({})), now = new Date().toISOString();
    const pw = p => typeof p === "string" && p.trim().length >= 6;
    const role = r => CREW.includes(r) ? r : null;
    if (b.op === "add") {
      const name = String(b.name || "").trim().replace(/\s+/g, " ").slice(0, 30);
      if (name.length < 2) return bad("Type their name.");
      if (!role(b.role)) return bad("Pick Foreman or Electrician.");
      if (!pw(b.password)) return bad("Use at least 6 characters for the password.");
      if (users.some(u => u.login === loginOf(name))) return bad(`Someone named ${name} is already on the list. Add a last name or initial.`);
      users = users.concat({ id: randomBytes(6).toString("hex"), name, login: loginOf(name), role: b.role, pm: pm.id, lang: b.lang === "es" ? "es" : "en",
        ...hashPassword(b.password.trim()), v: 0, added: now, by: pm.n, changed: now });
    } else {
      // only someone on this PM's own crew
      const u = users.find(x => x.id === b.id && x.pm === pm.id && CREW.includes(roleKey(x.role)));
      if (!u) return bad("That person isn't on your crew anymore.", 404);
      if (b.op === "role") { if (!role(b.role)) return bad("Pick Foreman or Electrician."); Object.assign(u, { role: b.role, changed: now }); }
      else if (b.op === "lang") Object.assign(u, { lang: b.lang === "es" ? "es" : "en", changed: now });
      else if (b.op === "reset") { if (!pw(b.password)) return bad("Use at least 6 characters for the password."); Object.assign(u, hashPassword(b.password.trim()), { v: (u.v || 0) + 1, changed: now }); }
      else if (b.op === "off") Object.assign(u, { off: !!b.off, v: (u.v || 0) + 1, changed: now });
      else if (b.op === "remove") users = users.filter(x => x !== u);
      else return bad("Unknown change.");
    }
    await saveUsers(users, pm.n, positions);
    return answer(users, positions, pm);
  } catch (e) { return bad(e.message, 500); }
}
