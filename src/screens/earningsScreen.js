import React from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { vendorProfileStatus } from "../utils/constants";

const EarningsScreen = () => {
  const insets = useSafeAreaInsets();
  const { profileStatus } = useSelector((state) => state.userReducer);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 10,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderColor: AppColor.border,
          backgroundColor: AppColor.white,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 19.78,
            fontFamily: Primary400,
            color: AppColor.black,
          }}
        >
          {"Earnings"}
        </Text>
      </View>

      {profileStatus === vendorProfileStatus.approved ? (
        <></>
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: Secondary400,
              color: AppColor.black,
              textAlign: "center",
            }}
          >
            {
              "This feature will become available once your\nprofile is approved."
            }
          </Text>
        </View>
      )}
    </View>
  );
};

export default EarningsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
});
