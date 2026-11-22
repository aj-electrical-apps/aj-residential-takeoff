import { secret, readSession, makeSession, cookieLine, permsFor } from "../lib/session.js";
import { loadTeam } from "../lib/team-store.js";
import { realAdmin, realOf, asPerson, asPosition } from "../lib/view-as.js";

// "View as" for admins (see lib/view-as.js). POST { id: "u:<person id>" | "p:<position key>" | "" (back to me) }
// -> a new sign-in cookie; the app then reloads and shows that person's screen.
const H = { "Cache-Control": "no-store" };
const bad = (error, status = 400) => Response.json({ error }, { status, headers: H });
export async function POST(request) {
  try {
    const key = secret();
    if (!key) return bad("View as needs people to sign in (SESSION_SECRET).");
    const who = await readSession(key, request.headers.get("cookie"));
    if (!who) return bad("Please sign in again.", 401);
    const { users, positions } = await loadTeam();
    const real = realAdmin(realOf(who), users);
    if (!real) return bad("Only an admin can view the app as someone else.", 403);
    const b = await request.json().catch(() => ({})), id = String(b.id || "");
    let next;
    if (!id) next = { ...real };
    else if (id.startsWith("u:")) {
      const u = users.find(x => x.id === id.slice(2) && !x.off);
      if (!u) return bad("That person isn't on the list anymore.");
      next = u.id === real.id ? { ...real } : asPerson(u, real, positions);
    } else if (id.startsWith("p:")) {
      const pos = positions.find(p => p.key === id.slice(2));
      if (!pos) return bad("That position isn't on the list anymore.");
      next = pos.key === "admin" ? { ...real } : asPosition(pos, real, positions);
    } else return bad("Pick someone to view as.");
    if (!next.ra) next.p = permsFor(positions, "admin").join(",");
    return Response.json({ ok: true, viewing: !!next.ra, name: next.n }, { headers: { ...H, "Set-Cookie": cookieLine(await makeSession(key, next)) } });
  } catch (e) { return bad(e.message, 500); }
}
