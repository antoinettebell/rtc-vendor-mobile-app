import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("./signupCatalog.helper.js", import.meta.url),
  "utf8",
);
const {
  shouldShowPlanAddOns,
  getPlanAddOnsForFlow,
  reconcileSelectedAddOnsForPlan,
  isAdSpaceAddOn,
} = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`,
);

assert.equal(
  shouldShowPlanAddOns({
    isSignupFlow: true,
    selectedPlan: { slug: "SUB_BASIC" },
  }),
  true,
  "Food Vendor signup keeps the existing printer/add-on catalog visible",
);

const printer = {
  _id: "printer",
  name: "Bluetooth Order/Receipt Printing",
  priceLabel: "$50 one-time fee",
};
assert.deepEqual(
  getPlanAddOnsForFlow({
    isSignupFlow: true,
    selectedPlan: { slug: "SUB_BASIC" },
    addOns: [printer],
  }),
  [printer],
  "Food Vendor signup renders the existing Bluetooth Order/Receipt Printing add-on unchanged",
);
const adSpace = { _id: "ad-space", name: "Ad Space", priceLabel: "$125/month" };
assert.deepEqual(
  getPlanAddOnsForFlow({ isSignupFlow: true, selectedPlan: { slug: "SUB_BASIC" }, addOns: [printer, adSpace] }),
  [printer],
  "signup hides Ad Space while retaining Bluetooth printing",
);
assert.equal(isAdSpaceAddOn(adSpace), true);
assert.deepEqual(
  reconcileSelectedAddOnsForPlan({
    isSignupFlow: true,
    selectedPlan: { slug: "SUB_BASIC" },
    selectedAddOns: [printer._id, adSpace._id],
    addOns: [printer, adSpace],
  }),
  [printer._id],
  "a stale hidden Ad Space selection cannot be submitted during signup",
);
assert.deepEqual(
  getPlanAddOnsForFlow({
    isSignupFlow: true,
    selectedPlan: { slug: "SUB_MARKETPLACE_VENDOR" },
    addOns: [printer],
  }),
  [],
  "Marketplace Vendor signup keeps food-truck printer add-ons out of its flow",
);
assert.deepEqual(
  reconcileSelectedAddOnsForPlan({
    selectedPlan: { slug: "SUB_MARKETPLACE_VENDOR" },
    selectedAddOns: [printer._id],
  }),
  [],
  "switching from Basic with Bluetooth selected to Marketplace Vendor submits no food add-ons",
);
assert.deepEqual(
  reconcileSelectedAddOnsForPlan({
    selectedPlan: { slug: "SUB_PLATINUM" },
    selectedAddOns: [printer._id],
  }),
  [printer._id],
  "switching between Food Vendor tiers retains valid selected add-ons",
);
assert.equal(
  shouldShowPlanAddOns({
    isSignupFlow: true,
    selectedPlan: { slug: "SUB_MARKETPLACE_VENDOR" },
  }),
  false,
  "Marketplace Vendor signup does not expose food-truck add-ons",
);
assert.equal(
  shouldShowPlanAddOns({
    isSignupFlow: false,
    selectedPlan: { slug: "SUB_MARKETPLACE_VENDOR" },
  }),
  true,
  "existing subscription management keeps its current add-on behavior",
);

console.log("Signup catalog helper tests passed.");
