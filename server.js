// server.js — irctc-mcp: an MCP server for Indian Railway data.
//
// Exposes:
//   - station_lookup : station code / name / city from a bundled static dataset
//   - train_schedule : a train's route & stops via IRCTC's live listByTrainNo API
//   - pnr_status     : PNR booking status via the same IRCTC API
//
// Runs over the MCP stdio transport. See README.md for client config.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getStation } from "./lib/stations.js";
import { getTrainSchedule, getPnrStatus } from "./lib/irctc.js";

async function main() {
  const transport = new StdioServerTransport();
  const server = new McpServer({
    name: "irctc-mcp",
    version: "1.0.0",
  });

  server.tool(
    "station_lookup",
    "Look up an Indian Railway station by its station code " +
      '(e.g. "NDLS", "CSMT", "BCT") or by a name / city substring ' +
      '(e.g. "New Delhi", "Pune"). Returns the station code, name, ' +
      "city, state and railway zone. This uses a bundled offline dataset " +
      "so it always works, even when IRCTC is down.",
    {
      code: z
        .string()
        .describe("Station code (e.g. NDLS) or a station name / city to search."),
    },
    async ({ code }) => {
      if (typeof code !== "string" || !code.trim()) {
        throw new Error("A non-empty 'code' argument is required.");
      }
      const station = await getStation(code);
      return {
        content: [{ type: "text", text: JSON.stringify(station, null, 2) }],
        structuredContent: station,
      };
    },
  );

  server.tool(
    "train_schedule",
    "Get a train's full route and stop-by-stop schedule (arrival / " +
      "departure times, distance, platform, day count) from IRCTC's live " +
      "data. Pass the train number WITHOUT its date suffix " +
      '(e.g. "12301" for "12301 Howrah Rajdhani"). This is a live third ' +
      "party service; if the endpoint is unavailable it will report the " +
      "error instead of returning wrong data.",
    {
      trainNo: z
        .string()
        .describe("Train number, e.g. 12301 (no date suffix)."),
    },
    async ({ trainNo }) => {
      if (typeof trainNo !== "string" || !trainNo.trim()) {
        throw new Error("A non-empty 'trainNo' argument is required.");
      }
      const result = await getTrainSchedule(trainNo.trim());
      if (!result.found || !result.schedule) {
        return {
          content: [
            {
              type: "text",
              text:
                "No schedule returned for train " +
                trainNo.trim() +
                ". The train number may be invalid, or IRCTC's endpoint " +
                "may be unavailable right now.",
            },
          ],
          structuredContent: result,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.schedule, null, 2),
          },
        ],
        structuredContent: result,
      };
    },
  );

  server.tool(
    "pnr_status",
    "Check the booking status of an Indian Railway PNR (10-digit " +
      "number) — coach / seat / current status of each passenger — from " +
      "IRCTC's live data. This is a live third party service; if the " +
      "endpoint is unavailable it will report the error.",
    {
      pnr: z
        .string()
        .describe("10-digit PNR number, e.g. 4688452310."),
    },
    async ({ pnr }) => {
      if (typeof pnr !== "string" || !pnr.trim()) {
        throw new Error("A non-empty 'pnr' argument is required.");
      }
      const result = await getPnrStatus(pnr.trim());
      if (!result.found || !result.pnr) {
        return {
          content: [
            {
              type: "text",
              text:
                "No PNR data returned for " +
                pnr.trim() +
                ". The PNR may be invalid, or IRCTC's endpoint " +
                "may be unavailable right now.",
            },
          ],
          structuredContent: result,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.pnr, null, 2),
          },
        ],
        structuredContent: result,
      };
    },
  );

  await server.connect(transport);
  console.log("irctc-mcp server listening on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting irctc-mcp:", err);
  process.exit(1);
});
