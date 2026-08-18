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
