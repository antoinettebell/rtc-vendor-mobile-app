import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./eventVendorApplicationDraft.helper.js", import.meta.url), "utf8");
const helper = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const eligibleProfile = {
  vendor_types: ["MERCHANDISE", "SERVICE", "OTHER"],
};
const merchandiseEvent = {
  event_vendor_needs: [{ vendor_type: "MERCHANDISE" }],
};
assert.deepEqual(
  helper.normalizeEventVendorApplicationTypes({
    profile: eligibleProfile,
    event: merchandiseEvent,
    selectedTypes: ["MERCHANDISE", "SERVICE", "OTHER"],
  }),
  { eligibleTypes: ["MERCHANDISE"], selectedTypes: ["MERCHANDISE"] },
  "stale hidden vendor types are removed",
);
assert.deepEqual(
  helper.normalizeEventVendorApplicationTypes({
    profile: { vendor_types: ["MERCHANDISE"] },
    event: merchandiseEvent,
    selectedTypes: [],
  }).selectedTypes,
  ["MERCHANDISE"],
  "the single eligible vendor type is selected automatically",
);
assert.deepEqual(
  helper.normalizeEventVendorApplicationTypes({
    profile: eligibleProfile,
    event: {
      event_vendor_needs: [
        { vendor_type: "MERCHANDISE" },
        { vendor_type: "SERVICE" },
      ],
    },
    selectedTypes: ["SERVICE"],
  }).selectedTypes,
  ["SERVICE"],
  "valid selections remain selected when multiple types are eligible",
);
assert.deepEqual(
  helper.normalizeEventVendorApplicationTypes({
    profile: { vendor_types: ["SERVICE"] },
    event: merchandiseEvent,
    selectedTypes: ["SERVICE"],
  }),
  { eligibleTypes: [], selectedTypes: [] },
  "an event with no eligible profile type is unavailable",
);

const normalizedOutboundDraft = helper.buildEligibleEventVendorApplicationDraft({
  state: {
    vendor_user_id: "vendor-1",
    selected: [],
    types: ["MERCHANDISE", "SERVICE", "OTHER"],
  },
  profile: { vendor_types: ["MERCHANDISE"] },
  event: merchandiseEvent,
});
assert.deepEqual(
  normalizedOutboundDraft.types,
  ["MERCHANDISE"],
  "Save Draft and signing persistence cannot contain hidden stale types",
);

const state = {
  vendor_user_id: "vendor-1",
  selected: ["repo-1"],
  types: ["MERCHANDISE"],
  bullets: "Candles",
  price: "20",
  notes: "Corner space",
  electricity: true,
  feeAck: true,
};
const beforeUpload = helper.buildEventVendorApplicationDraft(state);
const afterUpload = helper.buildEventVendorApplicationDraft(state, {
  selected: [...state.selected, "uploaded-1"],
});
assert.deepEqual(beforeUpload.types, ["MERCHANDISE"]);
assert.equal(beforeUpload.bullets, "Candles");
assert.deepEqual(afterUpload.selected, ["repo-1", "uploaded-1"]);
const afterColdRestart = JSON.parse(JSON.stringify(afterUpload));
assert.deepEqual(afterColdRestart, {
  vendor_user_id: "vendor-1",
  selected: ["repo-1", "uploaded-1"],
  types: ["MERCHANDISE"],
  bullets: "Candles",
  price: "20",
  notes: "Corner space",
  electricity: true,
  feeAck: true,
  pendingAgreement: false,
});
assert.deepEqual(
  helper.parseEventVendorApplicationReturn(
    JSON.stringify({ event: { event_id: "event-1", event_name: "Festival" } }),
  ).event.event_id,
  "event-1",
);
assert.equal(helper.parseEventVendorApplicationReturn("bad-json"), null);

const memory = new Map();
const storage = {
  getItem: async (key) => memory.get(key) ?? null,
  setItem: async (key, value) => memory.set(key, value),
  removeItem: async (key) => memory.delete(key),
};
const draftKey = helper.getEventVendorApplicationDraftKey("vendor-1", "event-1");
const returnKey = helper.getEventVendorApplicationReturnKey("vendor-1");
assert.equal(draftKey, "event-vendor-application-draft:vendor:vendor-1:event:event-1");
assert.equal(returnKey, "event-vendor-application:return-after-approval:vendor:vendor-1");
await helper.persistApplicationPhotoSelection({
  storage, draftKey, draft: state, nextSelected: ["repo-1"],
});
assert.deepEqual(JSON.parse(memory.get(draftKey)).selected, ["repo-1"], "repository selection persists under the scoped production key");
await helper.persistApplicationPhotoSelection({
  storage, draftKey, draft: state, nextSelected: [],
});
assert.deepEqual(JSON.parse(memory.get(draftKey)).selected, [], "repository deselection persists");
await helper.persistApplicationPhotoSelection({
  storage, draftKey, draft: { ...state, selected: ["phone-1"] }, nextSelected: [], removedPhotoId: "phone-1",
});
assert.deepEqual(JSON.parse(memory.get(draftKey)).selected, [], "application-photo removal persists across restart");

