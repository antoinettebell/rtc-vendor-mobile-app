import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveFoodMarketplaceNotificationDestination } from "./marketplaceNotificationCenter.helper.js";

const rejectedBid = {
  bid_id: "bid-rejected",
  bid_status: "NOT_AWARDED",
  marketplaceEvent: { event_id: "event-1", event_name: "Coordinator Pays Catering" },
};
const bidDestination = await resolveFoodMarketplaceNotificationDestination({
  notification: { type: "MARKETPLACE_BID", event_id: "event-1", bid_id: "bid-rejected" },
  loadBids: async () => ({ data: { marketplaceBidList: [rejectedBid] } }),
  loadApplications: async () => { throw new Error("application lookup should not run"); },
});
assert.equal(bidDestination.route, "VendorBidDetailScreen");
assert.equal(bidDestination.params.bid, rejectedBid);
assert.equal(bidDestination.params.event.event_id, "event-1");

const rejectedApplication = {
  application_id: "application-rejected",
  application_status: "NOT_SELECTED",
  event: { event_id: "event-2" },
};
const applicationDestination = await resolveFoodMarketplaceNotificationDestination({
  notification: {
    type: "MARKETPLACE_APPLICATION",
    event_id: "event-2",
    application_id: "application-rejected",
  },
  loadBids: async () => { throw new Error("bid lookup should not run"); },
  loadApplications: async () => ({ data: { marketplaceApplicationList: [rejectedApplication] } }),
});
assert.equal(applicationDestination.route, "VendorApplicationDetailScreen");
assert.equal(applicationDestination.params.application, rejectedApplication);

const missingBid = await resolveFoodMarketplaceNotificationDestination({
  notification: { type: "MARKETPLACE_BID", event_id: "event-3", bid_id: "missing" },
  loadBids: async () => ({ data: { marketplaceBidList: [] } }),
  loadApplications: async () => ({ data: { marketplaceApplicationList: [] } }),
});
assert.equal(missingBid.route, "VendorMyBidsScreen");

const [homeScreen, nearMeScreen, marketplaceShared] = await Promise.all([
  readFile(new URL("../screens/homeScreen.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/vendorMarketplaceNearMeScreen.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/vendorMarketplaceShared.js", import.meta.url), "utf8"),
]);
assert.match(homeScreen, /resolveFoodMarketplaceNotificationDestination/);
assert.match(nearMeScreen, /resolveFoodMarketplaceNotificationDestination/);
assert.match(marketplaceShared, /event\?\.paymentType/);
assert.doesNotMatch(marketplaceShared, /event\.paymentType/);

console.log("marketplace notification routing tests passed");
