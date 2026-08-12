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

const eventTimeZone = (event = {}) =>
  event.event_timezone || event.time_zone || event.timezone || "America/New_York";

export const formatMarketplaceEventDate = (value, timeZone = "America/New_York") => {
  if (!value) return null;
  const plainDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (plainDate) {
    return `${plainDate[2]}/${plainDate[3]}/${plainDate[1]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatMarketplaceEventTime = (value, timeZone = "America/New_York") => {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (match) {
    let hour = Number(match[1]);
    const suffix = match[3]?.toLowerCase();
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export const getMarketplaceVendorEventPresentation = (event = {}) => ({
  eventId: event.event_id,
  name: event.event_name || "Marketplace Event",
  description: event.event_description || "No description provided.",
  date: formatMarketplaceEventDate(event.event_date || event.event_start_date, eventTimeZone(event)),
  startTime: formatMarketplaceEventTime(event.event_start_time || event.event_time || event.start_time, eventTimeZone(event)),
  endTime: formatMarketplaceEventTime(event.event_end_time || event.event_close_time || event.end_time, eventTimeZone(event)),
  location:
    event.event_address || event.formatted_address ||
    [event.event_city, event.event_state].filter(Boolean).join(", ") ||
    "Location pending",
  gaGuests: Number(event.expected_ga_guests || event.expected_guest_count || event.number_of_guests || 0),
  vipGuests: Number(event.expected_vip_guests || event.vip_guest_count || 0),
  expectedGuests:
    Number(event.expected_ga_guests || event.expected_guest_count || event.number_of_guests || 0) +
    Number(event.expected_vip_guests || event.vip_guest_count || 0),
  whoPays: event.payment_responsibility || event.who_pays || "Not specified",
  paymentDeadline:
    formatMarketplaceEventDate(
      event.last_date_to_accept_payments ||
      event.vendor_payment_deadline ||
      event.vendor_fee_payment_deadline,
      eventTimeZone(event),
    ),
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
