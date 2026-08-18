import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCHOOL = "kastner";
const MENU_TYPE = "lunch";
const OUTPUT = path.join(process.cwd(), "data", "lunch-menu.json");

const API_BASES = [
  "https://cusd.api.nutrislice.com",
  "https://cusd.nutrislice.com"
];

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function normalizeDate(value) {
  const match = String(value || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function extractName(item) {
  if (!item) return null;
  if (typeof item === "string") return item.trim() || null;

  const candidates = [
    item.food?.name,
    item.food?.display_name,
    item.menu_item?.food?.name,
    item.name,
    item.display_name,
    item.text,
    item.title
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function dedupe(items) {
  const seen = new Set();

  return (Array.isArray(items) ? items : [])
    .map(extractName)
    .filter(Boolean)
    .filter(item => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function requestJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "KastnerSchoolSchedule/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function extractDays(data) {
  if (Array.isArray(data?.days)) return data.days;
  if (Array.isArray(data?.menu?.days)) return data.menu.days;
  if (Array.isArray(data?.week?.days)) return data.week.days;
  return [];
}

function recordFromDay(day) {
  const date =
    normalizeDate(day.date) ||
    normalizeDate(day.menu_date) ||
    normalizeDate(day.date_string);

  if (!date) return null;

  return {
    date,
    items: dedupe(day.menu_items || day.items || day.foods || []),
    holidayText: day.holiday_text || day.holidayText || null
  };
}

async function fetchWeek(anchor) {
  const parts = anchor.split("-");
  const pathDate = `${parts[0]}/${parts[1]}/${parts[2]}`;
  let lastError;

  for (const base of API_BASES) {
    const url =
      `${base}/menu/api/weeks/school/${SCHOOL}/menu-type/${MENU_TYPE}/${pathDate}/?format=json`;

    try {
      const json = await requestJson(url);
      const days = extractDays(json);

      if (!days.length) {
        throw new Error("No days in response");
      }

      return days;
    } catch (error) {
      lastError = error;
      console.warn(`Week endpoint failed: ${url} -> ${error.message}`);
    }
  }

  throw lastError || new Error("All week endpoints failed.");
}

async function fetchDigest(date) {
  const parts = date.split("-");
  const pathDate = `${parts[0]}/${parts[1]}/${parts[2]}`;
  let lastError;

  for (const base of API_BASES) {
    const url =
      `${base}/menu/api/digest/school/${SCHOOL}/menu-type/${MENU_TYPE}/date/${pathDate}/?format=json`;

    try {
      const json = await requestJson(url);

      return {
        date,
        items: dedupe(json.menu_items || json.items || []),
        holidayText: json.holiday_text || json.holidayText || null
      };
    } catch (error) {
      lastError = error;
      console.warn(`Digest endpoint failed: ${url} -> ${error.message}`);
    }
  }

  throw lastError || new Error("All digest endpoints failed.");
}

function mondayOf(date) {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function uniqueWeekAnchors(start, end) {
  const anchors = new Set();

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 7)) {
    anchors.add(iso(mondayOf(cursor)));
  }

  anchors.add(iso(mondayOf(end)));

  return [...anchors].sort();
}

async function loadExisting() {
  try {
    return JSON.parse(await readFile(OUTPUT, "utf8"));
  } catch {
    return {
      updatedAt: null,
      source: "Nutrislice",
      menus: {}
    };
  }
}

const now = new Date();

// Cover roughly the rest of the current month plus two more months.
const start = addDays(now, -2);
const end = addDays(now, 75);
const anchors = uniqueWeekAnchors(start, end);

const existing = await loadExisting();
const menus = { ...(existing.menus || {}) };

let weeklySuccesses = 0;

for (const anchor of anchors) {
  try {
    const days = await fetchWeek(anchor);
    weeklySuccesses += 1;

    for (const day of days) {
      const record = recordFromDay(day);
      if (!record) continue;

      if (record.date < iso(start) || record.date > iso(end)) {
        continue;
      }

      menus[record.date] = {
        items: record.items,
        holidayText: record.holidayText
      };
    }
  } catch {
    // Digest fallback below.
  }
}

// If the weekly API did not work, try individual school days.
if (weeklySuccesses === 0) {
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const weekday = cursor.getUTCDay();

    if (weekday === 0 || weekday === 6) {
      continue;
    }

    const date = iso(cursor);

    try {
      const record = await fetchDigest(date);

      menus[date] = {
        items: record.items,
        holidayText: record.holidayText
      };
    } catch {
      // Keep any older cached copy rather than deleting it.
    }
  }
}

// Remove very old dates so the JSON stays small.
const cutoff = iso(addDays(now, -14));

for (const date of Object.keys(menus)) {
  if (date < cutoff) {
    delete menus[date];
  }
}

const output = {
  updatedAt: new Date().toISOString(),
  source: "Kastner Nutrislice sync",
  menus
};

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify(output, null, 2) + "\n", "utf8");

console.log(`Saved ${Object.keys(menus).length} lunch-menu dates to ${OUTPUT}.`);
