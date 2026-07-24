import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  authToken: null,
  selectedPlan: null,
  selectedSignupAddOns: [],
  profileStatus: null,
  bankStatus: false,
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
    updateFoodTruckKey: (state, { payload }) => {
      const { keyName, keyValue } = payload;
      if (state.user?.foodTruck) {
        state.user.foodTruck[keyName] = keyValue;
      }
    },
    setAuthToken: (state, { payload }) => {
      state.authToken = payload;
    },
    setSelectedPlan: (state, { payload }) => {
      state.selectedPlan = payload;
    },
    setSelectedSignupAddOns: (state, { payload }) => {
      state.selectedSignupAddOns = payload || [];
    },
    setProfileStatus: (state, { payload }) => {
      state.profileStatus = payload;
    },
    setBankStatus: (state, { payload }) => {
      state.bankStatus = payload;
    },
    clearUserSlice: () => initialState,
    updateUser: (state, { payload }) => {
      state.user = { ...state.user, ...payload };
    },
  },
});

export const {
  setUser,
  updateFoodTruck,
  updateFoodTruckKey,
  setAuthToken,
  setSelectedPlan,
  setSelectedSignupAddOns,
  setProfileStatus,
  setBankStatus,
  clearUserSlice,
  updateUser,
} = userSlice.actions;
export default userSlice.reducer;
