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
  otpSignupCompletionPending: false,
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
    setOtpSignupCompletionPending: (state, { payload }) => {
      state.otpSignupCompletionPending = payload === true;
    },
    completeOtpSignupTransition: (state, { payload }) => {
      state.isOnboarded = payload.isOnboarded === true;
      state.isUnderReview = payload.isUnderReview === true;
      state.vendorOnboardingStep = payload.vendorOnboardingStep || null;
      state.pendingAuthRoute = payload.pendingAuthRoute || null;
      state.eventVendorOnboardingSessionActive =
        payload.eventVendorOnboardingSessionActive === true;
      state.otpSignupCompletionPending = false;
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
  setOtpSignupCompletionPending,
  completeOtpSignupTransition,
  onSignOut,
} = authSlice.actions;
export default authSlice.reducer;
