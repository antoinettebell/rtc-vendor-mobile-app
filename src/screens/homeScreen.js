import React from "react";
import { StyleSheet, Text, View, StatusBar } from "react-native";
import { AppColor } from "../utils/theme";

const HomeScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <StatusBar backgroundColor={AppColor.white} barStyle="dark-content" />
      <Text>HomeScreen</Text>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create();
