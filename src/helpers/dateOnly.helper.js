const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

const partsFromValue = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const iso = value.match(ISO_DATE);
    if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
    const us = value.match(US_DATE);
    if (us) return { year: Number(us[3]), month: Number(us[1]), day: Number(us[2]) };
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

export const formatDateOnly = (value, fallback = "Not provided") => {
  const parts = partsFromValue(value);
  if (!parts) return fallback;
  return `${String(parts.month).padStart(2, "0")}/${String(parts.day).padStart(2, "0")}/${parts.year}`;
};

export const serializeDateOnly = (value) => {
  const parts = partsFromValue(value);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
};

export const parseDateOnly = (value) => {
  const parts = partsFromValue(value);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
};
