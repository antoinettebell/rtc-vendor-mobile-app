import assert from "node:assert/strict";
import { formatMarketplaceCalendarDate } from "./marketplaceDate.helper.js";

assert.equal(formatMarketplaceCalendarDate(null), "Not set");
assert.equal(formatMarketplaceCalendarDate("2026-08-18"), "08/18/2026");
assert.equal(
  formatMarketplaceCalendarDate("2026-08-18T00:00:00.000Z"),
  "08/18/2026",
);
assert.equal(
  formatMarketplaceCalendarDate(new Date("2026-08-18T00:00:00.000Z")),
  "08/18/2026",
);
assert.equal(formatMarketplaceCalendarDate("not-a-date"), "not-a-date");

console.log("vendor marketplace calendar-date tests passed");
