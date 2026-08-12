import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const screens = {
  nearMe: await readFile(new URL("../screens/vendorMarketplaceNearMeScreen.js", import.meta.url), "utf8"),
  eventDetails: await readFile(new URL("../screens/vendorMarketplaceEventDetailsScreen.js", import.meta.url), "utf8"),
  application: await readFile(new URL("../screens/vendorMarketplaceApplicationScreen.js", import.meta.url), "utf8"),
  bidResponse: await readFile(new URL("../screens/vendorMarketplaceBidResponseScreen.js", import.meta.url), "utf8"),
  savedBidDetails: await readFile(new URL("../screens/vendorMarketplaceBidDetailScreen.js", import.meta.url), "utf8"),
};

for (const [screen, source] of Object.entries(screens)) {
  assert.match(source, /getFoodVendorMarketplaceGuestRows/, `${screen} renders contextual guest rows`);
  assert.match(source, /Application\/Bid Deadline/, `${screen} renders the submission deadline`);
  assert.match(source, /getFoodVendorMarketplaceCloseDate/, `${screen} uses the event close date`);
  assert.doesNotMatch(source, /Estimated Guests/, `${screen} does not fall back to an irrelevant generic guest row`);
}

assert.match(screens.eventDetails, /bothPay \? "BOTH" : vendorPays \? "APPLICATION" : "BID"/);
assert.match(screens.application, /participationPath: "APPLICATION"/);
assert.match(screens.bidResponse, /coverage: guestCoverage/);
assert.match(screens.savedBidDetails, /coverage: bid\?\.guest_coverage/);
console.log("Food Vendor Marketplace guest-count screen-wiring tests passed.");
