---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
draft: false

# ── Identity ──────────────────────────────────────────────
park_code: ""          # NPS 4-letter code, e.g. GRCA
official_name: ""      # Full official name
designation: "National Park"   # Park, Monument, Seashore, Historic Site…
state: []              # ["Arizona"] – drives the States taxonomy page
regions: []            # ["Southwest", "Colorado Plateau"]

# ── Status ────────────────────────────────────────────────
visited: false
visit_dates: []        # ["2023-09-14", "2024-06-01"]
trips: []              # ["Southwest 2023"] – drives the Trips taxonomy page
rating: 0              # 1–5; leave 0 if not visited

# ── Links ─────────────────────────────────────────────────
google_maps_url: ""
google_photos_url: ""
nps_url: ""            # auto-built from park_code if blank

# ── Planning (pre-visit notes) ────────────────────────────
planning_notes: ""

# ── Review (post-visit) ──────────────────────────────────
summary: ""            # One-line teaser shown on checklist
highlights: []         # ["South Rim sunrise", "Bright Angel Trail"]
tips: ""
would_return: false
---

<!-- Write your full journal entry below. Use shortcodes like:
     {{< photo-link >}}  {{< map-link >}}  {{< park-rating >}}
-->

{{ if .Params.visited }}
## Visit Notes
{{ else }}
## Planning Notes
{{ end }}
