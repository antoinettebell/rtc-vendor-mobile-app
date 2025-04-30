import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import PagerView from "react-native-pager-view";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";

import Screen1Svg from "../assets/images/intro1.svg";
import Screen2Svg from "../assets/images/intro2.svg";
import Screen3Svg from "../assets/images/intro3.svg";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    Svg: Screen1Svg,
    title: "Round the Corner ",
    subTitle: "– Your Street Food Buddy!",
    description:
      "Discover the best food trucks around you and order your favorite bites in just a few taps.",
  },
  // {
  //   Svg: Screen2Svg,
  //   title: "Hungry?",
  //   subTitle: " Let’s Find a Truck!",
  //   description:
  //     "We’re scouting the streets to show you the most loved food trucks nearby fast, fresh, and full of flavor.",
  // },
  // {
  //   Svg: Screen3Svg,
  //   title: "Skip the Line, ",
  //   subTitle1: "Savor",
  //   subTitle2: " the Taste!",
  //   description:
  //     "No more waiting in line! Browse, order, and enjoy delicious street food anytime, anywhere.",
  // },
];

const DOT_SIZE = 7.02;
const ACTIVE_DOT_SIZE = 26.54;

const AuthIntroScreen = ({ navigation }) => {
  const pagerRef = useRef(null);
  const activeIndex = useSharedValue(0);

  const onPageSelected = (e) => {
    activeIndex.value = e.nativeEvent.position;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        animated
        backgroundColor={AppColor.white}
        barStyle="dark-content"
      />

      <PagerView
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={onPageSelected}
        ref={pagerRef}
      >
        {slides.map((item, index) => (
          <View style={styles.page} key={index}>
            <item.Svg width={width} height={height * 0.5} />

            <View>
              {index !== 2 ? (
                <Text style={styles.title}>
                  {item.title}
                  <Text style={styles.subTitle}>{item.subTitle}</Text>
                </Text>
              ) : (
                <Text style={[styles.title, styles.titleLastSlide]}>
                  {item.title}
                  <Text style={styles.subTitlePrimary}>{item.subTitle1}</Text>
                  <Text style={styles.subTitle}>{item.subTitle2}</Text>
                </Text>
              )}
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
        ))}
      </PagerView>

      {/* <View style={styles.dotsContainer}>
        {slides.map((_, i) => {
          const animatedDotStyle = useAnimatedStyle(() => {
            return {
              width: withTiming(
                activeIndex.value === i ? ACTIVE_DOT_SIZE : DOT_SIZE,
                {
                  duration: 200,
                }
              ),
              opacity: withTiming(activeIndex.value === i ? 1 : 0.5),
              backgroundColor:
                activeIndex.value === i ? AppColor.primary : AppColor.border,
            };
          });

          return (
            <Animated.View key={i} style={[styles.dot, animatedDotStyle]} />
          );
        })}
      </View> */}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate("signin")}
          activeOpacity={0.7}
          style={styles.signInButton}
        >
          <Text style={[styles.buttonLabel, { color: AppColor.white }]}>
            {"Sign In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("signup")}
          activeOpacity={0.7}
          style={styles.signUpButton}
        >
          <Text style={[styles.buttonLabel, { color: AppColor.primary }]}>
            {"Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.skipButton} />

      {/* <TouchableOpacity
        onPress={() => console.log("Pressed")}
        activeOpacity={0.7}
        style={styles.skipButton}
      >
        <Text style={[styles.buttonLabel, { color: AppColor.black }]}>
          {"SIGN IN LATER"}
        </Text>
      </TouchableOpacity> */}
    </SafeAreaView>
  );
};

export default AuthIntroScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
    alignItems: "center",
  },
  pagerView: {
    flex: 1,
    width,
  },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: Primary400,
    fontSize: 26,
    color: AppColor.primary,
    textAlign: "center",
  },
  titleLastSlide: {
    color: AppColor.black,
  },
  subTitle: {
    color: AppColor.black,
  },
  subTitlePrimary: {
    color: AppColor.primary,
  },
  description: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
    gap: 10,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  buttonRow: {
    width: "88%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  signInButton: {
    flex: 1,
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    backgroundColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  signUpButton: {
    flex: 1,
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColor.primary,
  },
  skipButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    marginTop: 14,
  },
  buttonLabel: {
    fontFamily: Secondary400,
    fontSize: 16,
  },
});
