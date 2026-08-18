(() => {
  "use strict";

  const CACHE_KEY = "kastner-lunch-menu-cache-v1";
  const SCHOOL = "kastner";
  const MENU_TYPE = "lunch";
  const TIME_ZONE = "America/Los_Angeles";

  const DIGEST_BASES = [
    "https://cusd.nutrislice.com/menu/api/digest",
    "https://cusd.api.nutrislice.com/menu/api/digest"
  ];

  const WEEKS_BASES = [
    "https://cusd.nutrislice.com/menu/api/weeks",
    "https://cusd.api.nutrislice.com/menu/api/weeks"
  ];

  let activeIsoDate = null;

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      return {
        dates: parsed.dates || {},
        months: parsed.months || {}
      };
    } catch {
      return { dates: {}, months: {} };
    }
  }

  function writeCache(cache) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Live menu still works if local storage is unavailable.
    }
  }

  function normalizeIso(value) {
    if (!value) return null;
    const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
  }

  function isoToApiPath(iso) {
    return iso.replaceAll("-", "/");
  }

  function officialMenuUrl(iso) {
    return `https://cusd.nutrislice.com/menu/${SCHOOL}/${MENU_TYPE}/${iso}`;
  }

  function monthKeyFromIso(iso) {
    return iso.slice(0, 7);
  }

  function dedupeItems(items) {
    const seen = new Set();

    return items
      .map(item => String(item || "").trim())
      .filter(Boolean)
      .filter(item => {
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function extractItemName(item) {
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

  function extractItems(list) {
    if (!Array.isArray(list)) return [];
    return dedupeItems(list.map(extractItemName).filter(Boolean));
  }

  async function requestJson(url) {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Menu request failed (${response.status})`);
    }

    return response.json();
  }

  async function fetchDigest(iso) {
    const path = isoToApiPath(iso);
    let lastError = null;

    for (const base of DIGEST_BASES) {
      const url =
        `${base}/school/${SCHOOL}/menu-type/${MENU_TYPE}/date/${path}/?format=json`;

      try {
        const data = await requestJson(url);
        return {
          iso,
          items: extractItems(data.menu_items || data.items || []),
          holidayText: data.holiday_text || data.holidayText || null,
          source: "live",
          fetchedAt: Date.now()
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Lunch menu could not be loaded.");
  }

  function extractWeekDays(data) {
    if (Array.isArray(data?.days)) return data.days;
    if (Array.isArray(data?.menu?.days)) return data.menu.days;
    if (Array.isArray(data?.week?.days)) return data.week.days;
    return [];
  }

  async function fetchWeek(anchorIso) {
    const path = isoToApiPath(anchorIso);
    let lastError = null;

    for (const base of WEEKS_BASES) {
      const url =
        `${base}/school/${SCHOOL}/menu-type/${MENU_TYPE}/${path}/?format=json`;

      try {
        const data = await requestJson(url);
        const days = extractWeekDays(data);

        if (!days.length) {
          throw new Error("Weekly menu response did not include days.");
        }

        return days;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Weekly menu could not be loaded.");
  }

  function saveDateRecord(record) {
    if (!record?.iso) return;

    const cache = readCache();

    cache.dates[record.iso] = {
      items: dedupeItems(record.items || []),
      holidayText: record.holidayText || null,
      fetchedAt: record.fetchedAt || Date.now()
    };

    writeCache(cache);
  }

  function getCachedDate(iso) {
    const record = readCache().dates[iso];
    if (!record) return null;

    return {
      iso,
      items: Array.isArray(record.items) ? record.items : [],
      holidayText: record.holidayText || null,
      fetchedAt: record.fetchedAt || 0,
      source: "cache"
    };
  }

  async function getMenu(iso) {
    const cached = getCachedDate(iso);

    if (cached && Date.now() - cached.fetchedAt < 12 * 60 * 60 * 1000) {
      return cached;
    }

    try {
      const live = await fetchDigest(iso);
      saveDateRecord(live);
      return live;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }

  function prettyDate(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));

    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "long",
      month: "long",
      day: "numeric"
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderItems(record) {
    const itemsEl = document.getElementById("lunchItems");
    const statusEl = document.getElementById("lunchStatus");
    const cacheNote = document.getElementById("lunchCacheNote");

    if (!itemsEl || !statusEl) return;

    if (record.holidayText && !record.items.length) {
      statusEl.className = "lunch-status warning";
      statusEl.textContent = record.holidayText;
      itemsEl.innerHTML =
        `<div class="lunch-empty">No regular lunch menu is posted for this date.</div>`;
    } else if (!record.items.length) {
      statusEl.className = "lunch-status warning";
      statusEl.textContent = "No lunch choices are posted for this date yet.";
      itemsEl.innerHTML =
        `<div class="lunch-empty">Check the official Nutrislice menu for the latest update.</div>`;
    } else {
      statusEl.className = "lunch-status success";
      statusEl.textContent =
        `${record.items.length} lunch choice${record.items.length === 1 ? "" : "s"} posted`;

      itemsEl.innerHTML = record.items.map(name => `
        <div class="lunch-food">
          <div class="lunch-food-icon">🍽️</div>
          <div class="lunch-food-name">${escapeHtml(name)}</div>
        </div>
      `).join("");
    }

    if (cacheNote) {
      cacheNote.textContent =
        record.source === "cache"
          ? "Showing the lunch menu saved on this phone."
          : "Lunch menu synced and saved on this phone.";
    }
  }

  function renderError() {
    const statusEl = document.getElementById("lunchStatus");
    const itemsEl = document.getElementById("lunchItems");
    const cacheNote = document.getElementById("lunchCacheNote");

    if (statusEl) {
      statusEl.className = "lunch-status warning";
      statusEl.textContent = "The lunch menu could not sync automatically.";
    }

    if (itemsEl) {
      itemsEl.innerHTML = `
        <div class="lunch-empty">
          Tap “Open Official Nutrislice Menu” to see this day's menu.
        </div>
      `;
    }

    if (cacheNote) {
      cacheNote.textContent =
        "If the school menu service blocks a direct browser request, the official menu button will still take you to the correct date.";
    }
  }

  async function open(iso) {
    activeIsoDate = iso;

    const overlay = document.getElementById("lunchOverlay");
    const dateLabel = document.getElementById("lunchDateLabel");
    const statusEl = document.getElementById("lunchStatus");
    const itemsEl = document.getElementById("lunchItems");
    const cacheNote = document.getElementById("lunchCacheNote");

    if (!overlay) return;

    overlay.classList.add("show");
    if (dateLabel) dateLabel.textContent = prettyDate(iso);

    if (statusEl) {
      statusEl.className = "lunch-status";
      statusEl.textContent = "Loading lunch menu...";
    }

    if (itemsEl) itemsEl.innerHTML = "";
    if (cacheNote) cacheNote.textContent = "";

    try {
      renderItems(await getMenu(iso));
    } catch {
      renderError();
    }
  }

  function close() {
    document.getElementById("lunchOverlay")?.classList.remove("show");
  }

  function openOfficial() {
    if (!activeIsoDate) return;

    window.open(
      officialMenuUrl(activeIsoDate),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function getFresnoIsoToday() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const values = {};
    parts.forEach(part => {
      values[part.type] = part.value;
    });

    return `${values.year}-${values.month}-${values.day}`;
  }

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function weekAnchors(year, month) {
    const max = daysInMonth(year, month);

    return [1, 8, 15, 22, 29]
      .filter(day => day <= max)
      .map(day =>
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      );
  }

  function parseWeekDay(day) {
    const iso =
      normalizeIso(day.date) ||
      normalizeIso(day.menu_date) ||
      normalizeIso(day.day) ||
      normalizeIso(day.date_string);

    if (!iso) return null;

    return {
      iso,
      items: extractItems(day.menu_items || day.items || day.foods || []),
      holidayText: day.holiday_text || day.holidayText || null,
      fetchedAt: Date.now()
    };
  }

  async function prefetchMonth(year, month) {
    const monthKey =
      `${year}-${String(month).padStart(2, "0")}`;

    const cache = readCache();
    const meta = cache.months[monthKey] || {};
    const twelveHours = 12 * 60 * 60 * 1000;
    const threeHours = 3 * 60 * 60 * 1000;

    if (meta.lastSuccess && Date.now() - meta.lastSuccess < twelveHours) {
      return;
    }

    if (
      meta.lastAttempt &&
      !meta.lastSuccess &&
      Date.now() - meta.lastAttempt < threeHours
    ) {
      return;
    }

    cache.months[monthKey] = {
      ...meta,
      lastAttempt: Date.now()
    };
    writeCache(cache);

    let savedAny = false;

    for (const anchor of weekAnchors(year, month)) {
      try {
        const days = await fetchWeek(anchor);

        for (const day of days) {
          const parsed = parseWeekDay(day);

          if (!parsed || monthKeyFromIso(parsed.iso) !== monthKey) {
            continue;
          }

          saveDateRecord(parsed);
          savedAny = true;
        }
      } catch {
        // Digest lookup still runs for any date the student taps.
      }
    }

    const updated = readCache();
    updated.months[monthKey] = {
      lastAttempt: Date.now(),
      lastSuccess: savedAny ? Date.now() : 0
    };
    writeCache(updated);
  }

  async function prefetchCurrentMenus() {
    const today = getFresnoIsoToday();
    const [year, month, day] = today.split("-").map(Number);

    // Get today quickly.
    getMenu(today).catch(() => {});

    // Best-effort monthly cache.
    prefetchMonth(year, month).catch(() => {});

    // Starting on the 25th, prepare next month too.
    if (day >= 25) {
      const next =
        month === 12
          ? { year: year + 1, month: 1 }
          : { year, month: month + 1 };

      prefetchMonth(next.year, next.month).catch(() => {});
    }
  }

  window.KastnerLunchMenu = {
    open,
    close,
    openOfficial,
    prefetchCurrentMenus
  };
})();
