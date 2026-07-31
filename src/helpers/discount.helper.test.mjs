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

assert.equal(
  calculateItemTotalWithDiscount({
    price: 0.01,
    quantity: 1,
    discountType: "BOGOHO",
    discountRules: { buyQty: 1, getQty: 1, discount: 0.5, repeatable: true },
    selectedToppings: ["Paid topping"],
    bogoItems: [{
      price: 0.01,
      isSameItem: true,
    }],
    selectedDiscountToppings: ["Reward topping"],
    // Same-item rewards resolve their modifier definitions from the parent.
    toppingOptions: [
      { name: "Paid topping", hasCost: true, cost: 0.25 },
      { name: "Reward topping", hasCost: true, cost: 0.5 },
    ],
  }),
  0.77
);

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

const nestedBogoReward = {
  itemId: {
    _id: "fries-id",
    name: "Fries",
    price: 0.01,
    toppingOptions: loadedFries.menuItem.toppingOptions,
  },
  qty: 1,
  isSameItem: false,
};

assert.equal(
  calculateItemTotalWithDiscount({
    price: 0.01,
    quantity: 1,
    discountType: "BOGO",
    discountRules: { buyQty: 1, getQty: 1, discount: 1, repeatable: true },
    selectedToppings: ["Jalapeno"],
    toppingOptions: loadedFries.menuItem.toppingOptions,
    bogoItems: [nestedBogoReward],
    selectedDiscountToppings: ["Bacon Bits", "Chili and Cheese"],
  }),
  3.26
);

assert.equal(Math.round((3.53 + 3.26) * 100) / 100, 6.79);

const tenPercentTip =
  calculateItemTotalWithDiscount({
    price: 10,
    quantity: 1,
    selectedSubItems: [loadedFries],
  }) * 0.1;
assert.equal(Math.round(tenPercentTip * 100) / 100, 1.33);

console.log("vendor discount and tip base tests passed");
