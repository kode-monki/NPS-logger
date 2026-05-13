// ============================================================
// National Parks Journal — Google Apps Script CMS
// File: Code.gs
//
// HOW IT WORKS:
//   1. Stores park + trip data in Google Sheets tabs
//   2. Serves a sidebar / web app UI for editing
//   3. Exports formatted Hugo-ready Markdown to a Drive folder
//   4. Optionally pushes to GitHub via API
// ============================================================

// ── CONFIG — edit these ─────────────────────────────────────
const CONFIG = {
  DRIVE_FOLDER_ID: "",        // Google Drive folder for exported MD files
  GITHUB_TOKEN:    "",        // GitHub personal access token (optional)
  GITHUB_OWNER:    "",        // e.g. "yourname"
  GITHUB_REPO:     "",        // e.g. "national-parks-hugo"
  GITHUB_BRANCH:   "main",
  PARKS_SHEET:     "Parks",
  TRIPS_SHEET:     "Trips",
};

// ── Sheet column maps ───────────────────────────────────────
const PARK_COLS = {
  slug:              1,
  title:             2,
  park_code:         3,
  official_name:     4,
  designation:       5,
  state:             6,   // comma-separated
  regions:           7,   // comma-separated
  visited:           8,   // TRUE/FALSE
  visit_dates:       9,   // comma-separated YYYY-MM-DD
  trips:             10,  // comma-separated
  rating:            11,
  google_maps_url:   12,
  google_photos_url: 13,
  nps_url:           14,
  summary:           15,
  highlights:        16,  // pipe-separated
  tips:              17,
  would_return:      18,
  planning_notes:    19,
  body:              20,  // free-form markdown body
  last_updated:      21,
};

const TRIP_COLS = {
  slug:              1,
  title:             2,
  start_date:        3,
  end_date:          4,
  states:            5,
  regions:           6,
  google_maps_url:   7,
  google_photos_url: 8,
  summary:           9,
  highlights:        10,
  body:              11,
  last_updated:      12,
};

// ── Entry point: serve the web app ──────────────────────────
function doGet(e) {
  const page = e.parameter.page || "dashboard";
  const tmpl = HtmlService.createTemplateFromFile("Index");
  tmpl.page = page;
  tmpl.parkSlug = e.parameter.slug || "";
  return tmpl.evaluate()
    .setTitle("Parks CMS")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Open as sidebar from Sheets ──────────────────────────────
function openSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Parks CMS")
    .setWidth(400);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ── Menu entry ───────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🏞 Parks CMS")
    .addItem("Open CMS Sidebar", "openSidebar")
    .addSeparator()
    .addItem("Export All Parks → Drive", "exportAllParks")
    .addItem("Export All Trips → Drive", "exportAllTrips")
    .addItem("Export All → GitHub", "pushAllToGitHub")
    .addToUi();
}

// ── CRUD helpers ─────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || createSheet_(name);
}

function createSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.insertSheet(name);
  if (name === CONFIG.PARKS_SHEET) {
    sh.appendRow(Object.keys(PARK_COLS));
  } else if (name === CONFIG.TRIPS_SHEET) {
    sh.appendRow(Object.keys(TRIP_COLS));
  }
  return sh;
}

function getAllParks() {
  const sh = getSheet(CONFIG.PARKS_SHEET);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const [header, ...rows] = data;
  return rows.map(r => rowToObj_(header, r));
}

function getAllTrips() {
  const sh = getSheet(CONFIG.TRIPS_SHEET);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const [header, ...rows] = data;
  return rows.map(r => rowToObj_(header, r));
}

function getPark(slug) {
  return getAllParks().find(p => p.slug === slug) || null;
}

function getTrip(slug) {
  return getAllTrips().find(t => t.slug === slug) || null;
}

