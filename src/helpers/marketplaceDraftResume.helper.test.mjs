import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loadHelper = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
};

const { normalizeMarketplaceRequirementLabel } = await loadHelper(
  "./marketplaceRequirementLabels.helper.js",
);
const { matchesMarketplaceSubmissionStatus } = await loadHelper(
  "./marketplaceSubmissionList.helper.js",
);

for (const historicalLabel of [
  "Food Vendor",
  "Food Vendor Permit",
  "City Permit",
  "Business License",
  "Business License/Permit",
]) {
  assert.equal(
    normalizeMarketplaceRequirementLabel(historicalLabel),
    "City Permit",
    `${historicalLabel} uses the current City Permit requirement`,
  );
}
assert.equal(normalizeMarketplaceRequirementLabel("Health Permit"), "Sanitation Grade");

assert.equal(matchesMarketplaceSubmissionStatus("DRAFT", "ALL"), true);
assert.equal(matchesMarketplaceSubmissionStatus("DRAFT", "DRAFT"), true);
assert.equal(matchesMarketplaceSubmissionStatus("draft", "DRAFT"), true);
assert.equal(matchesMarketplaceSubmissionStatus("SUBMITTED", "DRAFT"), false);

console.log("marketplace permit and draft-resume tests passed");
