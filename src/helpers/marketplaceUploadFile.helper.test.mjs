import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("./marketplaceUploadFile.helper.js", import.meta.url),
  "utf8",
);
const helper = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const iphoneImage = helper.buildMarketplaceImageUploadFile({
  path: "/private/var/mobile/tmp/selected-image.jpg",
  sourceURL: "ph://library-asset-that-cannot-be-uploaded",
  filename: "IMG_1000.HEIC",
  mime: "image/heic",
  size: 1234,
});
assert.equal(iphoneImage.uri, "/private/var/mobile/tmp/selected-image.jpg");
assert.equal(iphoneImage.name, "selected-image.jpg");
assert.equal(iphoneImage.type, "image/jpeg");
assert.equal(iphoneImage.size, 1234);

const nativeHeic = helper.buildMarketplaceImageUploadFile({
  path: "/private/var/mobile/tmp/selected-image.heic",
  mime: "image/heic",
});
assert.equal(nativeHeic.name, "selected-image.heic");
assert.equal(nativeHeic.type, "image/heic");

const bidScreenSource = await readFile(
  new URL("../screens/vendorMarketplaceBidResponseScreen.js", import.meta.url),
  "utf8",
);
const finalizeStart = bidScreenSource.indexOf("const finalizeBidSubmission");
const finalizeEnd = bidScreenSource.indexOf(
  "const { beginSigning: beginAgreementSigning }",
  finalizeStart,
);
const finalizeSource = bidScreenSource.slice(finalizeStart, finalizeEnd);
assert.ok(
  finalizeSource.indexOf("await uploadBidFiles(existingBidId)") <
    finalizeSource.indexOf('buildBidPayload("SUBMITTED")'),
  "pending attachments must upload before the bid is marked submitted",
);
assert.match(finalizeSource, /submissionCompletedRef\.current = true/);
assert.match(finalizeSource, /isLeavingRef\.current = true/);
assert.doesNotMatch(
  bidScreenSource.slice(bidScreenSource.indexOf("const pickBidImages")),
  /sourceURL \|\| image\?\.path/,
  "bid images must use the picker upload path instead of an iOS Photos URL",
);

console.log("marketplace upload file helper tests passed");
