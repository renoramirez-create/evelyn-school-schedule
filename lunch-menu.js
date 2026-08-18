(() => {
  "use strict";

  const STATIC_DATA_URL = "./data/lunch-menu.json";
  const LOCAL_CACHE_KEY = "kastner-lunch-menu-cache-v2";
  const SCHOOL = "kastner";
  const MENU_TYPE = "lunch";

  const API_BASES = [
    "https://cusd.api.nutrislice.com",
    "https://cusd.nutrislice.com"
  ];

  let activeIsoDate = null;
  let syncedData = { menus: {} };
  let staticDataLoaded = false;

  function officialMenuUrl(iso) {
    return `https://cusd.nutrislice.com/menu/${SCHOOL}/${MENU_TYPE}/${iso}`;
  }

  function readLocalCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeLocalCache(cache) {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // App still works without browser storage.
    }
  }

  function dedupe(items) {
    const seen = new Set();

    return (Array.isArray(items) ? items : [])
      .map(item => String(item || "").trim())
      .filter(Boolean)
      .filter(item => {
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  async function loadStaticData() {
    try {
      const response = await fetch(
        `${STATIC_DATA_URL}?v=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Static lunch file returned ${response.status}`);
      }

      const data = await response.json();

      syncedData = {
        updatedAt: data.updatedAt || null,
        source: data.source || "GitHub sync",
        menus: data.menus || {}
      };

      staticDataLoaded = true;
      return syncedData;
    } catch {
      staticDataLoaded = true;
      return syncedData;
    }
  }

  function getStaticRecord(iso) {
    const record = syncedData.menus?.[iso];

    if (!record) return null;

    return {
      iso,
      items: dedupe(record.items),
      holidayText: record.holidayText || null,
      source: "synced",
      updatedAt: syncedData.updatedAt || null
    };
  }

  function getLocalRecord(iso) {
    const record = readLocalCache()[iso];

    if (!record) return null;

    return {
      iso,
      items: dedupe(record.items),
      holidayText: record.holidayText || null,
      source: "phone-cache",
      updatedAt: record.updatedAt || null
    };
  }

  function saveLocalRecord(record) {
    if (!record?.iso) return;

    const cache = readLocalCache();

    cache[record.iso] = {
      items: dedupe(record.items),
      holidayText: record.holidayText || null,
      updatedAt: Date.now()
    };

    writeLocalCache(cache);
  }

  async function fetchLiveDigest(iso) {
    const path = iso.replaceAll("-", "/");
    let lastError = null;

    for (const base of API_BASES) {
      const url =
        `${base}/menu/api/digest/school/${SCHOOL}/menu-type/${MENU_TYPE}/date/${path}/?format=json`;

      try {
        const response = await fetch(url, {
          mode: "cors",
          cache: "no-store",
          headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        const record = {
          iso,
          items: dedupe(data.menu_items || data.items || []),
          holidayText: data.holiday_text || data.holidayText || null,
          source: "live-api",
          updatedAt: Date.now()
        };

        saveLocalRecord(record);
        return record;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Live Nutrislice API unavailable.");
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

  function sourceText(record) {
    if (record.source === "synced") {
      return "Synced by GitHub from Kastner's Nutrislice menu.";
    }

    if (record.source === "live-api") {
      return "Loaded live from Nutrislice and saved on this phone.";
    }

    if (record.source === "phone-cache") {
      return "Showing the last lunch menu saved on this phone.";
    }

    return "";
  }

  function renderRecord(record) {
    const itemsEl = document.getElementById("lunchItems");
    const statusEl = document.getElementById("lunchStatus");
    const syncSourceEl = document.getElementById("lunchSyncSource");
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
        `<div class="lunch-empty">Use the live Nutrislice button below to check the official page.</div>`;
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

    if (syncSourceEl) {
      syncSourceEl.textContent = sourceText(record);
    }

    if (cacheNote) {
      cacheNote.textContent =
        "The live menu button always opens the official Kastner Nutrislice page in a new tab.";
    }
  }

  function showModal(iso) {
    activeIsoDate = iso;

    const overlay = document.getElementById("lunchOverlay");
    const dateLabel = document.getElementById("lunchDateLabel");

    if (!overlay) return;

    overlay.classList.add("show");

    if (dateLabel) {
      dateLabel.textContent = prettyDate(iso);
    }
  }

  async function openOrLive(iso) {
    activeIsoDate = iso;

    if (!staticDataLoaded) {
      await loadStaticData();
    }

    const staticRecord = getStaticRecord(iso);
    const localRecord = getLocalRecord(iso);

    if (staticRecord?.items?.length) {
      showModal(iso);
      renderRecord(staticRecord);
      return;
    }

    if (localRecord?.items?.length) {
      showModal(iso);
      renderRecord(localRecord);

      // Quietly attempt a fresher live copy.
      fetchLiveDigest(iso)
        .then(record => {
          if (activeIsoDate === iso) {
            renderRecord(record);
          }
        })
        .catch(() => {});

      return;
    }

    // No synced copy exists. Open the official page immediately in a new tab
    // so the student never gets stuck on a failed sync screen.
    window.open(
      officialMenuUrl(iso),
      "_blank",
      "noopener,noreferrer"
    );

    // Still try the API in the background for next time.
    fetchLiveDigest(iso).catch(() => {});
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

  async function prefetchCurrentMenus() {
    await loadStaticData();

    // If the static sync file already has data, no browser-side API fetch
    // is needed on every app load.
    if (Object.keys(syncedData.menus || {}).length) {
      return;
    }
  }

  window.KastnerLunchMenu = {
    openOrLive,
    close,
    openOfficial,
    prefetchCurrentMenus
  };
})();
