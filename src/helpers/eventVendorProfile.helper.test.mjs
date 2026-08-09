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
const approvedNetworkFailure = helper.getEventVendorStatusFailureTransition({
  error: new Error("Network unavailable"),
  existingProfile: { review_status: "APPROVED" },
});
assert.deepEqual(approvedNetworkFailure, {
  action: "RETRY",
  clearSession: false,
  authoritativeMissing: false,
  preservedDestination: "MARKETPLACE",
});
const pendingServerFailure = helper.getEventVendorStatusFailureTransition({
  error: { response: { status: 500 } },
  existingProfile: { review_status: "PENDING_REVIEW" },
});
assert.equal(pendingServerFailure.clearSession, false);
assert.equal(pendingServerFailure.preservedDestination, "AWAITING_APPROVAL");
for (const status of [404, 410]) {
  assert.deepEqual(
    helper.getEventVendorStatusFailureTransition({ error: { response: { status } } }),
    { action: "SIGN_IN", clearSession: true, authoritativeMissing: true },
  );
}
assert.deepEqual(helper.getEventVendorStatusFailureUserAction("RETRY"), { retry: true, clearSession: false });
assert.deepEqual(helper.getEventVendorStatusFailureUserAction("SIGN_OUT"), { retry: false, clearSession: true });

for (const [profile, expected] of [
  [null, "EVENT_VENDOR_PROFILE"],
  [{ review_status: "DRAFT" }, "EVENT_VENDOR_PROFILE"],
  [{ review_status: "DRAFT", vendor_types: ["MERCHANDISE"], business_name: "Maker", business_description: "Goods", logo_url: "logo", merchandise_categories: ["ARTISANS_CRAFTERS"] }, "EVENT_VENDOR_PHOTOS"],
  [{ review_status: "PENDING_REVIEW" }, "AWAITING_APPROVAL"],
  [{ review_status: "REJECTED" }, "EVENT_VENDOR_PROFILE"],
  [{ review_status: "APPROVED" }, "MARKETPLACE"],
]) {
  assert.equal(
    helper.getEventVendorColdLaunchTransition({ profile, onboardingSessionActive: true }).destination,
    expected,
    `retry reconciliation routes ${profile?.review_status || "missing"} correctly`,
  );
}
for (const [profile, expected] of [
  [null, "SIGN_IN"],
  [{ review_status: "DRAFT" }, "SIGN_IN"],
  [{ review_status: "REJECTED", rejection_reason: "More photos" }, "SIGN_IN"],
  [{ review_status: "PENDING_REVIEW" }, "AWAITING_APPROVAL"],
  [{ review_status: "APPROVED" }, "MARKETPLACE"],
]) {
  const cold = helper.getEventVendorColdLaunchTransition({
    profile,
    onboardingSessionActive: false,
    isUnderReview: true,
    vendorOnboardingStep: "AWAITING_APPROVAL",
  });
  assert.equal(cold.destination, expected, `cold launch uses profile status for ${profile?.review_status || "missing"}`);
}
assert.equal(
  helper.getEventVendorColdLaunchTransition({
    profile: { review_status: "DRAFT" },
    onboardingSessionActive: true,
  }).destination,
  "EVENT_VENDOR_PROFILE",
  "a deliberate live onboarding session may resume a draft",
);
assert.equal(
  helper.getEventVendorResumeDestination({
    review_status: "DRAFT",
    vendor_types: ["MERCHANDISE"],
    business_name: "Maker",
    business_description: "Goods",
    logo_url: "logo",
    merchandise_categories: ["ARTISANS_CRAFTERS"],
  }),
  "EVENT_VENDOR_PHOTOS",
  "a completed merchandise profile resumes at categorized photos",
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
const selectedCategoryProfile = {
  merchandise_categories: ["ARTISANS_CRAFTERS", "APPAREL_ACCESSORIES"],
};
assert.deepEqual(
  helper.getSelectedMerchandiseCategories(selectedCategoryProfile).map((category) => category.value),
  ["ARTISANS_CRAFTERS", "APPAREL_ACCESSORIES"],
  "Photos renders selected categories only",
);
const repositoryPhoto = (category) => ({ category, source: "REPOSITORY", status: "ACTIVE" });
assert.deepEqual(
  helper.getMerchandisePortfolioProgress(selectedCategoryProfile, [
    repositoryPhoto("ARTISANS_CRAFTERS"),
    repositoryPhoto("ARTISANS_CRAFTERS"),
    repositoryPhoto("ARTISANS_CRAFTERS"),
  ]),
  { activeCount: 3, required: 3, complete: true },
  "all three photos may be in one selected category",
);
assert.equal(
  helper.getMerchandisePortfolioProgress(selectedCategoryProfile, [
    repositoryPhoto("ARTISANS_CRAFTERS"),
    repositoryPhoto("APPAREL_ACCESSORIES"),
  ]).complete,
  false,
  "two photos keep submission disabled",
);
assert.deepEqual(
  helper.getMerchandisePortfolioProgress(selectedCategoryProfile, [
    repositoryPhoto("ARTISANS_CRAFTERS"),
    repositoryPhoto("APPAREL_ACCESSORIES"),
    repositoryPhoto("APPAREL_ACCESSORIES"),
    repositoryPhoto("COMMERCIAL_RETAIL"),
  ]),
  { activeCount: 3, required: 3, complete: true },
  "an unselected-category photo does not count",
);
assert.equal(
  helper.getMarketplaceApiErrorMessage(
    { response: { data: { message: "Add at least 3 portfolio photos" } } },
    "fallback",
  ),
  "Add at least 3 portfolio photos",
  "backend validation message is shown",
);

const photos = helper.MERCHANDISE_CATEGORIES.map((category, index) => ({ photo_id: `p-${index}`, category: category.value }));
const grouped = helper.groupPhotosByCategory(photos);
helper.MERCHANDISE_CATEGORIES.forEach((category) => assert.equal(grouped[category.value].length, 1));

assert.deepEqual(helper.toggleApplicationPhoto(["1", "2"], "1"), ["2"]);
assert.deepEqual(helper.toggleApplicationPhoto(["1", "2"], "3"), ["1", "2", "3"]);
assert.deepEqual(helper.toggleApplicationPhoto(["1", "2", "3", "4", "5"], "6"), ["1", "2", "3", "4", "5"]);

console.log("Marketplace Vendor profile lifecycle tests passed.");
