// scripts/test.mjs — tests for irctc-mcp (station lookup).
//
// Run with:  node scripts/test.mjs
//
// These tests exercise the offline station_lookup path, which needs no network.
// The live IRCTC tools (train_schedule / pnr_status) hit a third-party service
// and are intentionally not asserted here.

import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const lib = (p) => pathToFileURL(resolve(dir, "..", "lib", p)).href;

const { findStation, getStation, countStations } = await import(lib("stations.js"));

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  console.log(`  ok  ${name}`);
  passed++;
}

console.log("station_lookup tests");

// Exact code lookup (case-insensitive).
const csmt = await findStation("csmt");
ok("findStation('csmt') returns CST station", csmt && csmt.code === "CST");
ok("station has required fields", csmt && ["code", "name", "city", "state", "zone"].every((k) => k in csmt));

// Code lookup by full code.
const ndls = await findStation("NDLS");
ok("findStation('NDLS') returns New Delhi station", ndls && ndls.code === "NDLS");

// Name / city substring lookup.
const pune = await findStation("Pune");
ok("findStation('Pune') matches a Pune station", pune && pune.city.toLowerCase().includes("pune"));

const howrah = await findStation("Howrah");
ok("findStation('Howrah') matches a Howrah station", howrah && howrah.name.toLowerCase().includes("howrah"));

// Unknown query returns null.
const none = await findStation("ZZZZZZ-nope");
ok("findStation('unknown') returns null", none === null);

// getStation throws on unknown input.
await assert.rejects(() => getStation("ZZZZZZ-nope"), /No station found/);
ok("getStation throws for unknown query", true);

// getStation succeeds for a known code.
const s = await getStation("BCT");
ok("getStation('BCT') returns a station", s && s.code === "BCT");

// Dataset is populated.
const n = await countStations();
ok("dataset has >= 100 stations", n >= 100);

console.log(`\n${passed} checks passed.`);
