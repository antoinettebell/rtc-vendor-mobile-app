import { orderStatusStrings } from "../utils/constants";

export const LIVE_ORDER_REFRESH_INTERVAL_MS = 5000;

export const getEmployeeOrderSource = (order = {}) =>
  order.orderSource || order.order_source || "CUSTOMER_APP";

export const isCustomerAppOrder = (order = {}) =>
  getEmployeeOrderSource(order) === "CUSTOMER_APP";

export const getEmployeeNextOrderStatus = (order = {}) => {
  const status = order.orderStatus;

  if (status === orderStatusStrings.placed) {
    return isCustomerAppOrder(order)
      ? orderStatusStrings.accepted
      : orderStatusStrings.preparing;
  }
  if (status === orderStatusStrings.accepted) {
    return orderStatusStrings.preparing;
  }
  if (status === orderStatusStrings.preparing) {
    return orderStatusStrings.ready_for_pickup;
  }
  if (
    [
      orderStatusStrings.ready_for_pickup,
      orderStatusStrings.driver_picked_up,
    ].includes(status)
  ) {
    return orderStatusStrings.completed;
  }
  return null;
};

export const getEmployeeOrderActionLabel = (order = {}) => {
  const next = getEmployeeNextOrderStatus(order);
  if (next === orderStatusStrings.accepted) return "Accept";
  if (next === orderStatusStrings.preparing) return "Start Preparing";
  if (next === orderStatusStrings.ready_for_pickup) return "Mark Ready";
  if (next === orderStatusStrings.completed) return "Complete";
  return null;
};

export const canEmployeeRejectOrder = (order = {}) =>
  isCustomerAppOrder(order) &&
  order.orderStatus === orderStatusStrings.placed;

export const getOrderFulfillmentLabel = (order = {}) =>
  String(order.fulfillmentType || "PICKUP").toUpperCase() === "DELIVERY"
    ? "Delivery"
    : "Pickup";
