import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  authToken: null,
  selectedPlan: null,
};

const userSlice = createSlice({
  name: "user",
  initialState: initialState,
  reducers: {
    setUser: (state, { payload }) => {
      state.user = payload;
    },
    updateFoodTruck: (state, { payload }) => {
      if (state.user) {
        state.user = { ...state.user, foodTruck: payload };
      }
    },
    setAuthToken: (state, { payload }) => {
      state.authToken = payload;
    },
    setSelectedPlan: (state, { payload }) => {
      state.selectedPlan = payload;
    },
    clearUserSlice: () => initialState,
  },
});

export const {
  setUser,
  updateFoodTruck,
  setAuthToken,
  setSelectedPlan,
  clearUserSlice,
} = userSlice.actions;
export default userSlice.reducer;
