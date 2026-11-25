---
name: irctc-mcp
version: 0.1.0
description: MCP server for Indian Railway data — station lookup (offline) and live train schedule / PNR status via IRCTC.
author: King-AAA2012
license: MIT
---

# irctc-mcp â€” Skill

A single MCP (Model Context Protocol) server for Indian data. It lets Claude
Desktop, Claude Code, Cline, or any other MCP client call tools backed by real
Indian data.


## Tools

  | `station_lookup` | Look up a station by code (e.g. `NDLS`, `CSMT`) or by name/city. Returns code, name, city, state, zone. | **Static** — bundled offline dataset, always works |
  | `train_schedule` | A train's full route and stop-by-stop schedule (arrival/departure, distance, platform, day). | **Live** — IRCTC's own `listByTrainNo` API |
  | `pnr_status` | PNR booking status — coach/seat/current status per passenger. | **Live** — IRCTC's own `listByTrainNo` API |

## Requirements
- **Node.js 18+
No API key is required â€” the package works fully offline.

## How to Install / Run

```bash
npm install
node server.js      # boots the MCP server over stdio
```

### Register with an MCP client

Add a server entry to your MCP client config JSON:

```json
{
  "mcpServers": {
    "irctc-mcp": {
      "command": "node",
      "args": ["C:/Users/Aditya Shah/Desktop/Code/irctc-mcp/server.js"]
    }
  }
}
```

## How to Verify (Tests)

```bash
npm test
```

## Selling / Redistributing

This skill is provided under MIT, so it may be sold or redistributed. Ship it
as its own zip (irctc-mcp-0.1.0.zip) in the packages/ folder alongside the other
india-mcp packages.

