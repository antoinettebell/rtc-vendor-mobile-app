import assert from "node:assert/strict";
import { getMarketplaceEventSupportId } from "./marketplaceSupportId.helper.js";

assert.equal(
  getMarketplaceEventSupportId({ event_id: "0fc85ee1-5e5a-4d42-9806-04c2a279f944" }),
  "0FC85E",
);
assert.equal(
  getMarketplaceEventSupportId({}, { event_id: "3ed0af8c-1fc9-47dc-af35-8086a576f40c" }),
  "3ED0AF",
);
assert.equal(getMarketplaceEventSupportId({}), "");

console.log("marketplace event support ID tests passed");
