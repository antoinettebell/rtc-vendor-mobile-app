import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("./externalWebLink.helper.js", import.meta.url),
  "utf8",
);
const { normalizeExternalWebLink } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`,
);

assert.equal(
  normalizeExternalWebLink("https://www.facebook.com/RoundDaCorner"),
  "https://www.facebook.com/RoundDaCorner",
);
assert.equal(
  normalizeExternalWebLink("facebook.com/RoundDaCorner"),
  "https://facebook.com/RoundDaCorner",
);
assert.equal(
  normalizeExternalWebLink("instagram.com/rounddacorner"),
  "https://instagram.com/rounddacorner",
);
assert.equal(normalizeExternalWebLink("javascript:alert(1)"), null);
assert.equal(normalizeExternalWebLink("data:text/html,hello"), null);
assert.equal(normalizeExternalWebLink("mailto:vendor@example.com"), null);
assert.equal(normalizeExternalWebLink("https://localhost"), null);
assert.equal(normalizeExternalWebLink("https://vendor"), null);
assert.equal(normalizeExternalWebLink("http://127.0.0.1:3000"), null);
assert.equal(normalizeExternalWebLink("http://192.168.1.25"), null);
assert.equal(normalizeExternalWebLink("https://vendor:secret@example.com"), null);
assert.equal(normalizeExternalWebLink("not a link"), null);

console.log("Vendor external web link helper tests passed.");
