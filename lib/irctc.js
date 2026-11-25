// lib/irctc.js — Live train schedule and PNR status via IRCTC's own endpoint.
//
// IRCTC has no official public API. The endpoint IRCTC's own website and app
// use to list a train's route is:
//
//   POST https://www.irctc.co.in/netTicket/v3/trains/listByTrainNo
//
// It returns a single response object that contains BOTH the train's route
// (schedule) and, when the train number belongs to a PNR, the PNR details.
// We parse whichever parts are present.
//
// NOTE: This is a live third-party service. It can change its request format,
// add bot protection, or go down at any time. If it fails, the tool reports
// the error clearly instead of silently returning wrong data. Fall back to the
// bundled static `station_lookup` dataset for anything that doesn't need live
// data.

const BASE = "https://www.irctc.co.in/netTicket/v3/trains/listByTrainNo";

// A normal desktop browser User-Agent. IRCTC's endpoint sometimes rejects
// requests that look like bots without a realistic UA.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Call the IRCTC listByTrainNo endpoint for a single train number.
 * @param {string} trainNo e.g. "12301"
 * @returns {Promise<object>} the parsed JSON body (or an empty object)
 */
export async function callListByTrainNo(trainNo) {
  const payload = {
    stationFrom: "",
    stationTo: "",
    trainNo: trainNo,
    fromStationCode: "",
    toStationCode: "",
    date: "",
    trainSource: "",
    trainDest: "",
    txnToken: "",
    txnTokenId: "",
    txnTokenKey: "",
  };

  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Accept: "application/json, text/plain, */*",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `IRCTC request failed (HTTP ${res.status}). The endpoint may have changed ` +
        `or rate-limited the request.`,
    );
  }

  try {
    return await res.json();
  } catch (e) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `IRCTC returned a non-JSON response (HTTP ${res.status}). ` +
        `Endpoint may have changed.`,
    );
  }
}

/**
 * Build a human-readable train schedule (route) from the raw IRCTC response.
 * @param {object} data raw JSON from callListByTrainNo
 * @returns {object|null} normalised schedule or null if absent
 */
export function parseSchedule(data) {
  if (!data || !data.data) return null;
  const d = data.data;
  const route = d.route || d.routeInfo || [];
  const stops = Array.isArray(route)
    ? route.map((r, i) => ({
        stopSeq: i + 1,
        stationCode: r.stationCode || r.stationFrom || "",
        stationName: r.stationName || r.stationTo || "",
        arrivalTime: r.arrivalTime || r.arrTime || null,
        departureTime: r.departureTime || r.deptTime || null,
        distanceKm: r.distanceKm || r.distance || null,
        dayCount: r.dayCount || r.day || null,
        platform: r.platform || null,
      }))
    : [];

  return {
    trainNo: d.trainNo || d.trainNumber || "",
    trainName: d.trainName || d.trainName || "",
    date: d.date || "",
    totalStops: stops.length,
    stops,
  };
}

/**
 * Build PNR status from the raw IRCTC response.
 * @param {object} data raw JSON from callListByTrainNo
 * @returns {object|null} normalised PNR or null if absent
 */
export function parsePnr(data) {
  if (!data || !data.data) return null;
  const d = data.data;
  const pnr = d.pnr || d.pnrInfo || {};
  if (!pnr && !d.pnrStatus) return null;
  return {
    pnr: d.pnr || pnr.pnr || d.pnrStatus?.pnr || "",
    trainNo: d.trainNo || d.trainNumber || "",
    stationCode: d.stationCode || "",
    stationName: d.stationName || "",
    dateOfJourney: d.dateOfJourney || d.doj || "",
    class: d.class || d.qclass || "",
    passengers: Array.isArray(d.passengers)
      ? d.passengers.map((p) => ({
          passengerId: p.passengerId || "",
          bookingStatus: p.bookingStatus || "",
          currentStatus: p.currentStatus || "",
          coach: p.coach || "",
          seat: p.seat || "",
          fromStation: p.fromStation || "",
          toStation: p.toStation || "",
        }))
      : [],
    chartPrepared: !!d.chartPrepared,
  };
}

/**
 * Fetch and normalise a train's route/schedule.
 * @param {string} trainNo
 * @returns {Promise<object>} { found, schedule, raw }
 */
export async function getTrainSchedule(trainNo) {
  const data = await callListByTrainNo(trainNo);
  const schedule = parseSchedule(data);
  return {
    found: Boolean(schedule),
    schedule,
    raw: data,
  };
}

/**
 * Fetch and normalise PNR status.
 * @param {string} pnr
 * @returns {Promise<object>} { found, pnr, raw }
 */
export async function getPnrStatus(pnr) {
  const data = await callListByTrainNo(pnr);
  const pnrInfo = parsePnr(data);
  return {
    found: Boolean(pnrInfo),
    pnr: pnrInfo,
    raw: data,
  };
}
