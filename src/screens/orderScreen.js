import React from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { AppColor } from "../utils/theme";

const OrderScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <StatusBar backgroundColor={AppColor.white} barStyle="dark-content" />
      <Text>OrderScreen</Text>
    </View>
  );
};

export default OrderScreen;

const styles = StyleSheet.create({});
