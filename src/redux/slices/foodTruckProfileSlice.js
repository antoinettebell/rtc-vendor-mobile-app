import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedCuisine: [],
  selectedLocations: [],
  selectedFoodCategory: [],
  selectedFoodItems: [],
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
    clearFoodTruckProfileSlice: () => initialState,
  },
});

export const {
  setSelectedCuisine,
  setSelectedLocations,
  setSelectedFoodCategory,
  setSelectedFoodItems,
  clearFoodTruckProfileSlice,
} = foodTruckProfileSlice.actions;
export default foodTruckProfileSlice.reducer;
