# AJ Residential Takeoff

Residential electrical takeoff for AJ Electrical. Built on AJ Takeoff (v152): upload plans, name sheets, set scale, measure, draw runs, jobs, sign-in, team saving, Admin page, count sheet, bid sheet and proposal all work the same.

What's residential:
- **Toolbox:** every item on the residential pricing sheet (Master Copy - Residential pricing sheet) as a drawn symbol. Symbols come from Barn Electrical Pro; puck, pendant, chandelier, under-cabinet, lighted mirror, floor receptacle and switched receptacle were drawn new in the same style. The commercial toolbox is still there under "Commercial items".
- **Price & bid → Residential price:** every residential symbol on every sheet × the sheet's price (labor + material), with man hours, labor and material split out. Type over a quantity or price for one job, add lines, take a discount, print or copy.

It's a single static page (`index.html`), with no build step. Vercel serves it as-is. The api folder, Blob saving, sign-in (`SESSION_SECRET`) and the Drive backup script work the same way as AJ Takeoff; give this site its own Vercel project and Blob store.

**Mark installed (field install tracking):** the crew lead taps **✓ Mark installed**, then taps each light, receptacle, switch or linear run as it goes in, and it turns green (tap again to undo). **Installed** shows, for the whole job, how many of each item are installed and how many are left (runs in feet), and the number on the button drops as items are marked off. The taps save online in the job's field layer (`team/field/<job>/`), never in the estimate, so the PM and office see them within a minute. Only positions with **Mark items installed** (Admin page; on for Superintendent and Foreman by default) can tap; everyone can see progress.
