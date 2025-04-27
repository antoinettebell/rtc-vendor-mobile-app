import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isSigned: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    onSignin: (state, { payload }) => {
      state.isSigned = payload;
    },
    onSignOut: () => initialState,
  },
});

export const { onSignin, onSignOut } = authSlice.actions;
export default authSlice.reducer;
