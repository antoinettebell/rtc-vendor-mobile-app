import React from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { AppColor } from "../utils/theme";

const MenuScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <StatusBar backgroundColor={AppColor.white} barStyle="dark-content" />
      <Text>MenuScreen</Text>
    </View>
  );
};

export default MenuScreen;

const styles = StyleSheet.create({});
