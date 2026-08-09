import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isSignedIn: false,
  isOnboarded: false,
  isUnderReview: false,
  vendorOnboardingStep: null,
  postSignInRoute: null,
  pendingAuthRoute: null,
  pendingEventVendorApplication: null,
  eventVendorOnboardingSessionActive: false,
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
    setVendorOnboardingStep: (state, { payload }) => {
      state.vendorOnboardingStep = payload;
    },
    setPostSignInRoute: (state, { payload }) => {
      state.postSignInRoute = payload;
    },
    setPendingAuthRoute: (state, { payload }) => {
      state.pendingAuthRoute = payload;
    },
    setPendingEventVendorApplication: (state, { payload }) => {
      state.pendingEventVendorApplication = payload;
    },
    setEventVendorOnboardingSessionActive: (state, { payload }) => {
      state.eventVendorOnboardingSessionActive = payload === true;
    },
    onSignOut: () => initialState,
  },
});

export const {
  onSignin,
  onOnBoard,
  onUnderReview,
  setVendorOnboardingStep,
  setPostSignInRoute,
  setPendingAuthRoute,
  setPendingEventVendorApplication,
  setEventVendorOnboardingSessionActive,
  onSignOut,
} = authSlice.actions;
export default authSlice.reducer;
