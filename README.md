# Evelyn's Kastner Schedule

A mobile-first school schedule dashboard for Kastner Intermediate in Fresno, California.

## Features

- Live Fresno time using `America/Los_Angeles`
- No Period 0
- Monday/Friday regular schedule
- Tuesday advisory schedule
- Wednesday even block schedule
- Thursday odd block schedule
- Color-matched periods
- Current / coming-up class dashboard
- Next period card
- Daily affirmation for Evelyn with emoji
- Mobile-friendly layout
- Basic PWA support for adding to an Android home screen
- Offline cache after the first successful visit

## Deploy with GitHub Pages

1. Create a new GitHub repository.
2. Upload all files in this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your main branch and `/ (root)`.
6. Save.
7. GitHub will provide a public URL for the schedule.

## Add to Android Home Screen

1. Open the published site in Chrome on the phone.
2. Tap the three-dot menu.
3. Choose **Add to Home screen** or **Install app**.
4. Confirm.

## Main files

- `index.html` — entire schedule app
- `manifest.webmanifest` — installable app metadata
- `service-worker.js` — offline caching
- `.gitignore` — basic Git exclusions

## Important

This version uses the schedule provided in the source sheet. It does not yet account for school holidays, minimum days, rally schedules, testing schedules, or other special calendar exceptions.
