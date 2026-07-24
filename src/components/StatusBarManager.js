import React, { useCallback } from "react";
import { Platform, StatusBar } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { vendorTheme } from "../utils/theme";

const StatusBarManager = ({
  backgroundColor = null,
  barStyle = "dark-content",
  translucent = false,
}) => {
  const resolvedBackgroundColor =
    backgroundColor ||
    (barStyle === "light-content"
      ? vendorTheme.background.primary
      : vendorTheme.background.card);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(barStyle);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor(resolvedBackgroundColor);
        StatusBar.setTranslucent(translucent);
      }
    }, [barStyle, resolvedBackgroundColor, translucent])
  );

  return null; // No JSX needed, this is imperative
};

export default StatusBarManager;
