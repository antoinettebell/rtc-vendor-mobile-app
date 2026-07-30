import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helperSource = await readFile(
  new URL("./discount.helper.js", import.meta.url),
  "utf8"
);
const helperModuleUrl = `data:text/javascript;base64,${Buffer.from(
  helperSource
).toString("base64")}`;
const { calculateItemTotalWithDiscount } = await import(helperModuleUrl);

const loadedFries = {
  menuItem: {
    toppingOptions: [
      { name: "Jalapeno", hasCost: true, cost: 0.5 },
      { name: "Chili and Cheese", hasCost: true, cost: 2 },
      { name: "Bacon Bits", hasCost: true, cost: 0.75 },
    ],
  },
  selectedToppings: ["Jalapeno", "Chili and Cheese", "Bacon Bits"],
};

const burger = {
  itemId: {
    toppingOptions: [{ name: "Fried Egg", hasCost: true, cost: 1 }],
  },
  selectedToppings: ["Fried Egg"],
};

assert.equal(
  calculateItemTotalWithDiscount({
    price: 0.01,
    quantity: 1,
    selectedSubItems: [loadedFries, burger],
  }),
  4.26
);

const liveShapeLoadedFries = {
  menuItem: {
    _id: "fries-id",
    name: "Fries",
    // Some populated responses keep only legacy names on the nested object.
    toppings: ["Jalapeno", "Chili and Cheese", "Bacon Bits"],
  },
  comboMenuItemId: "fries-id",
  toppingOptions: loadedFries.menuItem.toppingOptions,
  selectedToppings: ["Jalapeno", "Chili and Cheese", "Bacon Bits"],
};

assert.equal(
  calculateItemTotalWithDiscount({
    price: 0.01,
    quantity: 1,
    selectedToppings: ["Fried Egg"],
    toppingOptions: burger.itemId.toppingOptions,
    selectedSubItems: [liveShapeLoadedFries],
  }),
  4.26
);

assert.equal(
  calculateItemTotalWithDiscount({
    price: 0.01,
    quantity: 1,
    discountType: "BOGO",
    discountRules: { buyQty: 1, getQty: 1, discount: 1, repeatable: true },
    selectedToppings: ["Jalapeno"],
    toppingOptions: loadedFries.menuItem.toppingOptions,
    bogoItems: [{
      ...loadedFries.menuItem,
      price: 0.01,
      isSameItem: false,
    }],
    selectedDiscountToppings: ["Jalapeno", "Chili and Cheese"],
  }),
  3.01
);

const tenPercentTip =
  calculateItemTotalWithDiscount({
    price: 10,
    quantity: 1,
    selectedSubItems: [loadedFries],
  }) * 0.1;
assert.equal(Math.round(tenPercentTip * 100) / 100, 1.33);

console.log("vendor discount and tip base tests passed");
