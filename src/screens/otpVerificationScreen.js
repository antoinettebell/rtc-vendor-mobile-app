import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput as NativeInput,
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
import Modal from "react-native-modal";
import Octicons from "react-native-vector-icons/Octicons";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { resendOTP_API, verifyOTP_API } from "../api/authAPI";
import { useDispatch, useSelector } from "react-redux";
import {
  onOnBoard,
  onSignOut,
  onUnderReview,
  setVendorOnboardingStep,
  setEventVendorOnboardingSessionActive,
} from "../redux/slices/authSlice";
import {
  clearUserSlice,
  setAuthToken,
  setUser,
} from "../redux/slices/userSlice";
import StatusBarManager from "../components/StatusBarManager";
import { clearFoodTruckProfileSlice } from "../redux/slices/foodTruckProfileSlice";
import { clearPushNotificationRedux } from "../redux/slices/pushNotificationSlice";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { addOrUpdateUser } from "../redux/slices/userInfoSlice";
import {
  performAuthNavigation,
  getOtpCompletionTransition,
  SIGNIN_ROUTE,
  isMarketplaceVendorSignup,
} from "../helpers/signupNavigation.helper";

const RESEND_CODE_TIME = 120;

const OtpVerificationScreen = ({ route }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { selectedPlan } = useSelector((state) => state.userReducer);
  const timerRef = useRef(null);

  const [resendTimer, setResendTimer] = useState(RESEND_CODE_TIME);
  const [params, setParams] = useState(route.params);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "info",
  });
  const [isModalVisible, setModalVisible] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState(null);

  const inputRefs = useRef([]);

  // Combine digits
  const otp = otpDigits.join("");
  const handleBack = () =>
    performAuthNavigation({
      navigation,
      destination: SIGNIN_ROUTE,
      preferHistory: true,
      switchAuthRoot: () => {},
    });

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

  const handleVerifyOtp = async () => {
    if (!validateOtp()) {
      setSnackbar({
        visible: true,
        message: "Invalid Code. Must be 6 digits.",
        type: "error",
      });
      return;
    }

    const payload = {
      otpVerificationToken: params?.data?.otpVerificationToken,
      otp: otp,
    };
    console.log("payload => ", payload);
    setLoading(true);
    try {
      const response = await verifyOTP_API(payload);
      if (response?.success && response?.data) {
        if (params?.verificationFor === "sign-up") {
          setModalVisible(true); // Success -> show modal

          dispatch(setUser(response.data.user));
          dispatch(setAuthToken(response.data.authToken));
          setVerifiedUser(response.data.user);

          dispatch(
            addOrUpdateUser({
              emailid: response.data.user.email,
              userData: {
                emailid: response.data.user.email,
                password: params?.data?.localPassword,
                username:
                  response?.data?.user?.eventVendorBusinessName ||
                  response?.data?.user?.foodTruck?.name ||
                  "",
                imageUrl:
                  response?.data?.user?.eventVendorProfile?.logo_url ||
                  response?.data?.user?.foodTruck?.logo ||
                  null,
              },
            })
          );
        } else if (params?.verificationFor === "forget-password") {
          console.log("response.data => ", response.data);
          navigation.navigate("resetPassword", {
            data: { ...response.data },
          });
        } else if (params?.verificationFor === "delete-account") {
          console.log("response.data => ", response.data);
          dispatch(
            showSnackbar({ message: response.message, type: "success" })
          );
          dispatch(clearUserSlice());
          dispatch(clearFoodTruckProfileSlice());
          dispatch(onSignOut());
          dispatch(clearPushNotificationRedux());
        }
      }
    } catch (error) {
      console.log("Error => ", error);
      setSnackbar({
        visible: true,
        message: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const payload = {
      otpVerificationToken: params?.data?.otpVerificationToken,
      email: params?.data?.user?.email,
    };
    setResendLoading(true);
    try {
      const resendResponse = await resendOTP_API(payload);
      if (resendResponse.success && resendResponse.data) {
        setOtpDigits(["", "", "", "", "", ""]);
        setResendTimer(RESEND_CODE_TIME);
        inputRefs.current[0]?.focus();

        setParams((current) => ({
          ...current,
          data: {
            ...current?.data,
            otpVerificationToken: resendResponse?.data?.otpVerificationToken,
          },
        }));

        setSnackbar({
          visible: true,
          message: resendResponse.message,
          type: "info",
        });
      }
    } catch (error) {
      console.log("Error => ", error);
      setSnackbar({
        visible: true,
        message: error.message,
        type: "error",
      });
    } finally {
      setResendLoading(false);
    }
  };

  // Countdown logic for resend button with cleanup
  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(
        () => setResendTimer(resendTimer - 1),
        1000
      );
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resendTimer]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBarManager barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.white}
          size={24}
          onPress={handleBack}
        />
        <Text style={styles.headerTitle}>{"Verification"}</Text>
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
              <Text style={{ color: AppColor.text, fontFamily: Mulish400 }}>
                {`\n${params?.data?.user?.email}`}
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
              {resendTimer > 0 ? (
                <Text
                  style={styles.timerText}
                >{`Resend Code in ${resendTimer}s`}</Text>
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

      {/* Success Modal */}
      <Modal
        isVisible={isModalVisible}
        backdropOpacity={0.5}
        useNativeDriverForBackdrop={true}
        useNativeDriver={true}
        hideModalContentWhileAnimating={true}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          <Octicons
            name="check-circle-fill"
            size={77.5}
            color={AppColor.primary}
          />

          <Text
            style={styles.modalTitle}
          >{`Hello, ${params?.data?.user?.firstName}`}</Text>
          <Text style={styles.modalSubtitle}>
            {"Your account has been created successfully!"}
          </Text>

          <TouchableOpacity
            style={styles.backToLoginButton}
            activeOpacity={0.7}
            onPress={() => {
              setModalVisible(false);
              const transition = getOtpCompletionTransition({
                selectedPlan,
                user: verifiedUser || params?.data?.user,
              });
              dispatch(onOnBoard(transition.isOnboarded));
              dispatch(onUnderReview(transition.isUnderReview));
              dispatch(
                setVendorOnboardingStep(transition.vendorOnboardingStep),
              );
              dispatch(
                setEventVendorOnboardingSessionActive(
                  isMarketplaceVendorSignup({
                    selectedPlan,
                    user: verifiedUser || params?.data?.user,
                  }) && !transition.isUnderReview,
                ),
              );
            }}
          >
            <Text style={styles.backToLoginText}>{"Next"}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Snacbar */}
      <Portal>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
          duration={4000}
          style={{
            backgroundColor:
              snackbar.type === "success"
                ? AppColor.snackbarSuccess
                : snackbar.type === "error"
                  ? AppColor.snackbarError
                  : AppColor.snackbarDefault,
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
    backgroundColor: AppColor.header,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    color: AppColor.white,
    fontSize: 20,
    fontFamily: Mulish700,
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
    fontFamily: Mulish700,
    fontSize: 24,
    color: AppColor.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Mulish400,
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
    fontSize: 22,
    borderRadius: 4,
    textAlign: "center",
    fontFamily: Mulish400,
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
    fontFamily: Mulish400,
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
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },

  //   Modal
  modalContainer: {
    backgroundColor: AppColor.white,
    marginHorizontal: "10%",
    paddingVertical: 36,
    paddingHorizontal: 33,
    borderRadius: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: Mulish700,
    fontSize: 22,
    color: AppColor.text,
    marginVertical: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontFamily: Mulish400,
    fontSize: 16,
    color: AppColor.textHighlighter,
    textAlign: "center",
    marginBottom: 20,
  },
  backToLoginButton: {
    width: "100%",
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backToLoginText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 16,
  },
});
