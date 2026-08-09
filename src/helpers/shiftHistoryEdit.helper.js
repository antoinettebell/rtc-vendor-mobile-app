export const formatShiftEditDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not selected";
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

export const formatShiftEditTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not selected";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const mergeShiftDatePart = (currentValue, selectedDate) => {
  const current = new Date(currentValue);
  const next = new Date(selectedDate);
  next.setHours(current.getHours(), current.getMinutes(), 0, 0);
  return next;
};

export const mergeShiftTimePart = (currentValue, selectedTime) => {
  const next = new Date(currentValue);
  const time = new Date(selectedTime);
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next;
};

export const isValidShiftRange = (startedAt, endedAt) =>
  new Date(endedAt).getTime() > new Date(startedAt).getTime();

export const getBreakMinuteOptions = (savedValue, maximumMinutes = 240) => {
  const savedMinutes = Number(savedValue);
  const boundedMaximum = Math.max(
    maximumMinutes,
    Number.isFinite(savedMinutes) ? Math.ceil(savedMinutes / 5) * 5 : 0,
  );
  return Array.from({ length: boundedMaximum / 5 + 1 }, (_, index) => ({
    label: `${index * 5} minutes`,
    value: String(index * 5),
  }));
};
