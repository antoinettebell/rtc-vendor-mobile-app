import assert from "node:assert/strict";
import { getMarketplaceEventLocation } from "./marketplaceEventLocation.helper.js";

assert.equal(
  getMarketplaceEventLocation({
    event_address: "100 Main St",
    event_city: "Columbia",
    event_state: "SC",
    event_zip: "29201",
  }),
  "100 Main St, Columbia, SC 29201",
);
assert.equal(
  getMarketplaceEventLocation({
    exact_address_locked: true,
    event_address: "100 Main St",
    event_city: "Columbia",
    event_state: "SC",
    event_zip: "29201",
  }),
  "Columbia, SC",
);
assert.equal(
  getMarketplaceEventLocation({ formatted_address: "100 Main St, Columbia, SC 29201" }),
  "100 Main St, Columbia, SC 29201",
);

console.log("marketplace event location tests passed");
