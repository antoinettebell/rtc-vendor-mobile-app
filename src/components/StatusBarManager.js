import React, { useCallback } from "react";
import { Platform, StatusBar } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const StatusBarManager = ({
  backgroundColor = "transparent",
  barStyle = "dark-content",
  translucent = true,
}) => {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(barStyle);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor(backgroundColor);
        StatusBar.setTranslucent(translucent);
      }
    }, [backgroundColor, barStyle, translucent])
  );

  return null; // No JSX needed, this is imperative
};

export default StatusBarManager;
