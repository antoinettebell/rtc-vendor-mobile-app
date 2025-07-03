import { Platform } from "react-native";

// Colors
export const AppColor = {
  primary: "#FC7B03",
  text: "#111520",
  subText: "#9A9FAC",
  textHighlighter: "#606268",
  textPlaceholder: "#8A8A8A",
  border: "#D9D9D9",
  likePlaceholder: "#C7C7CC",
  ratingStar: "#FFE101",
  placeholderTextColor: "#D1D1D6",

  white: "#FFFFFF",
  black: "#000000",
  gray: "#8E8E93",
  red: "#FF0000",
  yellow: "#FFCC00",
  purple: "#800080",

  snackbarInfo: "#2196F3",
  snackbarSuccess: "#4CAF50",
  snackbarError: "#F44336",
  snackbarWarning: "#FF9800",
  snackbarDefault: "#323232",
};

// Fonts
export const Inter100 =
  Platform.OS === "ios" ? "Inter-ThinBETA" : "Inter-Thin-BETA";
export const Inter200 =
  Platform.OS === "ios" ? "Inter-ExtraLightBETA" : "Inter-ExtraLight-BETA";
export const Inter300 =
  Platform.OS === "ios" ? "Inter-LightBETA" : "Inter-Light-BETA";
export const Inter400 = "Inter-Regular";
export const Inter500 = "Inter-Medium";
export const Inter600 = "Inter-SemiBold";
export const Inter700 = "Inter-Bold";
export const Inter800 = "Inter-ExtraBold";
export const Inter900 = "Inter-Black";

export const Primary400 =
  Platform.OS === "ios" ? "P22 ArtsAndCrafts" : "P22 Arts And Crafts Regular";

export const Secondary400 =
  Platform.OS === "ios" ? "IM Fell English" : "IMFellEnglish-Regular";

export const Mulish200 = "Mulish-ExtraLight";
export const Mulish300 = "Mulish-Light";
export const Mulish400 = "Mulish-Regular";
export const Mulish500 = "Mulish-Medium";
export const Mulish600 = "Mulish-SemiBold";
export const Mulish700 = "Mulish-Bold";
export const Mulish800 = "Mulish-ExtraBold";
export const Mulish900 = "Mulish-Black";
