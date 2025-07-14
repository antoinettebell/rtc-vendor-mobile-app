import React, { useState } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Text, IconButton, ActivityIndicator } from "react-native-paper";
import Octicons from "react-native-vector-icons/Octicons";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { onSignin } from "../redux/slices/authSlice";
import StatusBarManager from "../components/StatusBarManager";
import {
  checkFcmToken,
  checkInstallationId,
} from "../helpers/notification.helper";
import { setFcmToken_API } from "../api/appAPI";

export default function AuthUnderReviewNoteScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  const handleContinueBtnPress = async () => {
    setLoading(true);
    try {
      const deviceId = await checkInstallationId();
      const fcmToken = await checkFcmToken();
      if (deviceId && fcmToken) {
        const response1 = await setFcmToken_API({
          token: fcmToken,
          deviceId: deviceId,
        });
        console.log("response => ", response1);
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setLoading(false);
      dispatch(onSignin(true));
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBarManager />

      <View style={styles.subContainer}>
        <Octicons
          name="check-circle-fill"
          size={77.5}
          color={AppColor.primary}
        />

        <Text style={styles.title}>
          Great! You’ve successfully created your profile.
        </Text>

        <View style={{ width: "85%" }}>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Text style={styles.subTitle}>{".  "}</Text>
            <Text style={styles.subTitle}>
              {"The Round The Corner Team is reviewing your account."}
            </Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Text style={styles.subTitle}>{".  "}</Text>
            <Text style={styles.subTitle}>
              {
                "You'll receive a confirmation email once approved, usually within 24-48 hours."
              }
            </Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Text style={styles.subTitle}>{".  "}</Text>
            <Text style={styles.subTitle}>
              {
                "In the meantime, enhance your profile! Add your menu, food photos, schedule, and a unique description of your truck."
              }
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.continueButton}
        activeOpacity={0.7}
        disabled={loading}
        onPress={handleContinueBtnPress}
      >
        {loading ? (
          <ActivityIndicator color={AppColor.primary} />
        ) : (
          <Text style={styles.continueButtonText}>{"Continue"}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  subContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    width: "90%",
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.text,
    marginVertical: 20,
    textAlign: "center",
  },
  subTitle: {
    flexWrap: "wrap",
    fontSize: 14,
    fontFamily: Mulish400,
    textAlign: "left",
    color: AppColor.textHighlighter,
  },

  continueButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginBottom: 20,
    marginHorizontal: 16,
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
  continueButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
});
