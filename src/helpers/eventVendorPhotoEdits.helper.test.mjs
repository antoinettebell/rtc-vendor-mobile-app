import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./eventVendorPhotoEdits.helper.js", import.meta.url), "utf8");
const { executeEventVendorPhotoEdits, runPhotoEditSaveOnce } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const runCapacityScenario = async (capacity) => {
  let used = capacity;
  const calls = [];
  await executeEventVendorPhotoEdits({
    photos: [{ photo_id: "old", category: "ART" }],
    removals: ["old"],
    additions: [{ localId: "new", category: "ART" }],
    removePhoto: async () => { calls.push("remove"); used -= 1; },
    addPhoto: async () => {
      calls.push("add");
      if (used >= capacity) throw new Error("capacity exceeded");
      used += 1;
    },
    replacePhoto: async () => {},
  });
  assert.deepEqual(calls, ["remove", "add"]);
  assert.equal(used, capacity);
};
await runCapacityScenario(10);
await runCapacityScenario(40);

let replacementSlots = 10;
await executeEventVendorPhotoEdits({
  photos: [{ photo_id: "replace-me", category: "ART" }],
  replacements: { "replace-me": { path: "replacement.jpg" } },
  replacePhoto: async () => { assert.equal(replacementSlots, 10); },
  removePhoto: async () => {},
  addPhoto: async () => { replacementSlots += 1; },
});
assert.equal(replacementSlots, 10, "dedicated replacement consumes no additional slot");

let failure;
try {
  await executeEventVendorPhotoEdits({
    photos: [{ photo_id: "old", category: "ART" }],
    removals: ["old"],
    additions: [{ localId: "failed-add", category: "ART" }],
    replacePhoto: async () => {},
    removePhoto: async () => {},
    addPhoto: async () => { throw new Error("upload failed"); },
  });
} catch (error) {
  failure = error;
}
assert.deepEqual(failure.remainingPhotoEdits.removals, []);
assert.deepEqual(failure.remainingPhotoEdits.additions.map((item) => item.localId), ["failed-add"]);

const lock = { current: false };
let releaseFirst;
let saveCalls = 0;
const firstSave = runPhotoEditSaveOnce(lock, async () => {
  saveCalls += 1;
  await new Promise((resolve) => { releaseFirst = resolve; });
  return { saved: true };
});
const repeatedSave = await runPhotoEditSaveOnce(lock, async () => { saveCalls += 1; });
assert.deepEqual(repeatedSave, { skipped: true });
assert.equal(saveCalls, 1, "a repeated Save tap cannot duplicate mutations");
releaseFirst();
await firstSave;
assert.equal(lock.current, false, "the save lock releases after completion");

console.log("Marketplace Vendor staged photo edit tests passed");
