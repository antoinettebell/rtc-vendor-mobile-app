const positive = (value) => Math.max(0, Number(value || 0));

export const getFoodVendorMarketplaceGuestRows = ({ event = {}, participationPath = null, coverage = null } = {}) => {
  const path = String(participationPath || "").toUpperCase();
  const selectedCoverage = String(coverage || event.guest_coverage || "").toUpperCase();
  const gaGuests = positive(event.expected_ga_guests || event.number_of_guests || event.expected_guest_count);
  const vipGuests = event.vip_section_enabled ? positive(event.expected_vip_guests || event.vip_guest_count) : 0;
  const ga = () => ({ label: "GA Guests", value: String(gaGuests) });
  const vip = () => ({ label: "VIP Guests", value: String(vipGuests) });
  if (selectedCoverage === "BOTH" || path === "BOTH") return [ga(), vip()];
  if (selectedCoverage === "VIP" || path === "VIP" || (event.catered_vip_section_enabled && !event.fully_catered_event && path === "BID")) return [vip()];
  if (path === "APPLICATION" || event.payment_responsibility === "VENDOR") return [ga()];
  return [{ label: "Regular Catered Guests", value: String(gaGuests) }];
};

export const getFoodVendorMarketplaceCloseDate = (event = {}) => event.event_close_date || null;
