import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedCuisine: [],
  selectedLocations: [],
  selectedFoodCategory: [],
  selectedFoodItems: [],
  selectedBusinessHrs: [],
  selectedPreOrderAvailability: [],
};

const foodTruckProfileSlice = createSlice({
  name: "foodTruckProfile",
  initialState: initialState,
  reducers: {
    setSelectedCuisine: (state, { payload }) => {
      state.selectedCuisine = payload;
    },
    setSelectedLocations: (state, { payload }) => {
      state.selectedLocations = payload;
    },
    setSelectedFoodCategory: (state, { payload }) => {
      state.selectedFoodCategory = payload;
    },
    setSelectedFoodItems: (state, { payload }) => {
      state.selectedFoodItems = payload;
    },
    setSelectedBusinessHours: (state, { payload }) => {
      state.selectedBusinessHrs = payload;
    },
    setPreOrderAvailability: (state, { payload }) => {
      state.selectedPreOrderAvailability = payload;
    },
    clearFoodTruckProfileSlice: () => initialState,
  },
});

export const {
  setSelectedCuisine,
  setSelectedLocations,
  setSelectedFoodCategory,
  setSelectedFoodItems,
  clearFoodTruckProfileSlice,
  setSelectedBusinessHours,
  setPreOrderAvailability,
} = foodTruckProfileSlice.actions;
export default foodTruckProfileSlice.reducer;
