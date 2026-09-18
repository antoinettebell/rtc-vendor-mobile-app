import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import FastImage from "@d11/react-native-fast-image";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Mulish700 } from "../utils/theme";

const TapToPayLaunchHero = ({ visible, onClose, onGetStarted }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.assetContainer}>
          <FastImage
            source={require("../assets/images/tapToPayHeroCardToIPhone9x16.jpg")}
            style={styles.asset}
            resizeMode={FastImage.resizeMode.contain}
            accessible
            accessibilityLabel="Tap to Pay on iPhone. Accept physical debit and credit cards as well as Apple Pay and other digital wallets, right on your iPhone."
          />
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.getStartedButton}
            onPress={onGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get started with Tap to Pay on iPhone"
          >
            <Text style={styles.getStartedButtonText}>Get started</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.closeButton, { top: insets.top + 10 }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close Tap to Pay on iPhone announcement"
        >
          <MaterialCommunityIcons
            name="close"
            size={26}
            color={AppColor.black}
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    flex: 1,
    justifyContent: "center",
  },
  assetContainer: {
    aspectRatio: 9 / 16,
    maxWidth: "100%",
    position: "relative",
    width: "100%",
  },
  asset: {
    height: "100%",
    width: "100%",
  },
  getStartedButton: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    height: "5.4%",
    justifyContent: "center",
    left: "10.2%",
    position: "absolute",
    top: "79.4%",
    width: "26.5%",
  },
  getStartedButtonText: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    width: 44,
  },
});

export default TapToPayLaunchHero;
