import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor } from "../utils/theme";
import { useNavigation } from "@react-navigation/native";
import BootSplash from "react-native-bootsplash";
import { useSelector } from "react-redux";
import FastImage from "@d11/react-native-fast-image";
import StatusBarManager from "../components/StatusBarManager";

import SplashTop1Svg from "../assets/images/splashTop1.svg";
import SplashTop2Svg from "../assets/images/splashTop2.svg";
import SplashTop3Svg from "../assets/images/splashTop3.svg";

import SplashBottom1Svg from "../assets/images/splashBottom1.svg";

const SplashScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isSignedIn, isOnboarded, isUnderReview } = useSelector(
    (state) => state.authReducer
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigation.replace(
        isSignedIn
          ? "bottomRoot"
          : !isOnboarded // fresh app flow
            ? "authIntro"
            : isUnderReview // food truck profile submitted but skipped last screen then show only last screen
              ? "authUnderReviewNoteScreen"
              : "authFoodTruckPlansScreen"
      );
    }, 1500);

    return () => clearTimeout(timeout);
  }, [navigation]);

  useEffect(() => {
    const hideSplash = async () => {
      BootSplash.hide({ fade: true }); // fade is optional
    };

    hideSplash();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top / 2 }]}>
      <StatusBarManager />

      {/* Top 3 SVGs */}
      <View style={styles.topSvgsContainer}>
        <SplashTop3Svg style={styles.topSvg} />
        <SplashTop2Svg style={styles.topSvg} />
        <SplashTop1Svg style={styles.topSvg} />
      </View>

      {/* Middle Image and Text */}
      <View style={styles.middleContainer}>
        <FastImage
          source={require("../assets/images/AppLogo.png")}
          style={styles.middleImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>Round the Corner</Text>
        <Text style={styles.subtitle}>
          Find & Savor the Best Food Trucks{"\n"}Near You!
        </Text>
      </View>

      {/* Bottom SVG */}
      <View style={styles.bottomContainer}>
        <SplashBottom1Svg />
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
    justifyContent: "space-between",
  },
  topSvgsContainer: {
    flexDirection: "row", // Horizontal layout
    alignItems: "center",
    justifyContent: "center",
    // marginTop: 20,
    // gap: 10,
  },
  topSvg: {
    // marginHorizontal: 5,
  },
  middleContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  middleImage: {
    width: 108.52,
    height: 108.52,
    // marginVertical: 20,
  },
  title: {
    fontSize: 19.73,
    fontWeight: "bold",
    color: AppColor.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 11.28,
    color: AppColor.gray,
    textAlign: "center",
    marginTop: 5,
  },
  bottomContainer: {
    alignItems: "center",
    // marginBottom: 20,
  },
});
