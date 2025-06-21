import { orderStatusStrings } from "../utils/constants";

export const getDisabledStatuses = (currentStatus) => {
  const allStatuses = [
    orderStatusStrings.cancel,
    orderStatusStrings.placed,
    orderStatusStrings.accepted,
    orderStatusStrings.rejected,
    orderStatusStrings.preparing,
    orderStatusStrings.ready_for_pickup,
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
        orderStatusStrings.completed
      );
      break;
    case orderStatusStrings.placed:
      disabledStatuses.push(
        orderStatusStrings.cancel,
        orderStatusStrings.preparing,
        orderStatusStrings.ready_for_pickup,
        orderStatusStrings.completed
      );
      break;
    case orderStatusStrings.accepted:
      disabledStatuses.push(
        orderStatusStrings.cancel,
        orderStatusStrings.placed,
        orderStatusStrings.ready_for_pickup,
        orderStatusStrings.completed
      );
      break;
    case orderStatusStrings.rejected:
      return allStatuses;
    case orderStatusStrings.preparing:
      disabledStatuses.push(
        orderStatusStrings.cancel,
        orderStatusStrings.placed,
        orderStatusStrings.accepted,
        orderStatusStrings.completed
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

// The successful order flow sequence
const successOrderFlow = [
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
 * @returns {string|null} The next order status, or null if the current
 * status is the last one or not part of the successful flow.
 */
export const getNextOrderStatus = (currentStatus) => {
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
