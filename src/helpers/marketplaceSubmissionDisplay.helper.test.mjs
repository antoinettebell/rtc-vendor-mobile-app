import assert from "node:assert/strict";
import { getMarketplaceSubmissionDisplayStatus } from "./marketplaceSubmissionDisplay.helper.js";

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
