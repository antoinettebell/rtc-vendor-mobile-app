import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getMarketplaceSubmissionDisplayStatus } from "./marketplaceSubmissionDisplay.helper.js";

assert.equal(
  getMarketplaceSubmissionDisplayStatus(
    { bid_status: "AWARDED", award_amendment_status: "AWAITING_VENDOR" },
    "AWARDED",
  ),
  "REVISED",
);

const myBidsScreen = await readFile(
  new URL("../screens/vendorMarketplaceMyBidsScreen.js", import.meta.url),
  "utf8",
);
assert.match(myBidsScreen, /label: "Revised", value: "REVISED"/);
assert.match(myBidsScreen, /VendorAwardedEventDetailsScreen/);
assert.match(myBidsScreen, /Review Headcount Change/);
assert.equal(
  getMarketplaceSubmissionDisplayStatus(
    { award_revoked_at: "2026-08-16T12:00:00.000Z" },
    "NOT_SELECTED",
  ),
  "REVOKED",
);
assert.equal(
  getMarketplaceSubmissionDisplayStatus({}, "NOT_SELECTED"),
  "NOT_SELECTED",
);
assert.equal(
  getMarketplaceSubmissionDisplayStatus({}, "NOT_AWARDED"),
  "NOT_AWARDED",
);

console.log("marketplace submission display tests passed");
