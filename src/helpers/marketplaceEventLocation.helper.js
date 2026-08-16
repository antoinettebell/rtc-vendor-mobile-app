export const getMarketplaceEventLocation = (event = {}) => {
  if (event.exact_address_locked) {
    return (
      [event.event_city, event.event_state].filter(Boolean).join(", ") ||
      "Exact address unlocks after payment or match"
    );
  }
  if (event.formatted_address || event.geocoded_address) {
    return event.formatted_address || event.geocoded_address;
  }
  const cityStateZip = [
    event.event_city,
    [event.event_state, event.event_zip].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");
  return [event.event_address, cityStateZip].filter(Boolean).join(", ") || "Location pending";
};
