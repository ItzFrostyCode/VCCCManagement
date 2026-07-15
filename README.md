# VCCC Pastoral Deployment & Records System

A web-based management system for **Victory Chapel Christian Center (Davao)**, built to track pastors, their church assignments, and the district/zone hierarchy they belong to — and to generate Excel reports on demand instead of doing it by hand.

**Live site:** [vcccmanagement.netlify.app](https://vcccmanagement.netlify.app)

## What it does

- Track **Pastors** — status (active, transferred, pull out, undeployed, deceased), contact info, and photos.
- Track **Districts → Zones → Churches** hierarchy, and which pastor is assigned to which church.
- Track **Disciples**, linked to their mentor pastor's current church and district.
- Track **Conferences** and **Meal schedules**, with QR-code scanning for attendance and duplicate-scan prevention.
- Generate **Delegate ID cards** (with QR codes) for pastors, pastors' wives, and disciples, individually or in bulk (as a categorized ZIP).
- **Export to Excel/CSV** — pastor directories, district/church reports, disciple lists, and full system backups — no more manual spreadsheet work.
- **Import** JSON/CSV data back in, merging with existing records.

## Tech stack

Plain HTML/CSS/JavaScript (ES modules) — no build step, no framework. Data is stored entirely in the browser's `localStorage`, so the app works fully offline with no backend dependency.

- [ExcelJS](https://github.com/exceljs/exceljs) for Excel generation (with embedded photos)
- [QRCode.js](https://github.com/soldair/node-qrcode) + [html5-qrcode](https://github.com/mebjas/html5-qrcode) for QR generation/scanning
- [JSZip](https://stuk.github.io/jszip/) for bulk ID card downloads
- [Lucide](https://lucide.dev/) for icons
- [Tailwind CDN](https://tailwindcss.com/) (utility classes only; layout/theme is a custom stylesheet)

## Project structure

```
src/
  index.html          Entry point
  css/style.css        All styling
  assets/              Logo and static images
  js/
    core/               State, local persistence, routing
    modules/            One folder per feature area (pastors, districts,
                         churches, assignments, events, system, export)
    shared/              Reusable UI components and helpers
```

## Running locally

No build step required. Serve the `src/` folder with any static file server and open `index.html` — for example, with VS Code's Live Server extension, or:

```bash
cd src
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deployment

Deployed on Netlify, publishing the `src/` directory (see `netlify.toml`). Every push to `main` triggers a new deploy.

## Data & backups

All data lives in the browser's `localStorage` — nothing is sent to a server. Use the **Data** page regularly to export a full JSON backup, since clearing browser storage will erase everything.
