import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sharedLanding = await readFile(new URL("../components/VendorMarketplaceLanding.js", import.meta.url), "utf8");
const primitives = await readFile(new URL("../components/VendorMarketplacePrimitives.js", import.meta.url), "utf8");
const foodLanding = await readFile(new URL("../screens/vendorMarketplaceScreen.js", import.meta.url), "utf8");
const eventLanding = await readFile(new URL("../screens/eventVendorMarketplaceScreen.js", import.meta.url), "utf8");
const foodNearMe = await readFile(new URL("../screens/vendorMarketplaceNearMeScreen.js", import.meta.url), "utf8");
const foodBids = await readFile(new URL("../screens/vendorMarketplaceMyBidsScreen.js", import.meta.url), "utf8");
const foodApplications = await readFile(new URL("../screens/vendorMarketplaceMyApplicationsScreen.js", import.meta.url), "utf8");
const foodAwards = await readFile(new URL("../screens/vendorMarketplaceAwardedBidsScreen.js", import.meta.url), "utf8");
const eventApplication = await readFile(new URL("../screens/eventVendorApplicationScreen.js", import.meta.url), "utf8");
const eventDetails = await readFile(new URL("../screens/eventVendorSubmissionDetailsScreen.js", import.meta.url), "utf8");

const orderedLabels = ["Marketplace / Near Me", "My Bids", "My Applications", "Awarded Events"];
let prior = -1;
for (const label of orderedLabels) {
  const index = sharedLanding.indexOf(label);
  assert(index > prior, `${label} remains in the canonical navigation order`);
  prior = index;
}
for (const source of [foodLanding, eventLanding]) {
  assert.match(source, /VendorMarketplaceLanding/);
  assert.match(source, /VendorMarketplacePage/);
}
assert.match(primitives, /MarketplaceHeader/);
assert.match(sharedLanding, /View sourcing events and food opportunities near you\./);
assert.match(sharedLanding, /Track applications submitted for vendor-paid events\./);
for (const component of [
  "VendorMarketplacePage", "VendorMarketplaceCard", "VendorMarketplaceStatusBadge",
  "VendorMarketplaceActionRow", "VendorMarketplaceLoadingState", "VendorMarketplaceEmptyState",
  "VendorMarketplaceErrorState", "VendorMarketplaceHeroImages", "VendorMarketplaceSectionCard",
]) assert.match(primitives, new RegExp(component));
for (const source of [foodNearMe, eventLanding]) {
  assert.match(source, /VendorMarketplaceCard/);
  assert.match(source, /VendorMarketplaceLoadingState/);
  assert.match(source, /VendorMarketplaceEmptyState/);
}
for (const source of [foodBids, foodApplications, foodAwards, eventLanding]) {
  assert.match(source, /VendorMarketplaceCard/);
  assert.match(source, /VendorMarketplaceStatusBadge/);
}
assert.doesNotMatch(eventLanding, /sectionButton|sectionButtonActive|sectionTextActive/);
assert.doesNotMatch(eventLanding, /\[\['MARKETPLACE'.*'BIDS'.*'APPLICATIONS'.*'AWARDED'/s);
assert.match(eventLanding, /VendorMarketplaceCard/);
assert.match(eventLanding, /VendorMarketplaceLoadingState/);
assert.match(eventLanding, /RefreshControl/);
assert.match(eventLanding, /No matching events are accepting applications/);
for (const source of [eventApplication, eventDetails]) {
  assert.match(source, /marketplaceStyles/);
  assert.match(source, /MarketplaceVendorScreenLayout/);
  assert.match(source, /VendorMarketplaceSectionCard/);
}
assert.match(eventApplication, /VendorMarketplaceHeroImages/);
assert.match(eventLanding, /VendorMarketplaceActionRow/);
assert.match(sharedLanding, /ROUND THE CORNER/);
assert.match(sharedLanding, /Vendor Event Marketplace/);
assert.match(sharedLanding, /chevron-right/);

console.log("one Vendor Marketplace UI parity tests passed");
