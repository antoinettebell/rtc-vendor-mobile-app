export const getMarketplaceEventSupportId = (...records) => {
  const eventId = records
    .map((record) => record?.event_id)
    .find(Boolean);

  return String(eventId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();
};
