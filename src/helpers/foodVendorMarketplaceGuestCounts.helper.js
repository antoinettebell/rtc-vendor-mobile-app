const positive = (value) => Math.max(0, Number(value || 0));

export const getFoodVendorMarketplaceGuestRows = ({ event = {}, participationPath = null, coverage = null } = {}) => {
  const sourceEvent = event || {};
  const path = String(participationPath || "").toUpperCase();
  const selectedCoverage = String(coverage || sourceEvent.guest_coverage || "").toUpperCase();
  const gaGuests = positive(sourceEvent.expected_ga_guests || sourceEvent.number_of_guests || sourceEvent.expected_guest_count);
  const vipGuests = sourceEvent.vip_section_enabled ? positive(sourceEvent.expected_vip_guests || sourceEvent.vip_guest_count) : 0;
  const ga = () => ({ label: "GA Guests", value: String(gaGuests) });
  const vip = () => ({ label: "VIP Guests", value: String(vipGuests) });
  if (selectedCoverage === "BOTH" || path === "BOTH") return [ga(), vip()];
  if (selectedCoverage === "VIP" || path === "VIP" || (sourceEvent.catered_vip_section_enabled && !sourceEvent.fully_catered_event && path === "BID")) return [vip()];
  if (path === "APPLICATION" || sourceEvent.payment_responsibility === "VENDOR") return [ga()];
  return [{ label: "Regular Catered Guests", value: String(gaGuests) }];
};

export const getFoodVendorMarketplaceCloseDate = (event = {}) => event?.event_close_date || null;
