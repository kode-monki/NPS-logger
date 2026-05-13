# 🏞 National Parks Journal — Hugo + Google Apps Script CMS

A personal National Parks journal built with Hugo, managed through a Google Apps Script CMS that lives inside Google Sheets.

---

## What's Included

| Path | Purpose |
|------|---------|
| `hugo.toml` | Hugo config with `state`, `trip`, `region` taxonomies |
| `archetypes/parks.md` | Template for new park entries |
| `archetypes/trips.md` | Template for new trip entries |
| `content/parks/` | One `.md` file per park |
| `content/trips/` | One `.md` file per trip |
| `data/all-parks.yaml` | All 63 NPS parks — powers the checklist |
| `layouts/` | Hugo templates (park page, trip page, checklist) |
| `layouts/shortcodes/` | `map-link`, `photo-link`, `park-rating`, `trip-parks` |
| `cms-gas/Code.gs` | Apps Script backend |
| `cms-gas/Index.html` | Full CMS web UI |

---

## Hugo Site Setup

### 1. Install Hugo
```bash
brew install hugo   # macOS
# or https://gohugo.io/installation/
```

### 2. Initialize the site
```bash
cd national-parks-hugo
hugo server -D   # preview at http://localhost:1313
```

### 3. Build for production
```bash
hugo --minify
# Output in /public — deploy to Netlify, GitHub Pages, Cloudflare Pages, etc.
```

### 4. Taxonomies automatically created
- `/states/arizona/` — all Arizona parks
- `/regions/southwest/` — all Southwest parks
- `/trips/southwest-2023/` — all parks on that trip
- `/checklist/` — master progress tracker

---

## Shortcodes

Use these inside any park or trip `.md` body:

```
{{< map-link url="https://maps.google.com/…" label="Open in Google Maps" >}}
{{< photo-link url="https://photos.google.com/album/…" label="View Album" >}}
{{< park-rating rating="4" >}}
{{< trip-parks trip="Southwest 2023" >}}
```

---

## Google Apps Script CMS Setup

### 1. Create a Google Sheet
- Name it `National Parks Journal`
- Two tabs will be auto-created: `Parks` and `Trips`

### 2. Add the script
- Extensions → Apps Script
- Paste `Code.gs` content
- Create a new HTML file called `Index` and paste `Index.html`

### 3. Configure `Code.gs`
Edit the `CONFIG` block at the top:

```javascript
const CONFIG = {
  DRIVE_FOLDER_ID: "your-google-drive-folder-id",  // where MD files get exported
  GITHUB_TOKEN:    "ghp_your_token_here",           // optional: for direct GitHub push
  GITHUB_OWNER:    "yourusername",
  GITHUB_REPO:     "national-parks-hugo",
  GITHUB_BRANCH:   "main",
};
```

### 4. Deploy as web app (optional)
- Deploy → New deployment → Web app
- Execute as: Me
- Access: Anyone (or just yourself)
- This gives you a standalone CMS URL

### 5. Open as sidebar in Sheets
- Refresh the sheet
- Parks CMS menu → Open CMS Sidebar

---

## Workflow

### Adding a park you've visited
1. Open CMS (sidebar or web app)
2. Parks → New Park
3. Fill in title, state, region, toggle "Visited", set rating, add dates
4. Paste your journal body in Markdown
5. Add Google Maps URL and Google Photos album URL
6. Save + Export MD → file goes to your Drive folder
7. Copy the exported `.md` to `content/parks/` in your Hugo repo
8. `hugo server` to preview, push to GitHub to publish

### Adding a trip
1. Trips → New Trip
2. Fill in dates, states, Google Maps route, Google Photos album
3. Tag individual parks with the trip name (in the park's "Trips" field)
4. The trip page auto-lists all tagged parks via `{{< trip-parks >}}`

### GitHub Direct Push (no manual copy step)
1. Set `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` in `Code.gs`
2. CMS → Push → GitHub pushes all files directly
3. If you use Netlify/Cloudflare Pages connected to GitHub, the site rebuilds automatically

---

## Google Docs → Hugo MD Conversion

When you write notes in Google Docs, export them by:

1. Docs → File → Download → Markdown (.md)  *(available in newer Docs)*
2. Paste the content into the CMS "Journal Body" field
3. Or paste into `content/parks/parkname.md` directly and add the frontmatter

---

## Checklist Page

Create `content/checklist/_index.md`:
```yaml
---
title: "Checklist"
layout: "checklist"
---
```

This renders your master progress tracker using `data/all-parks.yaml` cross-referenced with your `content/parks/` entries.

---

## Park Front Matter Reference

```yaml
park_code: "GRCA"          # NPS 4-letter code
official_name: "..."
designation: "National Park"
state: ["Arizona"]
regions: ["Southwest"]

visited: true
visit_dates: ["2023-09-14"]
trips: ["Southwest 2023"]
rating: 5                  # 1–5

google_maps_url: "..."
google_photos_url: "..."
nps_url: "..."             # auto-built from park_code if blank

summary: "One-line teaser"
highlights:
  - "Item one"
  - "Item two"
tips: "Prose tips..."
would_return: true
planning_notes: "Pre-visit notes..."
```
