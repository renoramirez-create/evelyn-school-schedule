# Evelyn's Kastner Schedule V4

Mobile-first school schedule dashboard for Kastner Intermediate.

## Source of truth

V4 uses Evelyn's final schedule supplied in `Evelyn8Sched.docx`.

Classes:
- Period 1: AB English 8 - Davidson Barcellos, S - F2
- Period 2: AB US History 8 - Davidson Barcellos, S - F2
- Period 3: PE I - Gray, S - PE GYM
- Period 4: Science 8 I - Warner, R - C1
- Period 6: Adv Art 7/8 - Lowder, R - K2
- Period 7: Math 8 - Frye, T - E6

Period 0 is intentionally excluded everywhere.

## V4 changes

- Kastner-style K image added to the header and PWA icons
- Dark red K tile with warm yellow K and outlined border treatment
- Preview background changed to calming green and pink hues
- Preview is intentionally simplified for fast reading
- Preview shows the next three school days at once
- Each preview row shows only period/class and time
- Teachers, rooms, breaks, lunch, countdowns, and affirmations are removed from preview
- Floating PREVIEW MODE bar remains visible with Return to Today
- Today's normal dashboard still has full class details
- Dark/light theme remains available
- Notes and Google Calendar reminder tools remain available

## Update GitHub Pages

1. Unzip this package.
2. Replace the existing repository files with these files.
3. Commit the changes.
4. Wait for GitHub Pages to redeploy.
5. Refresh once on the phone while online so the V4 service worker replaces the older cached app.

## Calendar exceptions

This follows the supplied bell schedule. It does not yet automatically account for school holidays, minimum days, rallies, testing schedules, or one-off schedule changes.