memory.set(returnKey, JSON.stringify({ event: { event_id: "event-1" }, vendor_user_id: "vendor-1" }));
memory.set(draftKey, JSON.stringify(afterUpload));
const hydrated = await helper.hydrateEventVendorApplication({
  storage, draftKey, returnKey,
  loadProfile: async () => ({ data: { eventVendorProfile: { profile_id: "profile-1" } } }),
  loadPhotos: async () => ({ data: { photoList: [{ photo_id: "repo-1" }] } }),
  loadEvent: async () => ({ data: { marketplaceEventList: [{ event_id: "event-1" }] } }),
  eventId: "event-1",
});
assert.deepEqual(hydrated.draft.selected, ["repo-1", "uploaded-1"]);
assert.equal(hydrated.event.event_id, "event-1", "hydration returns the current eligible event record");
assert.equal(memory.has(returnKey), true, "hydration does not consume the intent prematurely");
await helper.clearEventVendorApplicationRecovery({
  storage, returnKey,
});
assert.equal(memory.has(returnKey), false, "screen acknowledgement consumes intent after hydration");

memory.set(returnKey, "return");
assert.equal(memory.has(returnKey), true, "a crash before hydration leaves the intent intact");
await assert.rejects(helper.hydrateEventVendorApplication({
  storage, draftKey, returnKey,
  loadProfile: async () => ({ data: { eventVendorProfile: { profile_id: "profile-1" } } }),
  loadPhotos: async () => ({ data: { photoList: [] } }),
  loadEvent: async () => ({ data: { marketplaceEventList: [] } }),
  eventId: "event-1",
}), /closed or no longer accepting/);
assert.equal(memory.has(returnKey), false, "invalid event intent is cleared deliberately");

for (const transientError of [new Error("Network unavailable"), Object.assign(new Error("Server error"), { response: { status: 500 } })]) {
  memory.set(returnKey, "return");
  await assert.rejects(helper.hydrateEventVendorApplication({
    storage, draftKey, returnKey,
    loadProfile: async () => { throw transientError; },
    loadPhotos: async () => ({ data: { photoList: [] } }),
    loadEvent: async () => ({ data: { marketplaceEventList: [] } }),
    eventId: "event-1",
  }));
  assert.equal(memory.has(returnKey), true, `${transientError.message} preserves return intent`);
}

let storageIntentRemoved = false;
await assert.rejects(helper.hydrateEventVendorApplication({
  storage: {
    getItem: async () => { throw new Error("Storage unavailable"); },
    removeItem: async () => { storageIntentRemoved = true; },
  },
  draftKey, returnKey,
  loadProfile: async () => ({ data: { eventVendorProfile: { profile_id: "profile-1" } } }),
  loadPhotos: async () => ({ data: { photoList: [] } }),
  loadEvent: async () => ({ data: { marketplaceEventList: [{ event_id: "event-1" }] } }),
  eventId: "event-1",
}), /Storage unavailable/);
assert.equal(storageIntentRemoved, false, "storage read failure does not consume return intent");
assert.match(helper.getPhotoRemovalPersistenceMessage(), /photo was removed/i);
assert.doesNotMatch(helper.getPhotoRemovalPersistenceMessage(), /unable to remove/i);
memory.set(returnKey, "return");
memory.set(draftKey, "saved");
await helper.clearEventVendorApplicationRecovery({
  storage, draftKey, returnKey,
});
assert.equal(memory.has(draftKey), false, "successful submission clears the scoped draft");
assert.equal(memory.has(returnKey), false, "successful submission clears the scoped return intent");

memory.clear();
const vendorOneDraft = helper.getEventVendorApplicationDraftKey("vendor-1", "event-1");
const vendorTwoDraft = helper.getEventVendorApplicationDraftKey("vendor-2", "event-1");
const vendorOneReturn = helper.getEventVendorApplicationReturnKey("vendor-1");
const vendorTwoReturn = helper.getEventVendorApplicationReturnKey("vendor-2");
const vendorOneRecovery = "docusign-recovery:event-vendor:event-1:vendor:vendor-1";
const vendorTwoRecovery = "docusign-recovery:event-vendor:event-1:vendor:vendor-2";
const legacyDraft = "event-vendor-application-draft:event-legacy";
[
  vendorOneDraft,
  vendorTwoDraft,
  vendorOneReturn,
  vendorTwoReturn,
  vendorOneRecovery,
  vendorTwoRecovery,
  legacyDraft,
  helper.LEGACY_EVENT_VENDOR_APPLICATION_RETURN_KEY,
].forEach((key) => memory.set(key, "saved"));
const signOutKeys = helper.getEventVendorSignOutKeys([...memory.keys()], "vendor-1");
await Promise.all(signOutKeys.map((key) => storage.removeItem(key)));
assert.equal(memory.has(vendorOneDraft), false, "Sign Out removes the current vendor's exact draft key");
assert.equal(memory.has(vendorOneReturn), false, "Sign Out removes the current vendor's return intent");
assert.equal(memory.has(vendorOneRecovery), false, "Sign Out removes the current vendor's DocuSign recovery");
assert.equal(memory.has(legacyDraft), false, "Sign Out quarantines legacy unscoped drafts");
assert.equal(memory.has(helper.LEGACY_EVENT_VENDOR_APPLICATION_RETURN_KEY), false, "Sign Out removes the legacy unscoped return intent");
assert.equal(memory.has(vendorTwoDraft), true, "another vendor's scoped draft remains");
assert.equal(memory.has(vendorTwoReturn), true, "another vendor's scoped return remains");
assert.equal(memory.has(vendorTwoRecovery), true, "another vendor's DocuSign recovery remains");

