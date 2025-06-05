import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isSignedIn: false,
  isOnboarded: false,
  isUnderReview: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    onSignin: (state, { payload }) => {
      state.isSignedIn = payload;
    },
    onOnBoard: (state, { payload }) => {
      state.isOnboarded = payload;
    },
    onUnderReview: (state, { payload }) => {
      state.isUnderReview = payload;
    },
    onSignOut: () => initialState,
  },
});

export const { onSignin, onOnBoard, onUnderReview, onSignOut } =
  authSlice.actions;
export default authSlice.reducer;
