import { secret, readSession, basicWho, makeSession, cookieLine, clearCookie, whoIs, isPerson, norm, permsFor, personPerms, roleKey } from "../lib/session.js";
import { loadTeam } from "../lib/team-store.js";
import { realAdmin, asPerson, asPosition, viewList, VIEW_ID } from "../lib/view-as.js";

// Tells the app who is using it: { role (position key), position (its name), perms, admin, name, signin }.
// For a signed-in person it checks they're still on the Admin page's list, turned on and with the same password;
// if not, they're signed out. Otherwise their sign-in is renewed for another 30 days with their position's
// current access, so a change on the Admin page reaches them the next time the app checks.
// For an admin it also lists who they can "View as" (lib/view-as.js), and while they view as someone, who they really are.
const H = { "Cache-Control": "no-store" };
function answer(who, signin, positions, extra = {}, lang, view = {}) {
  const r = roleKey(who.r), perms = who.p != null ? String(who.p).split(",").filter(Boolean) : permsFor(positions, r);
  const pos = positions.find(p => p.key === r);
  return Response.json({ role: perms.includes("edit") ? "office" : "field", position: r, positionName: pos ? pos.name : r, perms, admin: perms.includes("admin"), name: who.n || "", signin, id: who.id || null, lang: lang || null,
    locked: signin || !!norm(process.env.APP_PASSWORD), ...view }, { headers: { ...H, ...extra } });
}
export async function GET(request) {
  try {
    const key = secret();
    const { users, positions } = await loadTeam();
    if (!key) {
      const who = await whoIs(request) || { r: "admin", n: "Office" };
      return answer({ ...who, p: permsFor(positions, who.r).join(",") }, false, positions);
    }
    let who = await readSession(key, request.headers.get("cookie"));
    if (!who) {
      who = await basicWho(request, key);
      return who ? answer(who, true, positions) : Response.json({ error: "Please sign in again.", signin: true }, { status: 401, headers: H });
    }
    const out = () => Response.json({ error: "Please sign in again.", signin: true }, { status: 401, headers: { ...H, "Set-Cookie": clearCookie() } });
    let real = null;
    if (who.ra) {
      // viewing as someone: the admin must still be an admin, and the person or position must still be there
      real = realAdmin(who.ra, users);
      if (!real) return out();
      const u = who.id === VIEW_ID ? null : users.find(x => x.id === who.id && !x.off);
      const pos = who.id === VIEW_ID ? positions.find(p => p.key === roleKey(who.r) && p.key !== "admin") : null;
      who = u ? asPerson(u, real, positions) : pos ? asPosition(pos, real, positions) : real;
      if (!u && !pos) real = null; // they were removed: back to the admin
    } else if (isPerson(who)) {
      const u = users.find(x => x.id === who.id);
      if (!u || u.off || (u.v || 0) !== (who.v || 0)) return out();
      who = { n: u.name, r: roleKey(u.role), id: u.id, v: u.v || 0 };
    }
    const lang = isPerson(who) ? (users.find(x => x.id === who.id) || {}).lang : null;
    if (!real) who = { ...who, p: personPerms(positions, who.r, isPerson(who) && users.find(x => x.id === who.id)).join(",") };
    const admin = real || realAdmin(who, users);
    const view = admin ? { canViewAs: viewList(users, positions, admin), viewingAs: real ? { name: real.n, id: who.id === VIEW_ID ? "p:" + who.r : "u:" + who.id } : null } : {};
    return answer(who, true, positions, { "Set-Cookie": cookieLine(await makeSession(key, who)) }, lang, view);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: H });
  }
}
