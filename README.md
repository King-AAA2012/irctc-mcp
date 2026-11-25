# irctc-mcp

An [MCP](https://modelcontextprotocol.io) server that exposes tools for looking
up **Indian Railway** data from IRCTC — station details, train schedules, and
PNR status.

## Tools

| Tool             | What it does                                                                 | Data source |
| ---------------- | ---------------------------------------------------------------------------- | ----------- |
| `station_lookup` | Look up a station by code (e.g. `NDLS`, `CSMT`) or by name/city. Returns code, name, city, state, zone. | **Static** — bundled offline dataset, always works |
| `train_schedule` | A train's full route and stop-by-stop schedule (arrival/departure, distance, platform, day). | **Live** — IRCTC's own `listByTrainNo` API |
| `pnr_status`     | PNR booking status — coach/seat/current status per passenger.                | **Live** — IRCTC's own `listByTrainNo` API |

### Data source note

- **`station_lookup` is static/offline.** It reads `data/stations.json`, a small
  bundled dataset of ~200 major Indian Railway stations. It needs no network,
  API key, or login, so it always works — even when IRCTC is down.
- **`train_schedule` and `pnr_status` are live.** They call IRCTC's own website
  endpoint (`https://www.irctc.co.in/netTicket/v3/trains/listByTrainNo`, the
  same one IRCTC's web/app use). IRCTC has **no official public API**, so this
  endpoint is unofficial and can change its request format, add bot protection,
  or go down at any time. If it's unavailable, the tool reports the error
  clearly rather than returning wrong data.

## Quick start

Requires **Node.js >= 18** (uses ESM and native `fetch`).

```bash
cd irctc-mcp
npm install      # installs @modelcontextprotocol/sdk
npm start        # runs: node server.js (stdio transport)
npm test         # runs the station-lookup tests
```

`npm run dev` runs the server with `--watch` for development.

## MCP client configuration (stdio)

Add this to your MCP client's config (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "irctc": {
      "command": "node",
      "args": ["/absolute/path/to/irctc-mcp/server.js"],
      "transportType": "stdio"
    }
  }
}
```

> Replace `/absolute/path/to/irctc-mcp/server.js` with the real path on your
> machine. On Windows use a forward-slash absolute path, e.g.
> `C:/Users/Aditya Shah/Desktop/Code/india-mcp/irctc-mcp/server.js`.

## Tool examples

### station_lookup

Input: `{ "code": "NDLS" }`

```json
{
  "code": "NDLS",
  "name": "New Delhi",
  "city": "New Delhi",
  "state": "Delhi",
  "zone": "Northern Railway"
}
```

You can also search by name or city: `{ "code": "Pune" }` or `{ "code": "Howrah" }`.

### train_schedule

Input: `{ "trainNo": "12301" }`

Returns the train's route with each stop's arrival/departure time, distance,
platform, and day count. Pass the train number **without** its date suffix
(`12301`, not `12301-241120`).

### pnr_status

Input: `{ "pnr": "4688452310" }`

Returns the PNR's train, date, class, and each passenger's booking / current
status, coach, and seat.

## Development

```bash
node scripts/test.mjs   # run the tests directly
```

The tests cover the offline station-lookup path (no network needed). The live
IRCTC tools are not asserted in the test suite because they depend on a
third-party service.

## License

MIT — see [LICENSE](./LICENSE).
