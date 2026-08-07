import { createSlice } from "@reduxjs/toolkit";
import { calculateItemTotalWithDiscount } from "../../helpers/discount.helper";

const initialState = {
  currentOrder: {
    foodTruckId: null,
    foodTruckName: null,
    foodTruckLogo: null,
    items: [],
    totalItems: 0,
    subtotal: 0,
    lastUpdate: null,
  },
};

const calculateItemTotal = (item) => calculateItemTotalWithDiscount(item);

const posOrderSlice = createSlice({
  name: "posOrder",
  initialState,
  reducers: {
    addItemToPosOrder: (state, { payload }) => {
      const { foodTruckId, foodTruckName, foodTruckLogo, item } = payload;

      if (
        !state.currentOrder.foodTruckId ||
        state.currentOrder.foodTruckId !== foodTruckId
      ) {
        state.currentOrder = {
          foodTruckId,
          foodTruckName,
          foodTruckLogo,
          items: [],
          totalItems: 0,
          subtotal: 0,
          lastUpdate: new Date().toISOString(),
        };
      }

      const forceNewLine = item._forceNewLine === true;
      const existingLineIndex =
        !forceNewLine && item._cartLineId
          ? state.currentOrder.items.findIndex(
              (currentItem) => currentItem._cartLineId === item._cartLineId
            )
          : -1;
      const cleanItem = { ...item };
      delete cleanItem._forceNewLine;
      cleanItem._cartLineId =
        item._cartLineId ||
        `${cleanItem._id}-${Date.now()}-${state.currentOrder.items.length}`;

      if (existingLineIndex >= 0) {
        state.currentOrder.items[existingLineIndex] = {
          ...state.currentOrder.items[existingLineIndex],
          ...cleanItem,
          quantity: 1,
        };
      } else {
        state.currentOrder.items.push({
          ...cleanItem,
          quantity: 1,
        });
      }

      state.currentOrder.totalItems = state.currentOrder.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      state.currentOrder.subtotal = state.currentOrder.items.reduce(
        (sum, item) => sum + calculateItemTotal(item),
        0
      );
      state.currentOrder.lastUpdate = new Date().toISOString();
    },

    removeItemFromPosOrder: (state, { payload }) => {
      const itemIndex = state.currentOrder.items.findIndex(
        (item) =>
          (item._cartLineId || item._id) === payload.itemId ||
          item._id === payload.itemId
      );

      if (itemIndex === -1) {
        return;
      }

      if (state.currentOrder.items[itemIndex].quantity > 1) {
        state.currentOrder.items[itemIndex].quantity -= 1;
      } else {
        state.currentOrder.items.splice(itemIndex, 1);
      }

      state.currentOrder.totalItems = state.currentOrder.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      state.currentOrder.subtotal = state.currentOrder.items.reduce(
        (sum, item) => sum + calculateItemTotal(item),
        0
      );

      if (state.currentOrder.items.length === 0) {
        state.currentOrder = initialState.currentOrder;
      } else {
        state.currentOrder.lastUpdate = new Date().toISOString();
      }
    },

    updatePosItemProperty: (state, { payload }) => {
      const { itemId, keyName, value } = payload;
      const itemIndex = state.currentOrder.items.findIndex(
        (item) =>
          (item._cartLineId || item._id) === itemId || item._id === itemId
      );

      if (itemIndex === -1) {
        return;
      }

      state.currentOrder.items[itemIndex] = {
        ...state.currentOrder.items[itemIndex],
        [keyName]: value,
      };

      state.currentOrder.subtotal = state.currentOrder.items.reduce(
        (sum, item) => sum + calculateItemTotal(item),
        0
      );
      state.currentOrder.lastUpdate = new Date().toISOString();
    },

    clearPosOrder: (state) => {
      state.currentOrder = initialState.currentOrder;
    },
  },
});

export const {
  addItemToPosOrder,
  removeItemFromPosOrder,
  updatePosItemProperty,
  clearPosOrder,
} = posOrderSlice.actions;

export default posOrderSlice.reducer;
