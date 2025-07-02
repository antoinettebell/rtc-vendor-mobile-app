import moment from "moment";
import { v4 as uuidv4 } from "uuid";

export const transformLocationsForAPI = (data) => {
  return data.flatMap((dayItem) =>
    dayItem.locations
      .filter((location) => location.value)
      .map((location) => {
        return {
          ...(location?._id && { _id: location._id }), // Keep existing ID if available
          locationId: location.value,
          day: dayItem.day.toLowerCase(),
          startTime: moment(location.openTime).format("HH:mm"),
          endTime: moment(location.closeTime).format("HH:mm"),
          available: location.enabled,
        };
      })
  );
};

export const hasTimeOverlap = (startTime1, endTime1, startTime2, endTime2) => {
  // Convert times to moments for easier comparison
  // It's crucial that these are distinct Date objects, even if they represent the same time.
  // Moment handles comparisons correctly for Date objects.
  const s1 = moment(startTime1);
  const e1 = moment(endTime1);
  const s2 = moment(startTime2);
  const e2 = moment(endTime2);

  // Scenario 1: One interval completely contains the other
  // e.g., [9-5] vs [10-4]
  if (
    (s1.isSameOrBefore(s2) && e1.isSameOrAfter(e2)) ||
    (s2.isSameOrBefore(s1) && e2.isSameOrAfter(e1))
  ) {
    console.log("    Overlap: One interval contains the other.");
    return true;
  }

  // Scenario 2: Partial overlap
  // e.g., [9-5] vs [4-10]
  if (s1.isBefore(e2) && s2.isBefore(e1)) {
    console.log("    Overlap: Partial overlap.");
    return true;
  }

  // Scenario 3: Identical start and end times (e.g., 12:00 AM - 12:00 AM for both)
  // This specifically catches the zero-duration default time if it's identical
  if (s1.isSame(s2) && e1.isSame(e2)) {
    console.log("    Overlap: Identical intervals.");
    return true;
  }

  console.log("    No overlap detected.");
  return false;
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Function to transform API data to component format
export const transformApiDataToState = (apiData, locationData = []) => {
  return days.map((day) => {
    const dayLower = day.toLowerCase();
    const dayEntries = apiData.filter((item) => item.day === dayLower);

    // If no entries for this day, return default
    if (dayEntries.length === 0) {
      return {
        day,
        locations: [
          {
            uniqueId: uuidv4(),
            value: null,
            locationTitle: "",
            openTime: moment().startOf("day").toDate(),
            closeTime: moment().startOf("day").toDate(),
            enabled: false,
          },
        ],
      };
    }

    // Transform each location entry for this day
    return {
      day,
      locations: dayEntries.map((entry) => {
        // Find the matching location from locationData
        const location = locationData.find(
          (loc) => loc._id === entry.locationId
        );

        return {
          uniqueId: uuidv4(),
          value: entry.locationId,
          locationTitle: location?.title || "",
          openTime: moment(entry.startTime, "HH:mm").toDate(),
          closeTime: moment(entry.endTime, "HH:mm").toDate(),
          enabled: entry.available,
          _id: entry._id,
        };
      }),
    };
  });
};
