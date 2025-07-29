import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  allSigninUsers: [],
};

const userInfoSlice = createSlice({
  name: "userInfo",
  initialState: initialState,
  reducers: {
    addOrUpdateUser: (state, { payload }) => {
      const { emailid, userData } = payload;
      const existingUserIndex = state.allSigninUsers.findIndex(
        (user) => user.emailid === emailid
      );

      if (existingUserIndex !== -1) {
        state.allSigninUsers[existingUserIndex] = { ...state.allSigninUsers[existingUserIndex], ...userData };
      } else {
        state.allSigninUsers.push({ emailid, ...userData });
      }
    },
    updateUserKey: (state, { payload }) => {
      const { emailid, keyName, keyValue } = payload;
      const userToUpdate = state.allSigninUsers.find(
        (user) => user.emailid === emailid
      );

      if (userToUpdate) {
        userToUpdate[keyName] = keyValue;
      }
    },
    removeUser: (state, { payload }) => {
      const { emailid } = payload;
      state.allSigninUsers = state.allSigninUsers.filter(
        (user) => user.emailid !== emailid
      );
    },
  },
});

export const { addOrUpdateUser, updateUserKey, removeUser } =
  userInfoSlice.actions;
export default userInfoSlice.reducer;