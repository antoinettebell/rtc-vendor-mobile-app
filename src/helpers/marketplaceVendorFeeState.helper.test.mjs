import assert from "node:assert/strict";
import {
  canPayMarketplaceVendorFee,
  isMarketplaceVendorFeePaid,
} from "./marketplaceVendorFeeState.helper.js";

assert.equal(
  canPayMarketplaceVendorFee({
    application_status: "PAYMENT_DUE",
    payment_status: "PENDING",
  }),
  true,
);
assert.equal(
  canPayMarketplaceVendorFee({
    application_status: "PAYMENT_DUE",
    payment_status: "PAID",
  }),
  false,
);
assert.equal(
  canPayMarketplaceVendorFee({ application_status: "PAID" }),
  false,
);
assert.equal(
  canPayMarketplaceVendorFee({ application_status: "CONFIRMED" }),
  false,
);
assert.equal(
  isMarketplaceVendorFeePaid({ payment_status: "paid" }),
  true,
);

console.log("marketplace vendor fee state tests passed");
