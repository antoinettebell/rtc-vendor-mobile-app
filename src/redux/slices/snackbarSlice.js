import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  visible: false,
  message: "",
  type: "default", // success, error, default
};

const snackbarSlice = createSlice({
  name: "snackbar",
  initialState,
  reducers: {
    showSnackbar: (state, action) => {
      state.visible = true;
      state.message = action.payload.message;
      state.type = action.payload.type || "default";
    },
    hideSnackbar: (state) => {
      state.visible = false;
    },
  },
});

export const { showSnackbar, hideSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;
