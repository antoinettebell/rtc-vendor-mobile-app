import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("./marketplaceAgreementCompletion.helper.js", import.meta.url),
  "utf8",
);
const helper = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

assert.equal(
  helper.parseDocuSignReturnStatus("rounddacornervendor://docusign/return?event=signing_complete"),
  "completed",
);
assert.equal(helper.parseDocuSignReturnStatus("?status=cancelled"), "cancelled");
assert.equal(helper.parseDocuSignReturnStatus("?status=declined"), "declined");
assert.equal(helper.parseDocuSignReturnStatus("?status=incomplete"), "error");

assert.deepEqual(
  helper.getAgreementRecoveryAction({
    url: "rounddacornervendor://docusign/return?status=completed",
    agreementId: "agreement-1",
  }),
  { type: "RETURN", agreementId: "agreement-1", status: "completed" },
);
assert.deepEqual(
  helper.getAgreementRecoveryAction({
    url: "rounddacornervendor://docusign/return?status=completed",
    agreementId: null,
  }),
  { type: "RECONCILE" },
  "cold start with no in-memory agreement must reconcile with the backend",
);
assert.deepEqual(
  helper.getAgreementRecoveryAction({ url: null, agreementId: null }),
  { type: "RECONCILE" },
  "app resume without a deep link must reconcile with the backend",
);

let calls = 0;
const finalizeOnce = helper.createIdempotentAgreementFinalizer(async () => {
  calls += 1;
});
await Promise.all([finalizeOnce(), finalizeOnce()]);
await finalizeOnce();
assert.equal(calls, 1, "duplicate callbacks must finalize exactly once");

let retries = 0;
const retryable = helper.createIdempotentAgreementFinalizer(async () => {
  retries += 1;
  if (retries === 1) throw new Error("temporary failure");
});
await assert.rejects(retryable());
await retryable();
assert.equal(retries, 2, "a failed finalization may be retried");

assert.match(helper.getAgreementStatusMessage("DECLINED"), /declined/i);
assert.match(helper.getAgreementStatusMessage("CANCELLED"), /cancelled/i);
assert.match(helper.getAgreementStatusMessage("ERROR"), /could not confirm/i);

const applicationScreen = await readFile(
  new URL("../screens/vendorMarketplaceApplicationScreen.js", import.meta.url),
  "utf8",
);
const bidScreen = await readFile(
  new URL("../screens/vendorMarketplaceBidResponseScreen.js", import.meta.url),
  "utf8",
);
const eventVendorScreen = await readFile(
  new URL("../screens/eventVendorApplicationScreen.js", import.meta.url),
  "utf8",
);
const agreementHook = await readFile(
  new URL("../hooks/useMarketplaceAgreementCompletion.js", import.meta.url),
  "utf8",
);
for (const screen of [applicationScreen, bidScreen, eventVendorScreen]) {
  assert.match(screen, /useMarketplaceAgreementCompletion/);
  assert.doesNotMatch(screen, /handleDocuSignReturn/);
}
assert.match(applicationScreen, /application_id: savedApplicationRef\.current\?\.application_id/);
assert.match(bidScreen, /bid_id: savedBidRef\.current\?\.bid_id/);
assert.match(eventVendorScreen, /AsyncStorage\.setItem/);
assert.match(eventVendorScreen, /pendingAgreement: true/);
assert.match(eventVendorScreen, /clearEventVendorApplicationRecovery/);
assert.match(agreementHook, /setTerminalRecoveryStopped\(true\)/);
assert.match(agreementHook, /recoveryStopped/);
assert.match(agreementHook, /onTerminalRef\.current/);
assert.match(
  eventVendorScreen,
  /pendingAgreement: false/,
  "terminal states retain the draft while disabling automatic recovery",
);

console.log("marketplace agreement completion helper tests passed");
