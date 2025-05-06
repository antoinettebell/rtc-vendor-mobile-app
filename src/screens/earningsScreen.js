import React from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { AppColor } from "../utils/theme";

const EarningsScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <StatusBar backgroundColor={AppColor.white} barStyle="dark-content" />
      <Text>EarningsScreen</Text>
    </View>
  );
};

export default EarningsScreen;

const styles = StyleSheet.create({});
