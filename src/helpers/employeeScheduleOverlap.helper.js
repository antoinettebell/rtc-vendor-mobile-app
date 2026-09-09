const DAY_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const getMinutes = (time) => {
  const match = String(time || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const getIntervals = (assignments = []) =>
  assignments.flatMap((assignment, assignmentIndex) =>
    (assignment.days || []).flatMap((day) => {
      if (!day.enabled || DAY_INDEX[day.day] === undefined) return [];
      const startMinutes = getMinutes(day.clock_in);
      const endMinutes = getMinutes(day.clock_out);
      if (startMinutes === null || endMinutes === null) return [];

      const start = DAY_INDEX[day.day] * 24 * 60 + startMinutes;
      let end = DAY_INDEX[day.day] * 24 * 60 + endMinutes;
      if (end <= start) end += 24 * 60;
      return [{ assignmentIndex, day: day.day, start, end }];
    }),
  );

export const findScheduleOverlap = (assignments = []) => {
  const intervals = getIntervals(assignments);
  const weekMinutes = 7 * 24 * 60;
  for (let leftIndex = 0; leftIndex < intervals.length; leftIndex += 1) {
    const left = intervals[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < intervals.length; rightIndex += 1) {
      const right = intervals[rightIndex];
      for (const weekOffset of [-weekMinutes, 0, weekMinutes]) {
        if (
          left.start < right.end + weekOffset &&
          right.start + weekOffset < left.end
        ) {
          return { left, right };
        }
      }
    }
  }
  return null;
};
