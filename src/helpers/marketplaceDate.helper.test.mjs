import assert from "node:assert/strict";
import {
  formatMarketplaceCalendarDate,
  formatMarketplaceZonedDate,
} from "./marketplaceDate.helper.js";

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
assert.equal(
  formatMarketplaceZonedDate(
    "2026-08-18T03:00:00.000Z",
    "America/New_York",
  ),
  "08/17/2026",
);

console.log("vendor marketplace date tests passed");
