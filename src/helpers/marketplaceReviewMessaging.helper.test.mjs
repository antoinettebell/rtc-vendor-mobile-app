import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const messages = read("screens/vendorMarketplaceMessagesScreen.js");
const bids = read("screens/vendorMarketplaceMyBidsScreen.js");
const applications = read("screens/vendorMarketplaceMyApplicationsScreen.js");
const awarded = read("screens/vendorMarketplaceAwardedBidsScreen.js");
const bidDetail = read("screens/vendorMarketplaceBidDetailScreen.js");
const applicationDetail = read("screens/vendorMarketplaceApplicationDetailScreen.js");
const eventVendorDetail = read("screens/eventVendorSubmissionDetailsScreen.js");

assert.match(messages, /bid_id: bidId/);
assert.match(messages, /application_id: applicationId/);
assert.match(messages, /getMarketplaceMessageError/);
assert.match(messages, /questionText\.trim\(\)\.length < 3/);
assert.match(messages, /bid_id: bidId/);
assert.match(messages, /application_id: applicationId/);
assert.match(bids, /bidId: item\.bid_id/);
assert.match(applications, /applicationId: item\.application_id/);
assert.match(awarded, /bidId: item\.bid\?\.bid_id/);
assert.match(bidDetail, /MarketplaceImageViewer/);
assert.match(applicationDetail, /MarketplaceImageViewer/);
assert.match(eventVendorDetail, /Message Coordinator/);

console.log("vendor marketplace review and messaging tests passed");
