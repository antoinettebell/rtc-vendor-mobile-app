import { orderStatusSrings } from "./constants";

export function getDisabledStatuses(currentStatus) {
  const allStatuses = [
    orderStatusSrings.cancel,
    orderStatusSrings.placed,
    orderStatusSrings.accepted,
    orderStatusSrings.rejected,
    orderStatusSrings.preparing,
    orderStatusSrings.ready_for_pickup,
    orderStatusSrings.completed,
  ];

  // Always disable the current status itself
  const disabledStatuses = [currentStatus];

  switch (currentStatus) {
    case orderStatusSrings.cancel:
      disabledStatuses.push(
        orderStatusSrings.placed,
        orderStatusSrings.accepted,
        orderStatusSrings.rejected,
        orderStatusSrings.preparing,
        orderStatusSrings.ready_for_pickup,
        orderStatusSrings.completed
      );
      break;
    case orderStatusSrings.placed:
      disabledStatuses.push(
        orderStatusSrings.cancel,
        orderStatusSrings.preparing,
        orderStatusSrings.ready_for_pickup,
        orderStatusSrings.completed
      );
      break;
    case orderStatusSrings.accepted:
      disabledStatuses.push(
        orderStatusSrings.cancel,
        orderStatusSrings.placed,
        orderStatusSrings.ready_for_pickup,
        orderStatusSrings.completed
      );
      break;
    case orderStatusSrings.rejected:
      return allStatuses;
    case orderStatusSrings.preparing:
      disabledStatuses.push(
        orderStatusSrings.cancel,
        orderStatusSrings.placed,
        orderStatusSrings.accepted,
        orderStatusSrings.completed
      );
      break;
    case orderStatusSrings.ready_for_pickup:
      disabledStatuses.push(
        orderStatusSrings.cancel,
        orderStatusSrings.placed,
        orderStatusSrings.accepted
      );
      break;
    case orderStatusSrings.completed:
      return allStatuses;
    default:
      // For unknown status, only disable itself
      break;
  }

  return disabledStatuses;
}
