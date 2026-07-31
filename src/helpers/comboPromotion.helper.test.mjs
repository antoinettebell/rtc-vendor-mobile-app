import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helperSource = await readFile(
  new URL("./comboPromotion.helper.js", import.meta.url),
  "utf8",
);
const helperModuleUrl = `data:text/javascript;base64,${Buffer.from(
  helperSource,
).toString("base64")}`;
const { filterComboChildCandidates, hasActiveBogoPromotion } = await import(
  helperModuleUrl
);

assert.equal(
  hasActiveBogoPromotion({ hasDiscount: true, discountType: "BOGO" }),
  true,
);
assert.equal(
  hasActiveBogoPromotion({ hasDiscount: true, discountType: "BOGOHO" }),
  true,
);
assert.equal(
  hasActiveBogoPromotion({ hasDiscount: false, discountType: "BOGO" }),
  false,
);
assert.deepEqual(
  filterComboChildCandidates([
    { _id: "hotdog", hasDiscount: true, discountType: "BOGO" },
    { _id: "fries", hasDiscount: false, discountType: "FIXED" },
  ]).map((item) => item._id),
  ["fries"],
);

console.log("combo promotion helper tests passed");
