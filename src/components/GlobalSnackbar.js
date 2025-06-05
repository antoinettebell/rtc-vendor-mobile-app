import React from "react";
import { Snackbar, Portal } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import { hideSnackbar } from "../redux/slices/snackbarSlice";
import { AppColor } from "../utils/theme";

const GlobalSnackbar = () => {
  const dispatch = useDispatch();
  const { visible, message, type } = useSelector(
    (state) => state.snackbatReducer
  );

  return (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={() => dispatch(hideSnackbar())}
        duration={4000}
        style={{
          backgroundColor:
            type === "success"
              ? AppColor.snackbarSuccess
              : type === "error"
                ? AppColor.snackbarError
                : AppColor.snackbarDefault,
        }}
      >
        {message}
      </Snackbar>
    </Portal>
  );
};

export default GlobalSnackbar;
