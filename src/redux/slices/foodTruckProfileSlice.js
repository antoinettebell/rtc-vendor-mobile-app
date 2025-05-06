import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedCuisine: [],
  selectedLocations: [],
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
    clearFoodTruckProfileSlice: () => initialState,
  },
});

export const {
  setSelectedCuisine,
  setSelectedLocations,
  clearFoodTruckProfileSlice,
} = foodTruckProfileSlice.actions;
export default foodTruckProfileSlice.reducer;
