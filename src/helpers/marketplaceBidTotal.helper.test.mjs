import assert from "node:assert/strict";
import { getMarketplaceBidTotal } from "./marketplaceBidTotal.helper.js";

assert.equal(getMarketplaceBidTotal({ full_bid_amount: 1250 }), 1250);
assert.equal(getMarketplaceBidTotal({
  full_bid_amount: 1250,
  specialty_services: ["DESSERTS", "DRINKS"],
  dessert_bid_amount: 150,
  drinks_bid_amount: 100,
}), 1500);
assert.equal(getMarketplaceBidTotal({
  full_bid_amount: 75,
  specialty_services: ["DESSERTS"],
  dessert_bid_amount: 75,
  total_bid_amount: 75,
}), 75);

console.log("vendor marketplace bid total tests passed");
