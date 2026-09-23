import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helperSource = await readFile(
  new URL("./profile.helper.js", import.meta.url),
  "utf8"
);
const helperModuleUrl = `data:text/javascript;base64,${Buffer.from(
  helperSource
).toString("base64")}`;
const { buildTaxIdentifierUpdate, getTaxIdentifierEditState } = await import(
  helperModuleUrl
);

const existingEin = getTaxIdentifierEditState({
  ein: "EIN: *****6789",
  tax_identifier_type: "EIN",
  tax_identifier_masked: "EIN: *****6789",
});

assert.deepEqual(existingEin, {
  type: "ein",
  originalType: "ein",
  inputValue: "",
  maskedValue: "EIN: *****6789",
  hasExisting: true,
});
assert.deepEqual(buildTaxIdentifierUpdate(existingEin), {});
assert.deepEqual(
  buildTaxIdentifierUpdate({
    ...existingEin,
    inputValue: "12-3456789",
  }),
  { ein: "12-3456789", ssn: null }
);
assert.deepEqual(
  buildTaxIdentifierUpdate({
    type: "ssn",
    originalType: "ein",
    inputValue: "123-45-6789",
    hasExisting: true,
  }),
  { ein: null, ssn: "123-45-6789" }
);

console.log("profile helper tests passed");
