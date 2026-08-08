import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

let source = await readFile(new URL("./print.helper.js", import.meta.url), "utf8");
source = source
  .replace(
    'import moment from "moment";',
    'const moment = () => ({ format: () => "Aug 8, 2026 3:43 PM" });',
  )
  .replace(
    'import RNPrint from "react-native-print";',
    'const RNPrint = { print: async () => {} };',
  )
  .replace(
    'import { getVendorOrderTotal } from "./order.helper";',
    'const getVendorOrderTotal = () => 17;',
  )
  .replace(
    'import { getRewardItemsDisplay } from "./discount.helper";',
    'const getRewardItemsDisplay = (item) => item.__rewardItems || [];',
  )
  .replaceAll("export const ", "const ");
source += "\nexport { buildPrintHtml };";

const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString(
  "base64",
)}`;
const { buildPrintHtml } = await import(moduleUrl);

const html = buildPrintHtml([
  {
    orderNumber: "1001",
    orderStatus: "READY",
    items: [
      {
        name: "Chicken Fried Rice Combo",
        qty: 1,
        total: 17,
        customization: "No onions",
        selectedFlavors: ["Hot"],
        selectedToppings: ["Egg"],
        selectedComboSides: ["Crab Rangoon"],
        selectedDiscountFlavors: ["Mild"],
        selectedDiscountToppings: ["Cheese"],
        selectedDiscountComboSides: ["Loaded Fried Rice"],
        selectedDiscountCustomization: "Sauce on side",
        optionsTotal: 5,
        comboItems: [
          {
            name: "Jazzy Chicken Fried Rice",
            qty: 1,
            selectedToppings: ["Extra Chicken"],
          },
        ],
        selectedDiscountSubItems: [
          {
            name: "Reward Combo Item",
            qty: 1,
            selectedComboSides: ["Vegetable Egg Roll"],
          },
        ],
        __rewardItems: [
          {
            displayName: "Bonus Brownie",
            displayQty: 1,
            displayPrice: "Free",
            displayFlavors: ["Chocolate"],
          },
        ],
      },
    ],
  },
]);

for (const expectedText of [
  "Chicken Fried Rice Combo",
  "No onions",
  "Flavors: Hot",
  "Toppings: Egg",
  "Sides: Crab Rangoon",
  "Discount flavors: Mild",
  "Discount toppings: Cheese",
  "Discount sides: Loaded Fried Rice",
  "Discount item instructions: Sauce on side",
  "Options/add-ons: $5.00",
  "Combo includes",
  "Jazzy Chicken Fried Rice",
  "Extra Chicken",
  "Discount combo includes",
  "Reward Combo Item",
  "Vegetable Egg Roll",
  "Included with offer",
  "Bonus Brownie",
  "Chocolate",
  "Free",
]) {
  assert.ok(html.includes(expectedText), `print output must include ${expectedText}`);
}

console.log("full order print detail tests passed");
