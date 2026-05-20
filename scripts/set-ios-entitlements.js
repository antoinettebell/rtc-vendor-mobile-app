const fs = require("fs");
const path = require("path");

const mode = process.argv[2];
const root = path.resolve(__dirname, "..");
const entitlementsDir = path.join(root, "ios", "FoodtruckVendor");
const activeFile = path.join(entitlementsDir, "FoodtruckVendor.entitlements");

const sourceByMode = {
  production: path.join(entitlementsDir, "FoodtruckVendor.production.entitlements"),
  tapToPay: path.join(entitlementsDir, "FoodtruckVendor.tap-to-pay.entitlements"),
};

const sourceFile = sourceByMode[mode];

if (!sourceFile) {
  console.error("Usage: node scripts/set-ios-entitlements.js <production|tapToPay>");
  process.exit(1);
}

fs.copyFileSync(sourceFile, activeFile);
console.log(`iOS entitlements set to ${mode}`);
