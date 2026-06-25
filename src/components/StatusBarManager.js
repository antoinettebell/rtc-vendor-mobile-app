import React, { useCallback } from "react";
import { Platform, StatusBar } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const StatusBarManager = ({
  backgroundColor = null,
  barStyle = "dark-content",
  translucent = false,
}) => {
  const resolvedBackgroundColor =
    backgroundColor || (barStyle === "light-content" ? "#FC7B03" : "#FFFFFF");

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
