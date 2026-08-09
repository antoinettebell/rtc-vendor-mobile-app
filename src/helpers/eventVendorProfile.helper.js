export const MERCHANDISE_CATEGORIES = [
  {
    value: "ARTISANS_CRAFTERS",
    label: "Artisans and Crafters",
    description:
      "Handmade jewelry, pottery, original art, leather goods, and custom home décor.",
  },
  {
    value: "APPAREL_ACCESSORIES",
    label: "Apparel and Accessory Vendors",
    description:
      "Sunglasses, vintage clothing, hats, fashion, and specialty wear.",
  },
  {
    value: "COMMERCIAL_RETAIL",
    label: "Commercial and Retail Vendors",
    description:
      "Mass-produced goods, lifestyle products, and sponsored promotional items.",
  },
  {
    value: "LOCAL_MAKERS_SPECIALTY",
    label: "Local Makers and Specialty Goods",
    description:
      "Natural body care, candles, honey, regional products, and packaged artisanal foods.",
  },
];

export const shouldShowPermanentPhotos = (profile) =>
  profile?.vendor_types?.includes("MERCHANDISE") === true;

export const getProfileOnboardingDestination = (vendorTypes = []) =>
  vendorTypes.includes("MERCHANDISE")
    ? "EVENT_VENDOR_PHOTOS"
    : "SUBMIT_PROFILE_REVIEW";

export const getProfileActionPresentation = (profile, vendorTypes = []) => {
  const status = String(profile?.review_status || "DRAFT").toUpperCase();
  const isMerchandise = vendorTypes.includes("MERCHANDISE");
  return {
    status,
    showAwaitingApproval: status === "PENDING_REVIEW",
    showApprovedStatus: status === "APPROVED",
    showRejection: status === "REJECTED",
    showSubmitFromProfile: !isMerchandise && status !== "PENDING_REVIEW",
    showContinueToPhotos: isMerchandise && status !== "PENDING_REVIEW",
  };
};

export const getEventVendorAccessState = (profile) => {
  const status = String(profile?.review_status || "DRAFT").toUpperCase();
  return {
    profileStatus: status,
    canUseMarketplace: status === "APPROVED",
    isAwaitingApproval: status === "PENDING_REVIEW",
    canEdit: status !== "PENDING_REVIEW",
    canResubmit: status === "REJECTED",
  };
};

export const getEventVendorSignInTransition = (profile) => {
  const access = getEventVendorAccessState(profile);
  return {
    isSignedIn: access.canUseMarketplace,
    isOnboarded: true,
    isUnderReview: access.isAwaitingApproval,
    vendorOnboardingStep: access.isAwaitingApproval
      ? "AWAITING_APPROVAL"
      : null,
    destination: access.canUseMarketplace
      ? "MARKETPLACE"
      : access.isAwaitingApproval
        ? "AWAITING_APPROVAL"
        : "EVENT_VENDOR_PROFILE",
  };
};

export const groupPhotosByCategory = (photos = []) =>
  MERCHANDISE_CATEGORIES.reduce(
    (groups, category) => ({
      ...groups,
      [category.value]: photos.filter(
        (photo) => photo.category === category.value,
      ),
    }),
    {},
  );

export const toggleApplicationPhoto = (selected = [], photoId, maximum = 5) => {
  if (selected.includes(photoId)) return selected.filter((id) => id !== photoId);
  return selected.length < maximum ? [...selected, photoId] : selected;
};
