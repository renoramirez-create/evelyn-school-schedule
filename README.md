# Evelyn's Kastner Schedule

A mobile-first school schedule dashboard for Kastner Intermediate.

## Features

- Uses Fresno, California (`America/Los_Angeles`) for schedule logic
- No Period 0
- Color-matched periods
- Current / coming-up period dashboard
- Clear **View Next School Day** preview that skips weekends
- Persistent warning banner while previewing another day so it cannot be confused with today
- Daily affirmation for Evelyn with emoji
- Floating **Note** button
- Quick notes saved in the browser with localStorage
- Copy saved notes to the clipboard
- Optional date/time reminders
- Open a saved reminder in Google Calendar with the event prefilled
- Mobile-friendly layout
- PWA support for adding to an Android home screen
- Offline cache after the first successful visit

## Deploy or update with GitHub

If replacing the previous version:

1. Open the GitHub repository.
2. Upload/replace `index.html`, `service-worker.js`, `manifest.webmanifest`, and `README.md`.
3. Commit the changes.
4. GitHub Pages will redeploy automatically.
5. On the phone, refresh the site once while online so the new service worker can cache the updated version.

## Notes and reminders

Quick notes use browser `localStorage`. They stay on the same phone/browser and domain, but they do **not** automatically sync to another phone or browser.

For anything that must follow Evelyn across devices, add it to Google Calendar from the note panel.

## Important

This version follows the provided weekday bell schedule. It does not yet account for school holidays, minimum days, rally schedules, testing schedules, or other special calendar exceptions.
