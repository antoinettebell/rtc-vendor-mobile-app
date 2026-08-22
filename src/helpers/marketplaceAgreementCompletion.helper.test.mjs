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
const recovery = helper.buildAgreementRecoveryRecord({
  agreement: { agreement_id: "agreement-1", envelope_id: "envelope-1", event_vendor_profile_id: "profile-1" },
  payload: { event_id: "event-1", application_draft_id: "draft-1" },
});
assert.equal(recovery.agreement_id, "agreement-1");
assert.equal(recovery.application_draft_id, "draft-1");
assert.deepEqual(helper.parseAgreementRecoveryRecord(JSON.stringify(recovery)).agreement_id, "agreement-1");
assert.equal(helper.parseAgreementRecoveryRecord("stopped").signing_state, "STOPPED");
assert.equal(helper.getAgreementRetryDelay(0), 1000);
assert.equal(helper.getAgreementRetryDelay(4), null);
assert.deepEqual(helper.getFoodVendorMarketplaceCompletionReset(), {
  index: 1,
  routes: [
    { name: "bottomRoot", params: { screen: "homeScreen" } },
    { name: "vendorMarketplaceScreen" },
  ],
});

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
for (const foodVendorScreen of [applicationScreen, bidScreen]) {
  assert.match(foodVendorScreen, /getFoodVendorMarketplaceCompletionReset/);
  assert.doesNotMatch(
    foodVendorScreen,
    /routes:\s*\[\{\s*name:\s*["']homeScreen["']\s*\}\]/,
  );
}
assert.match(eventVendorScreen, /AsyncStorage\.setItem/);
assert.match(eventVendorScreen, /pendingAgreement: true/);
assert.match(eventVendorScreen, /clearEventVendorApplicationRecovery/);
assert.match(agreementHook, /setTerminalRecoveryStopped\(true\)/);
assert.match(agreementHook, /recoveryStopped/);
assert.match(agreementHook, /onTerminalRef\.current/);
assert.match(agreementHook, /persistPendingAgreement/);
assert.match(agreementHook, /await persistPendingAgreement[\s\S]*await Linking\.openURL/,
  "pending agreement identity is stored before DocuSign opens");
assert.match(agreementHook, /response\?\.data\?\.signing_url[\s\S]*await Linking\.openURL/,
  "an incomplete first template opens the next required DocuSign signing step");
assert.match(agreementHook, /returnMarketplaceVendorAgreement_API/,
  "resume and cold-start recovery reconcile the persisted agreement ID");
assert.match(agreementHook, /AppState\.addEventListener/);
assert.match(agreementHook, /getInitialURL/);
assert.match(agreementHook, /getAgreementRetryDelay/);
assert.match(agreementHook, /:vendor:\$\{recoveryAccountId\}/,
  "pending agreement recovery is scoped to the authenticated vendor");
assert.match(agreementHook, /clearRetryTimer\(\)/,
  "retry timers are explicitly cleared after completion and during cleanup");
assert.match(agreementHook, /const signingInFlightRef = useRef\(false\)/);
assert.match(
  agreementHook,
  /recoveryStopped \|\|[\s\S]*signingInFlightRef\.current \|\|[\s\S]*!payload\?\.event_id/,
  "automatic recovery cannot race the first signing request for a newly saved draft",
);
assert.match(
  agreementHook,
  /if \(signingInFlightRef\.current\) return false;[\s\S]*signingInFlightRef\.current = true;[\s\S]*finally \{[\s\S]*signingInFlightRef\.current = false;/,
  "repeated signing taps share a synchronous in-flight guard",
);
assert.match(eventVendorScreen, /Confirming your signed agreements…/);
assert.match(
  eventVendorScreen,
  /pendingAgreement: false/,
  "terminal states retain the draft while disabling automatic recovery",
);

console.log("marketplace agreement completion helper tests passed");
