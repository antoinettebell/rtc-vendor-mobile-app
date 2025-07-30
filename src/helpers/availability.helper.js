import moment from "moment";
import { v4 as uuidv4 } from "uuid";

export const transformLocationsForAPI = (data) => {
  return data.flatMap((dayItem) =>
    dayItem.locations
      .filter((location) => location.value) // keep only that items, which have location
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

export const transformBusinessHoursForAPI = (data) => {
  return data
    .filter((location) => location.value) // keep only that items, which have location
    .map((location) => {
      return {
        ...(location?._id && { _id: location._id }), // Keep existing ID if available
        locationId: location.value,
        startTime: moment(location.openTime).format("HH:mm"),
        endTime: moment(location.closeTime).format("HH:mm"),
        available: location.enabled,
      };
    });
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

/**
 * Formats API data to the component state format
 * @param {Array} apiAvailability - The availability data from API
 * @param {Array} apiLocations - The locations data from API
 * @returns {Array} - Formatted data for component state
 */
export const formatApiDataToComponentState = (
  apiAvailability,
  apiLocations
) => {
  // Create a map to track which days have enabled slots
  const daysWithEnabledSlots = {};

  // Initialize the state structure with default values for all days
  const formattedData = days.map((day) => ({
    day,
    dayEnabled: false,
    locations: [
      {
        uniqueId: uuidv4(),
        value: null,
        openTime: moment().startOf("day").toDate(),
        closeTime: moment().startOf("day").toDate(),
        enabled: false,
      },
    ],
  }));

  // Group availability entries by day
  const availabilityByDay = {};

  apiAvailability.forEach((item) => {
    // Convert day format from 'mon' to 'Mon'
    const dayKey = item.day.charAt(0).toUpperCase() + item.day.slice(1, 3);
    if (!availabilityByDay[dayKey]) {
      availabilityByDay[dayKey] = [];
    }
    availabilityByDay[dayKey].push(item);

    // Mark this day as having at least one enabled slot if available is true
    if (item.available) {
      daysWithEnabledSlots[dayKey] = true;
    }
  });

  // Process each day
  days.forEach((day, index) => {
    const dayEntries = availabilityByDay[day] || [];

    // If we have entries for this day
    if (dayEntries.length > 0) {
      // Set dayEnabled to true if any slot is enabled
      formattedData[index].dayEnabled = !!daysWithEnabledSlots[day];

      // Map the entries to the correct format
      const mappedLocations = dayEntries.map((entry) => {
        // Find the corresponding location data
        const locationData = apiLocations.find(
          (loc) => loc._id === entry.locationId
        );

        return {
          uniqueId: uuidv4(),
          value: entry.locationId,
          openTime: moment(entry.startTime, "HH:mm").toDate(),
          closeTime: moment(entry.endTime, "HH:mm").toDate(),
          enabled: entry.available,
          _id: entry._id, // Keep the original ID for updates
          locationTitle: locationData?.title || "",
          locationAddress: locationData?.address || "",
        };
      });

      // Replace the default location with our mapped locations
      if (mappedLocations.length > 0) {
        formattedData[index].locations = mappedLocations;
      }
    }
  });

  console.log("Formatted Data for Component:", formattedData);
  return formattedData;
};
