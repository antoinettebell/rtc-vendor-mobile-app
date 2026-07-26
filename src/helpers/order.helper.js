import moment from "moment";

import { orderStatusStrings } from "../utils/constants";

export const getDisabledStatuses = (currentStatus) => {
  const allStatuses = [
    orderStatusStrings.cancel,
    orderStatusStrings.placed,
    orderStatusStrings.accepted,
    orderStatusStrings.rejected,
    orderStatusStrings.preparing,
    orderStatusStrings.ready_for_pickup,
    orderStatusStrings.driver_picked_up,
    orderStatusStrings.delivered,
    orderStatusStrings.completed,
  ];

  // Always disable the current status itself
  const disabledStatuses = [currentStatus];

  switch (currentStatus) {
    case orderStatusStrings.cancel:
      disabledStatuses.push(
        orderStatusStrings.placed,
        orderStatusStrings.accepted,
        orderStatusStrings.rejected,
        orderStatusStrings.preparing,
        orderStatusStrings.ready_for_pickup,
        orderStatusStrings.driver_picked_up,
        orderStatusStrings.delivered,
        orderStatusStrings.completed
      );
      break;
    case orderStatusStrings.placed:
      disabledStatuses.push(
        orderStatusStrings.cancel,
        orderStatusStrings.preparing,
        orderStatusStrings.ready_for_pickup,
        orderStatusStrings.driver_picked_up,
        orderStatusStrings.delivered,
        orderStatusStrings.completed
      );
      break;
    case orderStatusStrings.accepted:
      disabledStatuses.push(
        orderStatusStrings.cancel,
        orderStatusStrings.placed,
        orderStatusStrings.ready_for_pickup,
        orderStatusStrings.driver_picked_up,
        orderStatusStrings.delivered
      );
      break;
    case orderStatusStrings.rejected:
      return allStatuses;
    case orderStatusStrings.preparing:
      disabledStatuses.push(
        orderStatusStrings.cancel,
        orderStatusStrings.placed,
        orderStatusStrings.accepted,
        orderStatusStrings.driver_picked_up,
        orderStatusStrings.delivered
      );
      break;
    case orderStatusStrings.ready_for_pickup:
      disabledStatuses.push(
        orderStatusStrings.cancel,
        orderStatusStrings.placed,
        orderStatusStrings.accepted,
        orderStatusStrings.preparing
      );
      break;
    case orderStatusStrings.driver_picked_up:
      return allStatuses;
    case orderStatusStrings.delivered:
      return allStatuses;
    case orderStatusStrings.completed:
      return allStatuses;
    default:
      // For unknown status, only disable itself
      break;
  }

  return disabledStatuses;
};

export const calculateTotalPreparationTime = (orderObject) => {
  // Use optional chaining (?.) to safely access nested properties.
  // Use nullish coalescing (??) to default to an empty array if 'items' is null or undefined.
  const items = orderObject?.items ?? [];

  // Use the reduce method to sum up the preparation times for all items.
  const totalMinutes = items.reduce((accumulator, currentItem) => {
    // Get quantity, default to 0 if it's null or undefined.
    const qty = currentItem.qty ?? 0;

    // Get preparationTime from the nested menuItem, default to 0 if missing or null.
    const preparationTime = currentItem.menuItem?.preparationTime ?? 0;

    // Add the calculated time for the current item to the accumulator.
    return accumulator + qty * preparationTime;
  }, 0); // Start the accumulator at 0.

  return totalMinutes;
};

