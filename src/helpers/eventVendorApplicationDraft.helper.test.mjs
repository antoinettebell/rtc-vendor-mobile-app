import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./eventVendorApplicationDraft.helper.js", import.meta.url), "utf8");
const helper = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const state = {
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
await helper.persistApplicationPhotoSelection({
  storage, draftKey: "draft", draft: state, nextSelected: ["repo-1"],
});
assert.deepEqual(JSON.parse(memory.get("draft")).selected, ["repo-1"], "repository selection persists");
await helper.persistApplicationPhotoSelection({
  storage, draftKey: "draft", draft: state, nextSelected: [],
});
assert.deepEqual(JSON.parse(memory.get("draft")).selected, [], "repository deselection persists");
await helper.persistApplicationPhotoSelection({
  storage, draftKey: "draft", draft: { ...state, selected: ["phone-1"] }, nextSelected: [], removedPhotoId: "phone-1",
});
assert.deepEqual(JSON.parse(memory.get("draft")).selected, [], "application-photo removal persists across restart");

memory.set(helper.EVENT_VENDOR_APPLICATION_RETURN_KEY, JSON.stringify({ event: { event_id: "event-1" } }));
memory.set("draft", JSON.stringify(afterUpload));
const hydrated = await helper.hydrateEventVendorApplication({
  storage, draftKey: "draft", returnKey: helper.EVENT_VENDOR_APPLICATION_RETURN_KEY,
  loadProfile: async () => ({ data: { eventVendorProfile: { profile_id: "profile-1" } } }),
  loadPhotos: async () => ({ data: { photoList: [{ photo_id: "repo-1" }] } }),
  loadEvent: async () => ({ data: { marketplaceEventList: [{ event_id: "event-1" }] } }),
  eventId: "event-1",
});
assert.deepEqual(hydrated.draft.selected, ["repo-1", "uploaded-1"]);
assert.equal(memory.has(helper.EVENT_VENDOR_APPLICATION_RETURN_KEY), true, "hydration does not consume the intent prematurely");
await helper.clearEventVendorApplicationRecovery({
  storage, returnKey: helper.EVENT_VENDOR_APPLICATION_RETURN_KEY,
});
assert.equal(memory.has(helper.EVENT_VENDOR_APPLICATION_RETURN_KEY), false, "screen acknowledgement consumes intent after hydration");

memory.set(helper.EVENT_VENDOR_APPLICATION_RETURN_KEY, "return");
assert.equal(memory.has(helper.EVENT_VENDOR_APPLICATION_RETURN_KEY), true, "a crash before hydration leaves the intent intact");
await assert.rejects(helper.hydrateEventVendorApplication({
  storage, draftKey: "draft", returnKey: helper.EVENT_VENDOR_APPLICATION_RETURN_KEY,
  loadProfile: async () => ({ data: { eventVendorProfile: { profile_id: "profile-1" } } }),
  loadPhotos: async () => ({ data: { photoList: [] } }),
  loadEvent: async () => ({ data: { marketplaceEventList: [] } }),
  eventId: "event-1",
}), /closed or no longer accepting/);
assert.equal(memory.has(helper.EVENT_VENDOR_APPLICATION_RETURN_KEY), false, "invalid event intent is cleared deliberately");

for (const transientError of [new Error("Network unavailable"), Object.assign(new Error("Server error"), { response: { status: 500 } })]) {
  memory.set(helper.EVENT_VENDOR_APPLICATION_RETURN_KEY, "return");
  await assert.rejects(helper.hydrateEventVendorApplication({
    storage, draftKey: "draft", returnKey: helper.EVENT_VENDOR_APPLICATION_RETURN_KEY,
    loadProfile: async () => { throw transientError; },
    loadPhotos: async () => ({ data: { photoList: [] } }),
    loadEvent: async () => ({ data: { marketplaceEventList: [] } }),
    eventId: "event-1",
  }));
  assert.equal(memory.has(helper.EVENT_VENDOR_APPLICATION_RETURN_KEY), true, `${transientError.message} preserves return intent`);
}

let storageIntentRemoved = false;
await assert.rejects(helper.hydrateEventVendorApplication({
  storage: {
    getItem: async () => { throw new Error("Storage unavailable"); },
    removeItem: async () => { storageIntentRemoved = true; },
  },
  draftKey: "draft", returnKey: helper.EVENT_VENDOR_APPLICATION_RETURN_KEY,
  loadProfile: async () => ({ data: { eventVendorProfile: { profile_id: "profile-1" } } }),
  loadPhotos: async () => ({ data: { photoList: [] } }),
  loadEvent: async () => ({ data: { marketplaceEventList: [{ event_id: "event-1" }] } }),
  eventId: "event-1",
}), /Storage unavailable/);
assert.equal(storageIntentRemoved, false, "storage read failure does not consume return intent");
assert.match(helper.getPhotoRemovalPersistenceMessage(), /photo was removed/i);
assert.doesNotMatch(helper.getPhotoRemovalPersistenceMessage(), /unable to remove/i);
memory.set(helper.EVENT_VENDOR_APPLICATION_RETURN_KEY, "return");
memory.set("draft", "saved");
await helper.clearEventVendorApplicationRecovery({
  storage, draftKey: "draft", returnKey: helper.EVENT_VENDOR_APPLICATION_RETURN_KEY,
});
assert.equal(memory.has("draft"), false, "successful submission clears the draft");

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
assert.match(screenSource, /Back to Marketplace/);
assert.match(screenSource, /navigation\.navigate\("bottomRoot", \{ screen: "eventVendorMarketplaceScreen" \}\)/);
assert.doesNotMatch(screenSource, /navigation\.goBack\(\)/);
assert.match(screenSource, /getApprovedApplicationUploadCategories/);
assert.match(screenSource, /Select the merchandise category for this photo\./);
assert.equal(memory.has(helper.EVENT_VENDOR_APPLICATION_RETURN_KEY), false, "successful submission clears return intent");

console.log("Marketplace Vendor application draft recovery tests passed.");
