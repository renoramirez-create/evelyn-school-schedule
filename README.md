# Evelyn's Kastner Schedule

A mobile-first school schedule dashboard for Kastner Intermediate.

## V3 features

- Live schedule logic uses Fresno, California time (`America/Los_Angeles`)
- No Period 0
- Color-matched periods
- Main **Right Now / Coming Up / First Up** card changes to the active period color
- **Next Period** card has a matching color indicator
- Light and dark mode toggle with saved preference
- **Preview Next 3 Days** mode
- Preview automatically skips weekends
- Three selectable school-day preview cards
- Calm green and light-blue background while previewing
- Persistent floating **PREVIEW MODE / Return to Today** control at the top
- Daily affirmation for Evelyn is hidden while previewing
- Floating note button
- Notes saved locally in the browser
- Copy saved notes
- Optional Google Calendar reminder creation
- PWA support for Android home-screen installation
- Offline cache after first successful visit

## Updating GitHub

If you already have the repository:

1. Unzip this package.
2. Replace the repository files with the files in this folder.
3. Commit the changes.
4. GitHub Pages will redeploy automatically.
5. Refresh the schedule once on Evelyn's phone while connected to the internet so the V3 service worker replaces the older cached version.

## Reminder about calendar exceptions

This app currently follows the provided weekday bell schedule. It does not yet know school holidays, minimum days, rallies, testing schedules, or other special schedule exceptions.