export const extractAdvanceOrderLocationAndTime = (order) => {
  const foodTruck = order.foodTruck;
  const locationId = order.locationId;
  const availabilityId = order.availabilityId;

  let locationTitle = null;
  let advanceOrder = false;
  let advanceLocationTitle = null;
  let advanceTime = null;

  // Find the location title
  if (foodTruck && foodTruck.locations && locationId) {
    const foundLocation = foodTruck.locations.find(
      (loc) => loc._id === locationId
    );
    if (foundLocation) {
      locationTitle = foundLocation.title;
    }
  }

  // Determine advance order status and details if availabilityId exists
  if (availabilityId) {
    advanceOrder = true;

    if (foodTruck && foodTruck.availability) {
      const foundAvailability = foodTruck.availability.find(
        (avail) => avail._id === availabilityId
      );

      if (foundAvailability) {
        // Get advance location title
        if (foodTruck.locations) {
          const advLocation = foodTruck.locations.find(
            (loc) => loc._id === foundAvailability.locationId
          );
          if (advLocation) {
            advanceLocationTitle = advLocation.title;
          }
        }

        // Format advance time
        const dayMap = {
          mon: "Mon",
          tue: "Tue",
          wed: "Wed",
          thu: "Thu",
          fri: "Fri",
          sat: "Sat",
          sun: "Sun",
        };
        const day =
          dayMap[foundAvailability.day.toLowerCase()] || foundAvailability.day;

        const formattedStartTime = moment(
          foundAvailability.startTime,
          "HH:mm"
        ).format("hh:mm A");
        const formattedEndTime = moment(
          foundAvailability.endTime,
          "HH:mm"
        ).format("hh:mm A");

        advanceTime = `${moment(order.deliveryDate).format("DD-MMM")}, ${day} - ${moment(order.deliveryTime, "HH:mm").format("hh:mm A")}`;
        // advanceTime = `${day}, ${formattedStartTime}-${formattedEndTime}`;
      }
    }
  }

  return {
    locationTitle: locationTitle,
    advanceOrder: advanceOrder,
    advanceLocationTitle: advanceLocationTitle,
    advanceTime: advanceTime,
  };
};

const deliverySuccessOrderFlow = [
  orderStatusStrings.placed,
  orderStatusStrings.accepted,
  orderStatusStrings.preparing,
  orderStatusStrings.ready_for_pickup,
  orderStatusStrings.driver_picked_up,
  orderStatusStrings.delivered,
  orderStatusStrings.completed,
];

const pickupSuccessOrderFlow = [
  orderStatusStrings.placed,
  orderStatusStrings.accepted,
  orderStatusStrings.preparing,
  orderStatusStrings.ready_for_pickup,
  orderStatusStrings.completed,
];

/**
 * Returns the next order status in the successful flow.
 *
 * @param {string} currentStatus - The current status of the order.
 * @param {Object} order - The order object, used to pick pickup vs delivery flow.
 * @returns {string|null} The next order status, or null if the current
 * status is the last one or not part of the successful flow.
 */
export const getNextOrderStatus = (currentStatus, order = null) => {
  const successOrderFlow =
    order?.fulfillmentType === "DELIVERY"
      ? deliverySuccessOrderFlow
      : pickupSuccessOrderFlow;

  // Find the index of the current status in the success flow
  const currentIndex = successOrderFlow.indexOf(currentStatus);

  // Check if the status is valid and not the last one
  if (currentIndex > -1 && currentIndex < successOrderFlow.length - 1) {
    // Return the next status in the sequence
    return successOrderFlow[currentIndex + 1];
  }

  // Return null if the current status is the last one or not found
  return null;
};

export const isVendorPosOrder = (order) =>
  ["VENDOR_POS", "WALK_UP_EMPLOYEE"].includes(order?.orderSource);

const toMoneyNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
};

export const getVendorOrderSubtotal = (order) =>
  toMoneyNumber(
    order?.subTotal ??
      order?.subtotal ??
      order?.totalAfterDiscount ??
      0
  );

export const getVendorTipAmount = (order) =>
  toMoneyNumber(order?.tipsAmount ?? order?.foodTruckTip ?? order?.vendorTip ?? 0);

export const getVendorOrderTotal = (order) =>
  toMoneyNumber(getVendorOrderSubtotal(order) + getVendorTipAmount(order));

export const getPastOrderDate = (order) =>
  order?.statusTime?.deliveredAt ||
  order?.statusTime?.completedAt ||
  order?.updatedAt ||
  order?.createdAt;

export const formatMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '0.00';
  }
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
