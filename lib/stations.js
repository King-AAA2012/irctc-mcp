// lib/stations.js — Station lookup from a static, bundled dataset.
//
// The dataset (data/stations.json) is a small, reliable, offline collection of
// ~200 major Indian Railway stations. It needs no external service, API key, or
// network access, so station lookups always work even when IRCTC is down.
//
// Station codes (e.g. "NDLS", "CSMT") are unique by design in Indian Railways,
// so we index by code and fall back to a case-insensitive name/city match.

import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";

let DATA = null;
let INDEX = null; // { byCode: Map, byName: Map }

async function loadData() {
  if (DATA) return DATA;
  const here = new URL("../data/stations.json", import.meta.url);
  const raw = await readFile(here, "utf8");
  DATA = JSON.parse(raw);
  INDEX = { byCode: new Map(), byName: new Map(), byAlias: new Map() };
  for (const s of DATA) {
    INDEX.byCode.set(s.code.toUpperCase(), s);
    INDEX.byName.set(s.name.toLowerCase(), s);
    for (const a of s.aliases ?? []) {
      INDEX.byAlias.set(String(a).trim().toUpperCase(), s);
    }
  }
  return DATA;
}

function norm(s) {
  return String(s ?? "").trim().toUpperCase();
}

/**
 * Look up a station by its station code (e.g. "NDLS") or by a name/city
 * substring (e.g. "New Delhi", "Pune"). Returns the station object or null.
 * @param {string} codeOrQuery
 * @returns {Promise<object|null> | object|null}
 */
export async function findStation(codeOrQuery) {
  await loadData();
  const q = norm(codeOrQuery);
  if (!q) return null;
  // Exact code match first (fastest and most precise).
  const byCode = INDEX.byCode.get(q);
  if (byCode) return byCode;
  // Known alias (e.g. "CSMT" -> CST).
  if (INDEX.byAlias.has(q)) return INDEX.byAlias.get(q);
  // Name/city substring match (case-insensitive).
  for (const s of DATA) {
    const name = s.name.toLowerCase();
    const city = s.city.toLowerCase();
    const state = s.state.toLowerCase();
    if (
      name.includes(q.toLowerCase()) ||
      city.includes(q.toLowerCase()) ||
      state.includes(q.toLowerCase())
    ) {
      return s;
    }
  }
  return null;
}

/**
 * Resolve a single station query to the best matching station, or throw a
 * friendly error if nothing matched. Used by the server's CallTool handler.
 * @param {string} codeOrQuery
 * @returns {Promise<object>}
 */
export async function getStation(codeOrQuery) {
  const s = await findStation(codeOrQuery);
  if (!s) {
    throw new Error(`No station found for "${codeOrQuery}".`);
  }
  return s;
}

/**
 * @returns {Promise<number>} number of stations in the bundled dataset.
 */
export async function countStations() {
  await loadData();
  return DATA.length;
}

export { DATA };
