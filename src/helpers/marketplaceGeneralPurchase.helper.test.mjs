import assert from "node:assert/strict";
import {
  GENERAL_PURCHASE_TAX_INFORMATION,
  addGeneralPurchaseItem,
  calculateGeneralPurchase,
  createGeneralPurchaseItem,
  initialGeneralPurchaseState,
  removeGeneralPurchaseItem,
  validateGeneralPurchase,
} from "./marketplaceGeneralPurchase.helper.js";

const initial = initialGeneralPurchaseState();
assert.equal(initial.items.length, 1);
assert.equal(initial.items[0].description, "");
const first = createGeneralPurchaseItem("first");
const second = createGeneralPurchaseItem("second");
assert.deepEqual(addGeneralPurchaseItem([first], second).map((item) => item.id), ["first", "second"]);
assert.deepEqual(removeGeneralPurchaseItem([first], "first"), [first]);
assert.deepEqual(removeGeneralPurchaseItem([first, second], "second"), [first]);

const totals = calculateGeneralPurchase([
  { description: "Art", quantity: "2", unitPrice: "10.25" },
  { description: "Frame", quantity: "1", unitPrice: "5" },
], "7.25");
assert.equal(totals.items[0].lineTotal, 20.5);
assert.equal(totals.subtotal, 25.5);
assert.equal(totals.taxRate, 7.25);
assert.equal(totals.taxAmount, 1.85);
assert.equal(totals.total, 27.35);
assert.equal(calculateGeneralPurchase([{ quantity: 1, unitPrice: 10 }], 0).taxAmount, 0);
assert.match(validateGeneralPurchase({ items: [{ description: "", quantity: 1, unitPrice: 1 }], taxRate: 0 }), /description/);
assert.match(validateGeneralPurchase({ items: [{ description: "Item", quantity: 0, unitPrice: 1 }], taxRate: 0 }), /quantity/);
assert.match(validateGeneralPurchase({ items: [{ description: "Item", quantity: 1, unitPrice: -1 }], taxRate: 0 }), /price/);
assert.match(validateGeneralPurchase({ items: [{ description: "Item", quantity: 1, unitPrice: 1 }], taxRate: -1 }), /Sales tax/);
assert.match(GENERAL_PURCHASE_TAX_INFORMATION, /paid out at 100%/);

console.log("Marketplace General Purchase UI helper tests passed.");
