import React from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import StatusBarManager from "../components/StatusBarManager";
import IntroLandingArtwork from "../components/IntroLandingArtwork";
import { AppColor, BrandColor, Mulish400, Mulish700 } from "../utils/theme";

const { width, height } = Dimensions.get("window");

const featureItems = [
  {
    icon: "storefront",
    title: "Manage Profile",
    subtitle: "With Ease",
    color: AppColor.primary,
  },
  {
    icon: "assignment",
    title: "Track Orders",
    subtitle: "In Real-Time",
    color: BrandColor.forestGreen,
  },
  {
    icon: "local-shipping",
    title: "Book Events",
    subtitle: "Nearby",
    color: AppColor.primary,
  },
  {
    icon: "favorite",
    title: "Grow Local",
    subtitle: "Business",
    color: BrandColor.forestGreen,
  },
];

const AuthIntroScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { allSigninUsers } = useSelector((state) => state.userInfoReducer);

  const handleSigninPress = () => {
    if (allSigninUsers?.length > 0) {
      navigation.navigate("oneTapSignin");
    } else {
      navigation.navigate("signin");
    }
  };

  const handleSignupPress = () => {
    navigation.navigate("authFoodTruckPlansScreen", {
      signupFlow: true,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 18) },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <IntroLandingArtwork width={width} height={height * 0.48} />

        <View style={styles.copyBlock}>
          <Text style={styles.title}>
            <Text style={styles.titlePrimary}>Round the Corner</Text>
            {" –\n"}
            <Text>Your Street Food Buddy!</Text>
          </Text>
          <Text style={styles.description}>
            Showcase your food truck, manage orders, and connect with more
            customers in just a few taps.
          </Text>
        </View>

        <View style={styles.featureRow}>
          {featureItems.map((item) => (
            <View key={item.title} style={styles.featureItem}>
              <View style={styles.featureIconCircle}>
                <MaterialIcons name={item.icon} size={30} color={item.color} />
              </View>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
            </View>
          ))}
        </View>

        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <View style={styles.buttonBlock}>
          <TouchableOpacity
            onPress={handleSigninPress}
            activeOpacity={0.7}
            style={styles.signInButton}
          >
            <Text style={[styles.buttonLabel, styles.signInLabel]}>
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignupPress}
            activeOpacity={0.7}
            style={styles.signUpButton}
          >
            <Text style={[styles.buttonLabel, styles.signUpLabel]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default AuthIntroScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
  },
  content: {
    alignItems: "center",
  },
  copyBlock: {
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  title: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 30,
    lineHeight: 38,
    textAlign: "center",
  },
  titlePrimary: {
    color: BrandColor.carolinaBlue,
  },
  description: {
    color: AppColor.subText,
    fontFamily: Mulish400,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
    paddingHorizontal: 18,
    width: "100%",
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureIconCircle: {
    alignItems: "center",
    backgroundColor: AppColor.cardAlt,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    marginBottom: 9,
    width: 64,
  },
  featureTitle: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 12,
    textAlign: "center",
  },
  featureSubtitle: {
    color: AppColor.subText,
    fontFamily: Mulish400,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    textAlign: "center",
  },
  dotsContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 30,
  },
  dot: {
    backgroundColor: AppColor.border,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  activeDot: {
    backgroundColor: BrandColor.carolinaBlue,
    width: 28,
  },
  buttonBlock: {
    marginTop: 28,
    paddingHorizontal: 28,
    width: "100%",
  },
  signInButton: {
    alignItems: "center",
    backgroundColor: BrandColor.carolinaBlue,
    borderRadius: 6,
    height: 56,
    justifyContent: "center",
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  signUpButton: {
    alignItems: "center",
    borderColor: BrandColor.carolinaBlue,
    borderRadius: 6,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    marginTop: 14,
    width: "100%",
  },
  buttonLabel: {
    fontFamily: Mulish700,
    fontSize: 18,
  },
  signInLabel: {
    color: AppColor.white,
  },
  signUpLabel: {
    color: BrandColor.carolinaBlue,
  },
});
