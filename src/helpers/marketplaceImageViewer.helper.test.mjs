import assert from "node:assert/strict";
import {
  getMarketplaceImageViewerState,
  moveMarketplaceImageIndex,
  resolveMarketplaceImageUri,
} from "./marketplaceImageViewer.helper.js";

assert.equal(resolveMarketplaceImageUri(" https://cdn.test/string.jpg "), "https://cdn.test/string.jpg");
assert.equal(resolveMarketplaceImageUri({ image_url: "https://cdn.test/image.jpg" }), "https://cdn.test/image.jpg");
assert.equal(resolveMarketplaceImageUri({ file_url: "https://cdn.test/file.jpg" }), "https://cdn.test/file.jpg");
assert.equal(resolveMarketplaceImageUri({ url: "https://cdn.test/url.jpg" }), "https://cdn.test/url.jpg");
assert.equal(resolveMarketplaceImageUri(null), null);
assert.equal(resolveMarketplaceImageUri({ image_url: "" }), null);
assert.equal(resolveMarketplaceImageUri({ unknown: "value" }), null);

const mixed = getMarketplaceImageViewerState([
  null,
  "https://cdn.test/one.jpg",
  { file_url: "https://cdn.test/two.jpg" },
  { url: "" },
], 0);
assert.deepEqual(mixed.validImages.map((item) => item.uri), [
  "https://cdn.test/one.jpg",
  "https://cdn.test/two.jpg",
]);
assert.equal(mixed.index, 0);
assert.equal(getMarketplaceImageViewerState(mixed.validImages.map((item) => item.image), 1).index, 1);
assert.equal(getMarketplaceImageViewerState([null, "one", "two"], 1).index, 0);
assert.equal(getMarketplaceImageViewerState([null, "one", "two"], 2).index, 1);
assert.equal(moveMarketplaceImageIndex(0, 1, 2), 1);
assert.equal(moveMarketplaceImageIndex(1, 1, 2), 1);
assert.equal(moveMarketplaceImageIndex(1, -1, 2), 0);
assert.equal(moveMarketplaceImageIndex(0, -1, 2), 0);
assert.deepEqual(getMarketplaceImageViewerState([null, {}], 5), { validImages: [], index: 0 });

console.log("Marketplace image viewer behavioral tests passed");
