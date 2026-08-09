import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./eventVendorProfile.helper.js", import.meta.url), "utf8");
const helper = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

assert.deepEqual(helper.getEventVendorAccessState(null), {
  profileStatus: "DRAFT",
  canUseMarketplace: false,
  isAwaitingApproval: false,
  canEdit: true,
  canResubmit: false,
});
assert.equal(helper.getEventVendorAccessState({ review_status: "PENDING_REVIEW" }).isAwaitingApproval, true);
assert.equal(helper.getEventVendorAccessState({ review_status: "APPROVED" }).canUseMarketplace, true);
assert.equal(helper.getEventVendorAccessState({ review_status: "REJECTED" }).canResubmit, true);
assert.deepEqual(helper.getEventVendorSignInTransition({ review_status: "APPROVED" }), {
  isSignedIn: true,
  isOnboarded: true,
  isUnderReview: false,
  vendorOnboardingStep: null,
  destination: "MARKETPLACE",
});
assert.equal(
  helper.getEventVendorSignInTransition({ review_status: "DRAFT" }).destination,
  "EVENT_VENDOR_PROFILE",
  "an event vendor never enters food-truck onboarding",
);
assert.equal(helper.shouldShowPermanentPhotos({ vendor_types: ["SERVICE"] }), false);
assert.equal(helper.shouldShowPermanentPhotos({ vendor_types: ["MERCHANDISE", "SERVICE"] }), true);
assert.equal(helper.getProfileOnboardingDestination(["MERCHANDISE"]), "EVENT_VENDOR_PHOTOS");
assert.equal(helper.getProfileOnboardingDestination(["SERVICE"]), "SUBMIT_PROFILE_REVIEW");
assert.equal(helper.getProfileOnboardingDestination(["OTHER"]), "SUBMIT_PROFILE_REVIEW");
for (const vendorType of ["MERCHANDISE", "SERVICE"]) {
  const draft = helper.getProfileActionPresentation({ review_status: "DRAFT" }, [vendorType]);
  const pending = helper.getProfileActionPresentation({ review_status: "PENDING_REVIEW" }, [vendorType]);
  const rejected = helper.getProfileActionPresentation({ review_status: "REJECTED" }, [vendorType]);
  const approved = helper.getProfileActionPresentation({ review_status: "APPROVED" }, [vendorType]);
  assert.equal(draft.showAwaitingApproval, false);
  assert.equal(pending.showAwaitingApproval, true);
  assert.equal(rejected.showRejection, true);
  assert.equal(rejected.showAwaitingApproval, false);
  assert.equal(approved.showApprovedStatus, true);
  assert.equal(approved.showAwaitingApproval, false);
  assert.equal(draft.showContinueToPhotos, vendorType === "MERCHANDISE");
  assert.equal(draft.showSubmitFromProfile, vendorType === "SERVICE");
}
assert.equal(helper.MERCHANDISE_CATEGORIES.length, 4);

const photos = helper.MERCHANDISE_CATEGORIES.map((category, index) => ({ photo_id: `p-${index}`, category: category.value }));
const grouped = helper.groupPhotosByCategory(photos);
helper.MERCHANDISE_CATEGORIES.forEach((category) => assert.equal(grouped[category.value].length, 1));

assert.deepEqual(helper.toggleApplicationPhoto(["1", "2"], "1"), ["2"]);
assert.deepEqual(helper.toggleApplicationPhoto(["1", "2"], "3"), ["1", "2", "3"]);
assert.deepEqual(helper.toggleApplicationPhoto(["1", "2", "3", "4", "5"], "6"), ["1", "2", "3", "4", "5"]);

console.log("Marketplace Vendor profile lifecycle tests passed.");
