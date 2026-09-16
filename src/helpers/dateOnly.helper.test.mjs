import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./dateOnly.helper.js", import.meta.url), "utf8");
const helper = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

assert.equal(
  helper.formatDateOnly("2027-01-01T00:00:00.000Z"),
  "01/01/2027",
  "date-only values must not shift to the prior day in a US timezone",
);
assert.equal(helper.serializeDateOnly("01/01/2027"), "2027-01-01");
assert.equal(helper.formatDateOnly(null), "Not provided");

const parsed = helper.parseDateOnly("2027-01-01T00:00:00.000Z");
assert.equal(parsed.getFullYear(), 2027);
assert.equal(parsed.getMonth(), 0);
assert.equal(parsed.getDate(), 1);

console.log("Date-only helper tests passed.");
