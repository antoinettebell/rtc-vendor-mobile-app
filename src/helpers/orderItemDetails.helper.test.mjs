import assert from "node:assert/strict";
import {
  getNestedOrderItemDetails,
  getOrderItemSelectionLines,
} from "./orderItemDetails.helper.js";

const item = {
  selectedSubItems: [
    {
      name: "Vegetable Egg Roll",
      qty: 2,
      isAddOn: false,
      hasAdditionalCost: true,
      additionalCost: 1,
      selectedComboSides: ["Sweet chili sauce"],
    },
    {
      name: "Build Your Own Fried Rice",
      qty: 1,
      isAddOn: true,
      price: 6,
      selectedFlavors: ["Beef"],
      selectedToppings: ["Mixed Vegetables", "Extra Chicken"],
      customizationInput: "No peas",
    },
  ],
};

const nested = getNestedOrderItemDetails(item);
assert.deepEqual(
  { name: nested[0].name, qty: nested[0].qty, isAddOn: nested[0].isAddOn },
  { name: "Vegetable Egg Roll", qty: 2, isAddOn: false }
);
assert.equal(nested[1].isAddOn, true);
assert.equal(nested[0].costLabel, "+$2.00");
assert.equal(nested[1].costLabel, "+$6.00");
assert.deepEqual(nested[1].selectionLines, [
  "Flavors: Beef",
  "Toppings: Mixed Vegetables, Extra Chicken",
  "Customizations: No peas",
]);
assert.deepEqual(getOrderItemSelectionLines(item), []);

console.log("vendor order item detail tests passed");
