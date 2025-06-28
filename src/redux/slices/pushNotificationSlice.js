import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentOrderId: null, // The orderId currently being processed/shown
  orderQueue: [], // Queue of pending orderIds
  showPopup: false, // Controls whether the popup is visible
};

const pushNotificationSlice = createSlice({
  name: "pushNotification",
  initialState,
  reducers: {
    // Action to handle incoming push notification data
    addPushNotificationOrder: (state, { payload }) => {
      const { orderId } = payload;

      // Prevent adding duplicate orderIds if already in current or queue
      if (
        state.currentOrderId === orderId ||
        state.orderQueue.includes(orderId)
      ) {
        console.log(
          `Order ID ${orderId} already exists in current or queue. Ignoring.`
        );
        return; // Do not add duplicate
      }

      // If no order is currently active, set this as the current one
      if (state.currentOrderId === null) {
        state.currentOrderId = orderId;
        state.showPopup = true; // Show popup immediately for the first order
      } else {
        // Otherwise, add it to the queue
        state.orderQueue.push(orderId);
      }
      console.log(
        "State after addPushNotificationOrder:",
        state.currentOrderId,
        state.orderQueue
      );
    },

    // Action to clear the current order and potentially show the next one from the queue
    clearCurrentNotificationOrder: (state) => {
      state.currentOrderId = null;
      state.showPopup = false; // Hide popup when current order is cleared

      // If there are items in the queue, move the first one to currentOrderId
      if (state.orderQueue.length > 0) {
        state.currentOrderId = state.orderQueue.shift(); // .shift() removes and returns the first element
        state.showPopup = true; // Show popup for the new current order
      }
      console.log(
        "State after clearCurrentNotificationOrder:",
        state.currentOrderId,
        state.orderQueue
      );
    },

    // Action to explicitly hide the popup without clearing the current order
    // Useful if the user just dismisses the popup but the order is still "active"
    hideNotificationPopup: (state) => {
      state.showPopup = false;
      console.log(
        "State after hideNotificationPopup:",
        state.currentOrderId,
        state.orderQueue
      );
    },

    // Slice cleanup
    clearPushNotificationRedux: () => initialState,
  },
});

export const {
  addPushNotificationOrder,
  clearCurrentNotificationOrder,
  hideNotificationPopup,
  clearPushNotificationRedux,
} = pushNotificationSlice.actions;

export default pushNotificationSlice.reducer;
