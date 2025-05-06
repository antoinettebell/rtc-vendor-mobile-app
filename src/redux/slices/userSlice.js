import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  authToken: null,
};

const userSlice = createSlice({
  name: "user",
  initialState: initialState,
  reducers: {
    setUser: (state, { payload }) => {
      state.user = payload;
    },
    setAuthToken: (state, { payload }) => {
      state.authToken = payload;
    },
    clearUserSlice: () => initialState,
  },
});

export const { setUser, setAuthToken, clearUserSlice } = userSlice.actions;
export default userSlice.reducer;
