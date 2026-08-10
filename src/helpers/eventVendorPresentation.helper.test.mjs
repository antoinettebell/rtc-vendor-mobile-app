import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./eventVendorPresentation.helper.js", import.meta.url), "utf8");
const helper = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const event = helper.getMarketplaceVendorEventPresentation({
  event_id: "event-1",
  event_name: "Summer Market",
  event_description: "Public description",
  event_date: "2026-08-20",
  event_start_time: "10:00 AM",
  event_end_time: "4:00 PM",
  event_address: "100 Main St, Columbia, SC",
  expected_ga_guests: 125,
  expected_vip_guests: 25,
  payment_responsibility: "VENDOR",
  last_date_to_accept_payments: "2026-08-15",
  event_vendor_needs: [{ vendor_type: "MERCHANDISE", quantity: 3, filled: 1, fee: 25 }],
  public_images: [{ image_id: "image-1", image_url: "https://public/event.jpg" }],
  tax_exemption_certificate: { file_url: "https://private/tax.pdf" },
  eventCoordinatorPaymentQrCodeUrl: "https://private/qr.png",
});
assert.equal(event.name, "Summer Market");
assert.equal(event.expectedGuests, 150);
assert.equal(event.needs[0].remaining, 2);
assert.deepEqual(event.images, [{ image_id: "image-1", image_url: "https://public/event.jpg" }]);
assert.equal(event.tax_exemption_certificate, undefined);
assert.equal(event.eventCoordinatorPaymentQrCodeUrl, undefined);
assert.equal(helper.formatMarketplaceEventDate("2026-08-20"), "08/20/2026");
assert.equal(helper.formatMarketplaceEventTime("00:00"), "12:00 AM");
assert.equal(helper.formatMarketplaceEventTime("12:00"), "12:00 PM");
assert.equal(helper.formatMarketplaceEventTime("16:00pm"), "4:00 PM");
assert.equal(helper.formatMarketplaceEventTime("23:30"), "11:30 PM");
assert.equal(helper.formatMarketplaceEventTime("01:15"), "1:15 AM");
assert.equal(
  helper.formatMarketplaceEventTime("2026-08-21T00:00:00.000Z", "America/New_York"),
  "8:00 PM",
  "absolute event times use the event timezone",
);
assert.deepEqual(
  helper.getPublicEventImages({
    public_images: [{ image_id: "public", image_url: "https://public/image.jpg" }],
    tax_exemption_certificate: { image_url: "https://private/tax.jpg" },
    coordinator_payment_qr_code_url: "https://private/qr.jpg",
    agreements: [{ image_url: "https://private/agreement.jpg" }],
  }),
  [{ image_id: "public", image_url: "https://public/image.jpg" }],
  "the viewer receives public event images only",
);

assert.deepEqual(helper.getApprovedProfilePresentation({ review_status: "APPROVED" }, false), {
  approved: true, readOnly: true, primaryAction: "Edit Profile", showCancel: false,
});
assert.deepEqual(helper.getApprovedProfilePresentation({ review_status: "APPROVED" }, true), {
  approved: true, readOnly: false, primaryAction: "Save Changes", showCancel: true,
});
assert.equal(helper.getApprovedProfilePresentation({ review_status: "DRAFT", vendor_types: ["MERCHANDISE"] }).primaryAction, "Save Profile & Continue to Photos");
assert.equal(helper.getPhotoRepositoryPresentation({ review_status: "APPROVED" }, 8).actionLabel, "Save Photos");
assert.doesNotMatch(helper.getPhotoRepositoryPresentation({ review_status: "APPROVED" }, 8).progressLabel, /required/i);
assert.match(helper.getPhotoRepositoryPresentation({ review_status: "DRAFT" }, 2).progressLabel, /2 of 3 required/);

const layout = await readFile(new URL("../components/MarketplaceVendorScreenLayout.js", import.meta.url), "utf8");
for (const file of [
  "../screens/eventVendorMarketplaceScreen.js",
  "../screens/eventVendorApplicationScreen.js",
  "../screens/eventVendorPhotosScreen.js",
  "../screens/eventVendorProfileScreen.js",
  "../screens/authUnderReviewNoteScreen.js",
]) {
  const screen = await readFile(new URL(file, import.meta.url), "utf8");
  assert.match(screen, /MarketplaceVendorScreenLayout/, `${file} uses the shared safe-area layout`);
}
assert.match(layout, /useSafeAreaInsets/);
const profileScreen = await readFile(new URL("../screens/eventVendorProfileScreen.js", import.meta.url), "utf8");
assert.match(profileScreen, /Sign Out/);
assert.match(profileScreen, /clearUserSlice/);
assert.match(profileScreen, /Save Changes/);
assert.match(profileScreen, /categoryDescriptionOn/);
const photoScreen = await readFile(new URL("../screens/eventVendorPhotosScreen.js", import.meta.url), "utf8");
assert.match(photoScreen, /Save Photos/);
assert.match(photoScreen, /Edit Photos/);
assert.match(photoScreen, /isEditingPhotos/);
assert.match(photoScreen, /cancelPhotoEdits/);
const viewer = await readFile(new URL("../components/MarketplaceImageViewer.js", import.meta.url), "utf8");
assert.match(viewer, /maximumZoomScale=\{4\}/);
assert.match(viewer, /Previous/);
assert.match(viewer, /Next/);
assert.match(viewer, /onRequestClose=\{onClose\}/);

console.log("Marketplace Vendor UI presentation tests passed");
