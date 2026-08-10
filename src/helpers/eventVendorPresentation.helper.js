const PUBLIC_IMAGE_KEYS = ["images", "event_images", "public_images"];

export const getPublicEventImages = (event = {}) => {
  const candidates = PUBLIC_IMAGE_KEYS.flatMap((key) =>
    Array.isArray(event[key]) ? event[key] : [],
  );
  return candidates
    .map((image) => ({
      image_id: image?.image_id || image?.id || image?.image_url || image?.file_url,
      image_url: image?.image_url || image?.file_url || image?.url,
    }))
    .filter((image) => image.image_url);
};

export const getMarketplaceVendorEventPresentation = (event = {}) => ({
  eventId: event.event_id,
  name: event.event_name || "Marketplace Event",
  description: event.event_description || "No description provided.",
  date: event.event_date || event.event_start_date || null,
  startTime: event.event_start_time || event.event_time || event.start_time || null,
  endTime: event.event_end_time || event.event_close_time || event.end_time || null,
  location:
    event.event_address || event.formatted_address ||
    [event.event_city, event.event_state].filter(Boolean).join(", ") ||
    "Location pending",
  expectedGuests:
    Number(event.expected_ga_guests || event.expected_guest_count || event.number_of_guests || 0) +
    Number(event.expected_vip_guests || event.vip_guest_count || 0),
  whoPays: event.payment_responsibility || event.who_pays || "Not specified",
  paymentDeadline:
    event.last_date_to_accept_payments || event.vendor_payment_deadline || event.vendor_fee_payment_deadline || null,
  needs: (event.event_vendor_needs || []).map((need) => ({
    vendorType: need.vendor_type,
    fee: Number(need.fee || 0),
    required: Number(need.quantity || 0),
    filled: Number(need.filled || need.filled_quantity || 0),
    remaining: Math.max(0, Number(need.remaining ?? (Number(need.quantity || 0) - Number(need.filled || need.filled_quantity || 0)))),
  })),
  images: getPublicEventImages(event),
});

export const getApprovedProfilePresentation = (profile, editing = false) => ({
  approved: profile?.review_status === "APPROVED",
  readOnly: profile?.review_status === "APPROVED" && !editing,
  primaryAction: profile?.review_status === "APPROVED"
    ? editing ? "Save Changes" : "Edit Profile"
    : profile?.vendor_types?.includes("MERCHANDISE")
      ? "Save Profile & Continue to Photos"
      : "Save Draft / Profile",
  showCancel: profile?.review_status === "APPROVED" && editing,
});

export const getPhotoRepositoryPresentation = (profile, activeCount) => ({
  approved: profile?.review_status === "APPROVED",
  actionLabel: profile?.review_status === "APPROVED" ? "Save Photos" : "Submit Profile for Review",
  progressLabel: profile?.review_status === "APPROVED"
    ? `${activeCount}/40 repository photos · Up to 10 per category.`
    : `Portfolio photos: ${activeCount} of 3 required.`,
});