memory.clear();
memory.set("event-vendor-application-draft:event-1", JSON.stringify({ selected: ["legacy-photo"] }));
await helper.prepareEventVendorApplicationStorage({ storage, vendorId: "vendor-2", eventId: "event-1" });
assert.equal(memory.has("event-vendor-application-draft:event-1"), false, "unowned legacy draft is removed");
assert.equal(memory.has(vendorTwoDraft), false, "unowned legacy draft cannot hydrate into another account");

memory.set("event-vendor-application-draft:event-1", JSON.stringify({ vendor_user_id: "vendor-1", selected: ["owned-photo"] }));
await helper.prepareEventVendorApplicationStorage({ storage, vendorId: "vendor-1", eventId: "event-1" });
assert.deepEqual(JSON.parse(memory.get(vendorOneDraft)).selected, ["owned-photo"], "owned legacy draft migrates to the matching scoped key");

assert.equal(helper.normalizeApplicationBullets(""), "• ");
assert.equal(helper.normalizeApplicationBullets("Candles\nSoap"), "• Candles\n• Soap");
assert.equal(helper.normalizeApplicationBullets("• Candles\n• Soap"), "• Candles\n• Soap", "rerenders do not duplicate bullets");
assert.equal(helper.removeEmptyApplicationBullet("• Candles\n• "), "• Candles");
assert.equal(helper.updateApplicationBullets("• Candles\n• ", "• Candles\n•"), "• Candles");
assert.deepEqual(helper.applicationBulletItems("• Candles\n• Soap"), ["Candles", "Soap"]);
assert.equal(helper.sanitizeApplicationCurrency("$1,234.567"), "1234.56");
assert.equal(helper.sanitizeApplicationCurrency("12..3bad"), "12.3");
assert.equal(helper.formatApplicationCurrency("12"), "$12.00");
assert.equal(helper.formatApplicationCurrency("12.5"), "$12.50");
assert.equal(helper.formatApplicationCurrency("bad"), "$0.00");
assert.equal(helper.applicationCurrencyNumber("$1,234.50"), 1234.5);
const categoryOptions = [
  { value: "ARTISANS_CRAFTERS", label: "Artisans" },
  { value: "COMMERCIAL_RETAIL", label: "Retail" },
];
assert.deepEqual(
  helper.getApprovedApplicationUploadCategories({
    vendor_types: ["MERCHANDISE"],
    merchandise_categories: ["COMMERCIAL_RETAIL"],
  }, categoryOptions),
  [categoryOptions[1]],
  "merchandise uploads show only categories in the approved profile",
);
assert.deepEqual(
  helper.getApprovedApplicationUploadCategories({ vendor_types: ["SERVICE"] }, categoryOptions),
  [],
  "service and other vendors are not asked for merchandise categories",
);

const screenSource = await readFile(new URL("../screens/eventVendorApplicationScreen.js", import.meta.url), "utf8");
assert.match(screenSource, /Save Draft/);
assert.match(screenSource, /MarketplaceVendorScreenLayout/);
assert.match(screenSource, /onBack=\{returnToMarketplace\}/);
assert.match(screenSource, /navigation\.navigate\("bottomRoot", \{ screen: "eventVendorMarketplaceScreen" \}\)/);
assert.doesNotMatch(screenSource, /navigation\.goBack\(\)/);
assert.match(screenSource, /getApprovedApplicationUploadCategories/);
assert.match(screenSource, /Select the merchandise category for this photo\./);
assert.match(screenSource, /buildEligibleEventVendorApplicationDraft/);
assert.match(screenSource, /vendor_types: normalized\.selectedTypes/);
assert.match(screenSource, /Application Unavailable/);
assert.match(screenSource, /getMarketplaceApiErrorMessage\(e, "Unable to submit application\."\)/);
console.log("Marketplace Vendor application draft recovery tests passed.");