function savePark(park) {
  const sh   = getSheet(CONFIG.PARKS_SHEET);
  const data = sh.getDataRange().getValues();
  const [header] = data;
  park.last_updated = new Date().toISOString().split("T")[0];
  park.slug = park.slug || slugify_(park.title);

  // find existing row
  const idx = data.slice(1).findIndex(r => r[0] === park.slug);
  const row = objToRow_(header, park);

  if (idx === -1) {
    sh.appendRow(row);
  } else {
    sh.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  }
  return { ok: true, slug: park.slug };
}

function saveTrip(trip) {
  const sh   = getSheet(CONFIG.TRIPS_SHEET);
  const data = sh.getDataRange().getValues();
  const [header] = data;
  trip.last_updated = new Date().toISOString().split("T")[0];
  trip.slug = trip.slug || slugify_(trip.title);

  const idx = data.slice(1).findIndex(r => r[0] === trip.slug);
  const row = objToRow_(header, trip);

  if (idx === -1) {
    sh.appendRow(row);
  } else {
    sh.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  }
  return { ok: true, slug: trip.slug };
}

function deletePark(slug) {
  const sh   = getSheet(CONFIG.PARKS_SHEET);
  const data = sh.getDataRange().getValues();
  const idx  = data.slice(1).findIndex(r => r[0] === slug);
  if (idx !== -1) sh.deleteRow(idx + 2);
  return { ok: true };
}

// ── Markdown export ──────────────────────────────────────────
function parkToMarkdown(park) {
  const visited   = park.visited === true || park.visited === "TRUE" || park.visited === true;
  const highlights = arrField_(park.highlights, "|");
  const state      = arrField_(park.state, ",");
  const regions    = arrField_(park.regions, ",");
  const trips      = arrField_(park.trips, ",");
  const visitDates = arrField_(park.visit_dates, ",");

  const frontmatter = `---
title: "${esc_(park.title)}"
date: ${park.last_updated || today_()}
draft: false

park_code: "${park.park_code || ""}"
official_name: "${esc_(park.official_name || park.title)}"
designation: "${park.designation || "National Park"}"
state: [${state.map(s => `"${s.trim()}"`).join(", ")}]
regions: [${regions.map(r => `"${r.trim()}"`).join(", ")}]

visited: ${visited}
visit_dates: [${visitDates.map(d => `"${d.trim()}"`).join(", ")}]
trips: [${trips.map(t => `"${t.trim()}"`).join(", ")}]
rating: ${park.rating || 0}

google_maps_url: "${park.google_maps_url || ""}"
google_photos_url: "${park.google_photos_url || ""}"
nps_url: "${park.nps_url || ""}"

planning_notes: |
${indentBlock_(park.planning_notes || "")}
summary: "${esc_(park.summary || "")}"
highlights:
${highlights.map(h => `  - "${esc_(h.trim())}"`).join("\n")}
tips: |
${indentBlock_(park.tips || "")}
would_return: ${park.would_return === true || park.would_return === "TRUE"}
---

${park.body || ""}
`;
  return frontmatter;
}

function tripToMarkdown(trip) {
  const states    = arrField_(trip.states, ",");
  const regions   = arrField_(trip.regions, ",");
  const highlights = arrField_(trip.highlights, "|");

  return `---
title: "${esc_(trip.title)}"
date: ${trip.start_date || trip.last_updated || today_()}
draft: false

start_date: "${trip.start_date || ""}"
end_date: "${trip.end_date || ""}"
states: [${states.map(s => `"${s.trim()}"`).join(", ")}]
regions: [${regions.map(r => `"${r.trim()}"`).join(", ")}]

google_maps_url: "${trip.google_maps_url || ""}"
google_photos_url: "${trip.google_photos_url || ""}"

summary: "${esc_(trip.summary || "")}"
highlights:
${highlights.map(h => `  - "${esc_(h.trim())}"`).join("\n")}
---

${trip.body || ""}
`;
}

// ── Export to Drive ──────────────────────────────────────────
function exportAllParks() {
  const folder = getDriveFolder_("content/parks");
  getAllParks().forEach(park => {
    const md   = parkToMarkdown(park);
    const name = `${park.slug}.md`;
    saveFileToDrive_(folder, name, md);
  });
  SpreadsheetApp.getUi().alert("✅ Parks exported to Drive: content/parks/");
}

