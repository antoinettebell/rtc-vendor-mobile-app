import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput as NativeInput,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Snackbar,
  ActivityIndicator,
  Portal,
  IconButton,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";

const OtpVerificationScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const inputRefs = useRef([]);

  // Combine digits
  const otp = otpDigits.join("");

  const validateOtp = () => /^\d{6}$/.test(otp);

  const handleChange = (text, index) => {
    if (/^\d?$/.test(text)) {
      const newDigits = [...otpDigits];
      newDigits[index] = text;
      setOtpDigits(newDigits);

      if (text && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    if (!validateOtp()) {
      setSnackbar({
        visible: true,
        message: "Invalid OTP. Must be 6 digits.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSnackbar({
        visible: true,
        message: "OTP Verified",
        type: "success",
      });
    }, 1500);
  };

  const handleResendOtp = () => {
    setResendLoading(true);
    setOtpDigits(["", "", "", "", "", ""]);
    setTimer(60);
    inputRefs.current[0]?.focus();

    setTimeout(() => {
      setResendLoading(false);
      setSnackbar({ visible: true, message: "OTP Resent 📩", type: "info" });
    }, 1000);
  };

  useEffect(() => {
    let timerRef;
    if (timer > 0) {
      timerRef = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timerRef);
  }, [timer]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar backgroundColor={AppColor.primary} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.white}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{"OTP"}</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        enabled={Platform.OS === "ios"}
        behavior="padding"
        style={{
          flex: 1,
          marginBottom: -insets.bottom,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + 20,
          }}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/images/AppLogo.png")}
                style={{ height: 104, width: 104 }}
              />
            </View>

            {/* OTP Form */}
            <Text style={styles.title}>{"Please check your email"}</Text>
            <Text style={styles.subtitle}>
              {"Enter the code from the mail we sent to"}
              <Text style={{ color: AppColor.text, fontFamily: Secondary400 }}>
                {"\njohndoe@gmail.com"}
              </Text>
            </Text>

            <View style={styles.otpRow}>
              {otpDigits.map((digit, index) => (
                <NativeInput
                  key={index}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  keyboardType="numeric"
                  maxLength={1}
                  style={[
                    styles.otpInput,
                    // {
                    //   borderColor:
                    //     !digit && index === otp.indexOf("")
                    //       ? AppColor.primary
                    //       : "#ccc",
                    // },
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleVerifyOtp}
              activeOpacity={0.7}
              style={styles.signInButton}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.buttonLabel}>{"Verify Code"}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              {timer > 0 ? (
                <Text
                  style={styles.timerText}
                >{`Resend OTP in ${timer}s`}</Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResendOtp}
                  activeOpacity={0.7}
                  style={styles.skipButton}
                  disabled={resendLoading}
                >
                  <Text style={[styles.buttonLabel, { color: AppColor.black }]}>
                    {resendLoading ? "Resending..." : "RESEND CODE"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
          duration={4000}
          style={{
            backgroundColor:
              snackbar.type === "success"
                ? "#4CAF50"
                : snackbar.type === "error"
                ? "#F44336"
                : "#2196F3",
          }}
        >
          {snackbar.message}
        </Snackbar>
      </Portal>
    </View>
  );
};

export default OtpVerificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.primary,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    color: AppColor.white,
    fontSize: 20,
    fontFamily: Primary400,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "flex-start",
    marginTop: 30,
    marginBottom: 20,
  },
  title: {
    fontFamily: Primary400,
    fontSize: 24,
    color: AppColor.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: AppColor.textHighlighter,
    marginBottom: 50,
    marginTop: 5,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 56,
    fontSize: 26,
    borderRadius: 4,
    textAlign: "center",
    fontFamily: Secondary400,
    backgroundColor: AppColor.white,
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
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  resendContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  timerText: {
    color: AppColor.text,
    fontFamily: Secondary400,
    fontSize: 16,
  },
  signInButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginVertical: 20,
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
  buttonLabel: {
    fontFamily: Secondary400,
    fontSize: 16,
    color: AppColor.white,
  },
});
