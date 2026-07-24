import { Platform } from "react-native";

export const BrandColor = {
  navyBlue: "#0D1B2A",
  carolinaBlue: "#4DA3E6",
  hunterGreen: "#1B5E3B",
  forestGreen: "#2E7D32",
  softGreen: "#A8D5B2",
  lightGray: "#F4F6F8",
  white: "#FFFFFF",
  accentOrange: "#FF8A00",
  errorRed: "#D32F2F",
};

export const customerTheme = {
  background: {
    primary: BrandColor.white,
    secondary: BrandColor.lightGray,
    soft: "#EAF4FB",
  },
  text: {
    primary: BrandColor.navyBlue,
    secondary: "#5F6B7A",
    inverse: BrandColor.white,
  },
  action: {
    primary: BrandColor.carolinaBlue,
    primaryPressed: "#2F86C9",
    secondary: BrandColor.forestGreen,
    secondaryPressed: BrandColor.hunterGreen,
  },
  navigation: {
    active: BrandColor.carolinaBlue,
    inactive: "#8A9099",
  },
  status: {
    success: BrandColor.forestGreen,
    successSoft: BrandColor.softGreen,
    warning: BrandColor.accentOrange,
    error: BrandColor.errorRed,
  },
};

export const vendorTheme = {
  background: {
    primary: BrandColor.navyBlue,
    secondary: "#14283D",
    card: BrandColor.white,
    cardAlt: BrandColor.lightGray,
  },
  text: {
    primary: BrandColor.navyBlue,
    secondary: "#5F6B7A",
    inverse: BrandColor.white,
    mutedOnDark: "#C9D3DF",
  },
  action: {
    primary: BrandColor.hunterGreen,
    primaryPressed: "#13452B",
    secondary: BrandColor.forestGreen,
    secondaryPressed: BrandColor.hunterGreen,
  },
  navigation: {
    background: BrandColor.navyBlue,
    active: BrandColor.carolinaBlue,
    inactive: "#AAB4C0",
  },
  chart: {
    primary: BrandColor.carolinaBlue,
    positive: BrandColor.forestGreen,
    secondary: BrandColor.softGreen,
  },
  status: {
    success: BrandColor.forestGreen,
    successSoft: BrandColor.softGreen,
    pending: BrandColor.accentOrange,
    pendingSoft: "#FFF1E6",
    error: BrandColor.errorRed,
  },
  border: "#D9E0E7",
};

export const AppColor = {
  primary: vendorTheme.action.primary,
  header: vendorTheme.background.primary,
  background: vendorTheme.background.primary,
  backgroundSecondary: vendorTheme.background.secondary,
  card: vendorTheme.background.card,
  cardAlt: vendorTheme.background.cardAlt,
  text: vendorTheme.text.primary,
  subText: vendorTheme.text.secondary,
  textHighlighter: vendorTheme.text.secondary,
  textPlaceholder: vendorTheme.navigation.inactive,
  border: vendorTheme.border,
  likePlaceholder: vendorTheme.navigation.inactive,
  ratingStar: BrandColor.accentOrange,
  placeholderTextColor: vendorTheme.navigation.inactive,

  white: BrandColor.white,
  black: BrandColor.navyBlue,
  gray: vendorTheme.navigation.inactive,
  red: vendorTheme.status.error,
  yellow: vendorTheme.status.pending,
  purple: "#800080",

  snackbarInfo: vendorTheme.navigation.active,
  snackbarSuccess: vendorTheme.status.success,
  snackbarError: vendorTheme.status.error,
  snackbarWarning: vendorTheme.status.pending,
  snackbarDefault: vendorTheme.background.primary,
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