function exportAllTrips() {
  const folder = getDriveFolder_("content/trips");
  getAllTrips().forEach(trip => {
    const md   = tripToMarkdown(trip);
    const name = `${trip.slug}.md`;
    saveFileToDrive_(folder, name, md);
  });
  SpreadsheetApp.getUi().alert("✅ Trips exported to Drive: content/trips/");
}

function exportPark(slug) {
  const park = getPark(slug);
  if (!park) return { ok: false, error: "Park not found" };
  const folder = getDriveFolder_("content/parks");
  saveFileToDrive_(folder, `${slug}.md`, parkToMarkdown(park));
  return { ok: true };
}

// ── GitHub push ───────────────────────────────────────────────
function pushAllToGitHub() {
  const allParks = getAllParks();
  const allTrips = getAllTrips();
  let pushed = 0;

  allParks.forEach(park => {
    const path = `content/parks/${park.slug}.md`;
    pushFileToGitHub_(path, parkToMarkdown(park));
    pushed++;
  });

  allTrips.forEach(trip => {
    const path = `content/trips/${trip.slug}.md`;
    pushFileToGitHub_(path, tripToMarkdown(trip));
    pushed++;
  });

  SpreadsheetApp.getUi().alert(`✅ Pushed ${pushed} files to GitHub`);
}

function pushParkToGitHub(slug) {
  const park = getPark(slug);
  if (!park) return { ok: false, error: "Not found" };
  const path = `content/parks/${slug}.md`;
  return pushFileToGitHub_(path, parkToMarkdown(park));
}

function pushFileToGitHub_(path, content) {
  if (!CONFIG.GITHUB_TOKEN) return { ok: false, error: "No GitHub token configured" };

  const apiUrl   = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${path}`;
  const encoded  = Utilities.base64Encode(content);
  let sha;

  // Get current SHA if file exists
  try {
    const getResp = UrlFetchApp.fetch(apiUrl, {
      headers: { Authorization: `token ${CONFIG.GITHUB_TOKEN}` },
      muteHttpExceptions: true,
    });
    if (getResp.getResponseCode() === 200) {
      sha = JSON.parse(getResp.getContentText()).sha;
    }
  } catch(e) {}

  const body = {
    message: `CMS update: ${path}`,
    content: encoded,
    branch: CONFIG.GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const resp = UrlFetchApp.fetch(apiUrl, {
    method: "put",
    headers: {
      Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  return { ok: resp.getResponseCode() < 300 };
}

// ── Utilities ─────────────────────────────────────────────────
function slugify_(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function esc_(str) {
  return (str || "").replace(/"/g, '\\"');
}

function today_() {
  return new Date().toISOString().split("T")[0];
}

function indentBlock_(str) {
  return (str || "  ")
    .split("\n")
    .map(l => `  ${l}`)
    .join("\n");
}

function arrField_(val, sep) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return String(val).split(sep).map(s => s.trim()).filter(Boolean);
}

function rowToObj_(header, row) {
  const obj = {};
  header.forEach((key, i) => { obj[key] = row[i]; });
  return obj;
}

function objToRow_(header, obj) {
  return header.map(key => obj[key] !== undefined ? obj[key] : "");
}

function getDriveFolder_(subpath) {
  const root = CONFIG.DRIVE_FOLDER_ID
    ? DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID)
    : DriveApp.getRootFolder();

  return subpath.split("/").reduce((folder, part) => {
    const iter = folder.getFoldersByName(part);
    return iter.hasNext() ? iter.next() : folder.createFolder(part);
  }, root);
}

function saveFileToDrive_(folder, filename, content) {
  const iter = folder.getFilesByName(filename);
  if (iter.hasNext()) {
    iter.next().setContent(content);
  } else {
    folder.createFile(filename, content, MimeType.PLAIN_TEXT);
  }
}
