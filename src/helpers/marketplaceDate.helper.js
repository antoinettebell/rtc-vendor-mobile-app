const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/;

export const formatMarketplaceCalendarDate = (value) => {
  if (!value) return "Not set";
  if (value instanceof Date && Number.isNaN(value.getTime())) return String(value);

  const source = value instanceof Date ? value.toISOString() : String(value);
  const calendarDate = source.match(ISO_CALENDAR_DATE);
  if (calendarDate) {
    const [, year, month, day] = calendarDate;
    return `${month}/${day}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const getZonedCalendarParts = (value, timeZone = "America/New_York") => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    return Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(date)
        .filter(({ type }) => type !== "literal")
        .map(({ type, value: partValue }) => [type, partValue]),
    );
  } catch (_error) {
    return null;
  }
};

export const formatMarketplaceZonedDate = (
  value,
  timeZone = "America/New_York",
) => {
  if (!value) return "Not set";
  const legacyCalendarDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (legacyCalendarDate) {
    return `${legacyCalendarDate[2]}/${legacyCalendarDate[3]}/${legacyCalendarDate[1]}`;
  }
  const parts = getZonedCalendarParts(value, timeZone);
  return parts ? `${parts.month}/${parts.day}/${parts.year}` : "Not set";
};
