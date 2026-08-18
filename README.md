# Evelyn's Kastner Schedule V4.7

## Lunch fix

The previous version tried to read Nutrislice directly from the student's browser. That can fail when a remote server does not allow a cross-origin browser fetch.

V4.7 now uses two paths:

1. **GitHub Action sync**
   - GitHub fetches Kastner's Nutrislice data server-side.
   - It writes the results to `data/lunch-menu.json`.
   - Evelyn's page reads that local same-origin JSON file.
   - The workflow runs daily and can also be run manually from GitHub Actions.

2. **Live Nutrislice fallback**
   - If there is no synced menu for the selected date, the Lunch Menu button opens Kastner's official Nutrislice page for that exact date in a new tab.
   - This means she is never stuck on a failed sync screen.

## Taco button layout

The taco button now sits on its own line below the Lunch row content instead of being squeezed beside the lunch end time.

## One-time GitHub setup

After uploading V4.7:

1. Open the repository on GitHub.
2. Go to **Actions**.
3. Open **Update Kastner Lunch Menu**.
4. Choose **Run workflow** once.
5. After it finishes, check that `data/lunch-menu.json` contains menu dates/items.
6. GitHub Pages will redeploy after the committed JSON update.

After that, the workflow runs automatically each morning.

## Included files

- `index.html`
- `lunch-menu.js`
- `school-jokes.js`
- `data/lunch-menu.json`
- `scripts/update-lunch.mjs`
- `.github/workflows/update-lunch.yml`
- PWA / icon files

Period 0 remains excluded everywhere.
