import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const api = await readFile(new URL("../api/appAPI.js", import.meta.url), "utf8");
const service = await readFile(new URL("../services/tapToPay-service.js", import.meta.url), "utf8");
const setup = await readFile(new URL("../screens/authTapToPaySetupScreen.js", import.meta.url), "utf8");

assert.match(api, /device_id: deviceId/);
assert.match(api, /activation_status: activationStatus/);
assert.match(api, /params: \{ device_id: deviceId \}/);
assert.match(api, /\{ device_id: deviceId \|\| null \}/);
assert.match(service, /activationStatus: "PENDING"/);
assert.match(service, /activationStatus: "SUCCEEDED"/);
assert.match(service, /forceReactivation/);
assert.match(setup, /serverStatus\?\.status === "ACTIVE"/);
assert.match(setup, /serverStatus\?\.activation_status === "SUCCEEDED"/);
assert.match(setup, /Pending Activation/);
assert.match(setup, /already in use on another vendor account/i);
assert.match(setup, /administrator for device reassignment/i);
assert.match(setup, /resend the reactivation request/i);
assert.doesNotMatch(setup, /Request failed with status code 400/);

console.log("Marketplace Tap to Pay activation contract tests passed");
