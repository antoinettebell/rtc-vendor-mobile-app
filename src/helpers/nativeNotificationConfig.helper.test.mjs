import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("./notification.helper.js", import.meta.url),
  "utf8",
);

assert.match(source, /id: "rtc-notifications-v3"/);
assert.match(source, /importance: AndroidImportance\.HIGH/);
assert.match(source, /sound: "default"/);
assert.match(source, /vibration: true/);
assert.match(source, /vibrationPattern: \[300, 500\]/);
assert.match(source, /ios: \{[\s\S]*sound: "default"/);
assert.doesNotMatch(source, /critical/);

console.log("Vendor native notification configuration tests passed");
