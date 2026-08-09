import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import {
  TextInput,
  IconButton,
  HelperText,
  ActivityIndicator,
  Portal,
  Snackbar,
} from "react-native-paper";
import {
  AppColor,
  Mulish700,
  Mulish400,
  Mulish600,
} from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { emailRegex, passwordRegex } from "../utils/constants";
import { employeeLogin_API, login_API } from "../api/authAPI";
import { useDispatch, useSelector } from "react-redux";
import { setAuthToken, setUser } from "../redux/slices/userSlice";
import {
  onOnBoard,
  onSignin,
  onUnderReview,
  setVendorOnboardingStep,
  setPendingEventVendorApplication,
  setEventVendorOnboardingSessionActive,
} from "../redux/slices/authSlice";
import StatusBarManager from "../components/StatusBarManager";
import { getEventVendorSignInTransition } from "../helpers/eventVendorProfile.helper";
import {
  setSelectedCuisine,
  setSelectedLocations,
} from "../redux/slices/foodTruckProfileSlice";
import {
  checkFcmToken,
  checkInstallationId,
} from "../helpers/notification.helper";
import { setFcmToken_API } from "../api/appAPI";
import { addOrUpdateUser } from "../redux/slices/userInfoSlice";
import { restoreSavedEmployeeLogin } from "../helpers/savedEmployeeLogin.helper";
import {
  EVENT_VENDOR_APPLICATION_RETURN_KEY,
  parseEventVendorApplicationReturn,
} from "../helpers/eventVendorApplicationDraft.helper";

const SignInScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 760;
  const dispatch = useDispatch();
  const { vendorOnboardingStep } = useSelector(
    (state) => state.authReducer
  );
  const { allSigninUsers } = useSelector((state) => state.userInfoReducer);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginMode, setLoginMode] = useState("OWNER");
  const [vendorAccessCode, setVendorAccessCode] = useState("");
  const [vendorAccessCodeError, setVendorAccessCodeError] = useState("");
  const [employeeLoginId, setEmployeeLoginId] = useState("");
  const [employeeLoginIdError, setEmployeeLoginIdError] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinVisible, setPinVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const togglePinVisibility = () => {
    setPinVisible(!pinVisible);
  };

  const validateEmail = (email) => {
    return emailRegex?.test(email);
  };

  const validatePassword = (password) => {
    return passwordRegex?.test(password);
  };

  const handleModeChange = (mode) => {
    setLoginMode(mode);
    setEmailError("");
    setPasswordError("");
    setVendorAccessCodeError("");
    setEmployeeLoginIdError("");
    setPinError("");
  };

  const handleSignIn = async (passedEmail, passedPassword) => {
    const currentEmail = passedEmail || email;
    const currentPassword = passedPassword || password;

    let isValid = true;

    if (!validateEmail(currentEmail)) {
      setEmailError("Enter a valid email!");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!validatePassword(currentPassword)) {
      setPasswordError(
        "Password must be 8–15 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char."
      );
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (isValid) {
      console.log("✨ Logging in with:", currentEmail);
      // Trigger login logic here
      setLoading(true);
      try {
        const response = await login_API({
          email: currentEmail,
          password: currentPassword,
        });
        console.log("response ====> ", response);
        if (response?.success && response?.data) {
          dispatch(setUser(response.data.user));
          dispatch(setAuthToken(response.data.authToken));

          dispatch(
            addOrUpdateUser({
              emailid: currentEmail,
              userData: {
                emailid: currentEmail,
                password: currentPassword,
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

          const requestStatus = String(
            response?.data?.user?.requestStatus || "PENDING"
          ).toUpperCase();

          if (response?.data?.user?.vendorSubtype === "EVENT_VENDOR") {
            const transition = getEventVendorSignInTransition(
              response?.data?.user?.eventVendorProfile,
            );
            dispatch(onSignin(transition.isSignedIn));
            dispatch(onOnBoard(transition.isOnboarded));
            dispatch(onUnderReview(transition.isUnderReview));
            dispatch(
              setVendorOnboardingStep(transition.vendorOnboardingStep),
            );
            dispatch(
              setEventVendorOnboardingSessionActive(
                !transition.isSignedIn && !transition.isUnderReview,
              ),
            );
            if (transition.isSignedIn) {
              const returnValue = await AsyncStorage.getItem(
                EVENT_VENDOR_APPLICATION_RETURN_KEY,
              );
              dispatch(
                setPendingEventVendorApplication(
                  parseEventVendorApplicationReturn(returnValue),
                ),
              );
            }
            return;
          }

          if (requestStatus !== "APPROVED") {
            dispatch(onSignin(false));
            dispatch(onOnBoard(true));
            dispatch(onUnderReview(true));
            dispatch(setVendorOnboardingStep("AWAITING_APPROVAL"));
            return;
          }

          dispatch(onUnderReview(false));

          if (response?.data?.user?.foodTruck?.completed) {
            dispatch(
              setSelectedCuisine(response.data.user.foodTruck.cuisine || [])
            );
            dispatch(
              setSelectedLocations(response.data.user.foodTruck.locations || [])
            );
            dispatch(onSignin(true));
            
            // set FCM Token & DeviceId after 1.5 sec
            setTimeout(async () => {
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
              }
            }, 1500);
          } else {
            dispatch(onOnBoard(true));
            dispatch(
              setVendorOnboardingStep(
                ["COMPLIANCE", "PROFILE", "PAYMENT"].includes(
                  vendorOnboardingStep
                )
                  ? vendorOnboardingStep
                  : "COMPLIANCE"
              )
            );
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
    }
  };

  const handleEmployeeSignIn = async (
    passedAccessCode = null,
    passedLoginId = null,
    passedPin = null,
  ) => {
    let isValid = true;
    const currentAccessCode = (passedAccessCode || vendorAccessCode).trim();
    const currentLoginId = (passedLoginId || employeeLoginId).trim().toLowerCase();
    const currentPin = (passedPin || pin).trim();

    if (currentAccessCode.length !== 6) {
      setVendorAccessCodeError("Enter the 6-character vendor access code.");
      isValid = false;
    } else {
      setVendorAccessCodeError("");
    }

    if (!currentLoginId) {
      setEmployeeLoginIdError("Employee Login ID is required.");
      isValid = false;
    } else {
      setEmployeeLoginIdError("");
    }

    if (!currentPin) {
      setPinError("PIN is required.");
      isValid = false;
    } else {
      setPinError("");
    }

    if (!isValid) {
      return;
    }

    setLoading(true);
    try {
      const response = await employeeLogin_API({
        vendorAccessCode: currentAccessCode,
        employeeLoginId: currentLoginId,
        pin: currentPin,
      });

      if (response?.success && response?.data) {
        const employeeName =
          [response.data.employee?.first_name, response.data.employee?.last_name]
            .filter(Boolean)
            .join(" ") || "Employee";
        dispatch(
          setUser({
            ...response.data.employee,
            foodTruck: response.data.foodTruck,
            assignedLocation: response.data.assignedLocation,
          })
        );
        dispatch(setAuthToken(response.data.authToken));
        dispatch(
          addOrUpdateUser({
            emailid: `employee:${currentAccessCode}:${currentLoginId}`,
            userData: {
              emailid: `employee:${currentAccessCode}:${currentLoginId}`,
              password: currentPin,
              username: employeeName,
              imageUrl: response?.data?.foodTruck?.logo || null,
              loginMode: "EMPLOYEE",
              vendorAccessCode: currentAccessCode,
              employeeLoginId: currentLoginId,
              pin: currentPin,
            },
          })
        );
        dispatch(onSignin(true));
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

  const handleForgetPWD = () => {
    navigation.navigate("forgetPassword");
  };

  useEffect(() => {
    if (route?.params?.savedUser) {
      if (route.params.savedUser.loginMode === "EMPLOYEE") {
        const {
          vendorAccessCode: savedAccessCode,
          employeeLoginId: savedLoginId,
          pin: savedPin,
        } = restoreSavedEmployeeLogin({
          savedUser: route.params.savedUser,
          savedUsers: allSigninUsers,
        });
        setLoginMode("EMPLOYEE");
        setVendorAccessCode(savedAccessCode);
        setEmployeeLoginId(savedLoginId);
        setPin(savedPin);
        handleEmployeeSignIn(savedAccessCode, savedLoginId, savedPin);
        return;
      }

      setEmail(route?.params?.savedUser?.emailid);
      setPassword(route?.params?.savedUser?.password);

      handleSignIn(
        route?.params?.savedUser?.emailid,
        route?.params?.savedUser?.password
      );
    }
  }, [route]);

  useEffect(() => {
    if (loginMode !== "EMPLOYEE" || vendorAccessCode || !employeeLoginId.trim()) {
      return;
    }
    const savedCredentials = restoreSavedEmployeeLogin({
      savedUser: { employeeLoginId, pin },
      savedUsers: allSigninUsers,
    });
    if (!savedCredentials.vendorAccessCode) return;
    setVendorAccessCode(savedCredentials.vendorAccessCode);
    if (!pin && savedCredentials.pin) {
      setPin(savedCredentials.pin);
    }
  }, [allSigninUsers, employeeLoginId, loginMode, pin, vendorAccessCode]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBarManager barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            !isWideLayout && styles.scrollContentCompact,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.shell, isWideLayout && styles.shellWide]}>
            <View
              style={[
                styles.brandPanel,
                isWideLayout
                  ? styles.brandPanelWide
                  : styles.brandPanelCompact,
              ]}
            >
              <Image
                source={require("../assets/images/AppLogo.png")}
                resizeMode="contain"
                style={[
                  styles.brandLogo,
                  isWideLayout && styles.brandLogoWide,
                ]}
              />
              <Text
                style={[
                  styles.brandInitials,
                  isWideLayout && styles.brandInitialsWide,
                ]}
              >
                RDC
              </Text>
              <Text
                style={[
                  styles.brandName,
                  isWideLayout && styles.brandNameWide,
                ]}
              >
                — Round Da’ Corner ERP —
              </Text>
              <View style={styles.brandDivider} />
              <Text style={styles.portalLabel}>VENDOR / EMPLOYEE</Text>
              {isWideLayout && (
                <View style={styles.brandTaglineRow}>
                  <IconButton
                    icon="shield-check-outline"
                    iconColor="#3B82F6"
                    size={22}
                    style={styles.taglineIcon}
                  />
                  <Text style={styles.brandTagline}>
                    Secure. Reliable. Built for Growth.
                  </Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.formPanel,
                !isWideLayout && styles.formPanelCompact,
                isWideLayout && styles.formPanelWide,
              ]}
            >
              <View style={styles.formInner}>
                <IconButton
                  accessibilityLabel="Secure sign in"
                  icon="shield-lock-outline"
                  iconColor="#246BFD"
                  size={isWideLayout ? 38 : 28}
                  style={styles.securityIcon}
                />
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>
                  Sign in to your Round Da’ Corner ERP account
                </Text>

                <View
                  accessibilityRole="tablist"
                  style={styles.modeSelector}
                >
                  <TouchableOpacity
                    accessibilityRole="tab"
                    accessibilityState={{
                      selected: loginMode === "OWNER",
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.modeButton,
                      loginMode === "OWNER" && styles.modeButtonActive,
                    ]}
                    onPress={() => handleModeChange("OWNER")}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        loginMode === "OWNER" && styles.modeButtonTextActive,
                      ]}
                    >
                      Vendor / Owner Login
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="tab"
                    accessibilityState={{
                      selected: loginMode === "EMPLOYEE",
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.modeButton,
                      loginMode === "EMPLOYEE" && styles.modeButtonActive,
                    ]}
                    onPress={() => handleModeChange("EMPLOYEE")}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        loginMode === "EMPLOYEE" && styles.modeButtonTextActive,
                      ]}
                    >
                      Employee Login
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formContainer}>
                  {loginMode === "OWNER" ? (
                    <>
                      <Text style={styles.inputLabel}>Email Address</Text>
                      <TextInput
                        dense
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          if (validateEmail(text)) {
                            setEmailError("");
                          }
                        }}
                        style={styles.input}
                        contentStyle={styles.inputText}
                        placeholder="Enter your email"
                        placeholderTextColor={AppColor.placeholderTextColor}
                        mode="outlined"
                        error={!!emailError}
                        outlineColor={AppColor.border}
                        activeOutlineColor="#246BFD"
                        outlineStyle={styles.inputOutline}
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        textContentType="username"
                        theme={{ colors: { onSurfaceVariant: "#777" } }}
                      />
                      {!!emailError && (
                        <HelperText
                          type="error"
                          visible={!!emailError}
                          style={styles.helper}
                        >
                          {emailError}
                        </HelperText>
                      )}

                      <Text style={styles.spacedInputLabel}>Password</Text>
                      <TextInput
                        dense
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (validatePassword(text)) {
                            setPasswordError("");
                          }
                        }}
                        style={styles.input}
                        contentStyle={styles.inputText}
                        placeholder="Enter your password"
                        placeholderTextColor={AppColor.placeholderTextColor}
                        mode="outlined"
                        autoCapitalize="none"
                        autoComplete="password"
                        error={!!passwordError}
                        secureTextEntry={!passwordVisible}
                        outlineColor={AppColor.border}
                        activeOutlineColor="#246BFD"
                        outlineStyle={styles.inputOutline}
                        right={
                          <TextInput.Icon
                            icon={passwordVisible ? "eye-off" : "eye"}
                            onPress={togglePasswordVisibility}
                            color={AppColor.textHighlighter}
                            forceTextInputFocus={false}
                          />
                        }
                        textContentType="password"
                        theme={{ colors: { onSurfaceVariant: "#777" } }}
                      />
                      {!!passwordError && (
                        <HelperText
                          type="error"
                          visible={!!passwordError}
                          style={styles.helper}
                        >
                          {passwordError}
                        </HelperText>
                      )}

                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.forgotPassword}
                        onPress={handleForgetPWD}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.forgotPasswordText}>
                          Forgot your password?
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.inputLabel}>Vendor Access Code</Text>
                      <TextInput
                        dense
                        value={vendorAccessCode}
                        onChangeText={(text) => {
                          setVendorAccessCode(text);
                          if (text.trim().length === 6) {
                            setVendorAccessCodeError("");
                          }
                        }}
                        style={styles.input}
                        contentStyle={styles.inputText}
                        placeholder="Enter the 6-character code"
                        placeholderTextColor={AppColor.placeholderTextColor}
                        mode="outlined"
                        error={!!vendorAccessCodeError}
                        outlineColor={AppColor.border}
                        activeOutlineColor="#246BFD"
                        outlineStyle={styles.inputOutline}
                        autoCapitalize="characters"
                        maxLength={6}
                        theme={{ colors: { onSurfaceVariant: "#777" } }}
                      />
                      {!!vendorAccessCodeError && (
                        <HelperText
                          type="error"
                          visible={!!vendorAccessCodeError}
                          style={styles.helper}
                        >
                          {vendorAccessCodeError}
                        </HelperText>
                      )}

                      <Text style={styles.spacedInputLabel}>
                        Employee Login ID
                      </Text>
                      <TextInput
                        dense
                        value={employeeLoginId}
                        onChangeText={(text) => {
                          setEmployeeLoginId(text);
                          if (text.trim()) {
                            setEmployeeLoginIdError("");
                          }
                        }}
                        style={styles.input}
                        contentStyle={styles.inputText}
                        placeholder="Enter your employee login ID"
                        placeholderTextColor={AppColor.placeholderTextColor}
                        mode="outlined"
                        autoCapitalize="none"
                        error={!!employeeLoginIdError}
                        outlineColor={AppColor.border}
                        activeOutlineColor="#246BFD"
                        outlineStyle={styles.inputOutline}
                        textContentType="username"
                        theme={{ colors: { onSurfaceVariant: "#777" } }}
                      />
                      {!!employeeLoginIdError && (
                        <HelperText
                          type="error"
                          visible={!!employeeLoginIdError}
                          style={styles.helper}
                        >
                          {employeeLoginIdError}
                        </HelperText>
                      )}

                      <Text style={styles.spacedInputLabel}>PIN</Text>
                      <TextInput
                        dense
                        value={pin}
                        onChangeText={(text) => {
                          setPin(text);
                          if (text.trim()) {
                            setPinError("");
                          }
                        }}
                        style={styles.input}
                        contentStyle={styles.inputText}
                        placeholder="Enter your PIN"
                        placeholderTextColor={AppColor.placeholderTextColor}
                        mode="outlined"
                        autoCapitalize="none"
                        error={!!pinError}
                        secureTextEntry={!pinVisible}
                        outlineColor={AppColor.border}
                        activeOutlineColor="#246BFD"
                        outlineStyle={styles.inputOutline}
                        right={
                          <TextInput.Icon
                            icon={pinVisible ? "eye-off" : "eye"}
                            onPress={togglePinVisibility}
                            color={AppColor.textHighlighter}
                            forceTextInputFocus={false}
                          />
                        }
                        keyboardType="number-pad"
                        autoComplete="password"
                        textContentType="password"
                        theme={{ colors: { onSurfaceVariant: "#777" } }}
                      />
                      {!!pinError && (
                        <HelperText
                          type="error"
                          visible={!!pinError}
                          style={styles.helper}
                        >
                          {pinError}
                        </HelperText>
                      )}
                    </>
                  )}

                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() =>
                      loginMode === "OWNER"
                        ? handleSignIn(email, password)
                        : handleEmployeeSignIn()
                    }
                    activeOpacity={0.7}
                    style={[
                      styles.signInButton,
                      loading && styles.disabledButton,
                    ]}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={AppColor.white} />
                    ) : (
                      <>
                        <Text style={styles.buttonLabel}>Sign In</Text>
                        <Text style={styles.buttonArrow}>→</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {loginMode === "OWNER" && (
                    <View style={styles.signUpContainer}>
                      <Text style={styles.signUpText}>
                        {"Don't have an account? "}
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() =>
                          navigation.navigate("authFoodTruckPlansScreen", {
                            signupFlow: true,
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.signUpLink}>Sign Up</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Text style={styles.copyright}>
                  © 2025 Round Da’ Corner ERP. All rights reserved.
                </Text>
              </View>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#061E49",
    flex: 1,
  },
  keyboardView: {
    backgroundColor: "#F3F6FA",
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  scrollContentCompact: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  shell: {
    alignSelf: "center",
    borderRadius: 24,
    maxWidth: 1120,
    overflow: "hidden",
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#071A3D",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  shellWide: {
    flexDirection: "row",
    minHeight: 760,
  },
  brandPanel: {
    alignItems: "center",
    backgroundColor: "#061E49",
    justifyContent: "center",
    paddingHorizontal: 24,
    position: "relative",
  },
  brandPanelCompact: {
    minHeight: 154,
    paddingBottom: 12,
    paddingTop: 16,
  },
  brandPanelWide: {
    flex: 0.43,
    minHeight: 760,
    paddingHorizontal: 40,
  },
  backButton: {
    left: 4,
    position: "absolute",
    top: 4,
  },
  brandLogo: {
    height: 54,
    width: 108,
  },
  brandLogoWide: {
    height: 168,
    width: 248,
  },
  brandInitials: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 32,
    letterSpacing: 4,
    lineHeight: 36,
    marginTop: -2,
  },
  brandInitialsWide: {
    fontSize: 50,
    letterSpacing: 5,
    lineHeight: 58,
  },
  brandName: {
    color: AppColor.white,
    fontFamily: Mulish600,
    fontSize: 13,
    textAlign: "center",
  },
  brandNameWide: {
    fontSize: 16,
  },
  brandDivider: {
    backgroundColor: "#3B82F6",
    height: 1,
    marginBottom: 7,
    marginTop: 7,
    opacity: 0.9,
    width: "76%",
  },
  portalLabel: {
    color: "#67A4FF",
    fontFamily: Mulish600,
    fontSize: 11,
    letterSpacing: 3,
    textAlign: "center",
  },
  brandTaglineRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 24,
  },
  taglineIcon: {
    margin: 0,
  },
  brandTagline: {
    color: AppColor.white,
    fontFamily: Mulish600,
    fontSize: 13,
    marginLeft: 4,
  },
  formPanel: {
    backgroundColor: AppColor.white,
    paddingHorizontal: 22,
    paddingVertical: 30,
  },
  formPanelCompact: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  formPanelWide: {
    flex: 0.57,
    justifyContent: "center",
    paddingHorizontal: 56,
    paddingVertical: 48,
  },
  formInner: {
    alignSelf: "center",
    maxWidth: 560,
    width: "100%",
  },
  securityIcon: {
    alignSelf: "center",
    margin: 0,
    marginBottom: 4,
  },
  title: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 26,
    textAlign: "center",
  },
  subtitle: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 14,
    marginBottom: 12,
    marginTop: 5,
    textAlign: "center",
  },
  modeSelector: {
    backgroundColor: "#F1F3F6",
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 14,
    padding: 4,
  },
  modeButton: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 8,
  },
  modeButtonActive: {
    backgroundColor: "#092A63",
  },
  modeButtonText: {
    color: AppColor.text,
    fontFamily: Mulish600,
    fontSize: 13,
    textAlign: "center",
  },
  modeButtonTextActive: {
    color: AppColor.white,
  },
  formContainer: {
    width: "100%",
  },
  inputLabel: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 14,
    marginBottom: 7,
  },
  spacedInputLabel: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 14,
    marginBottom: 7,
    marginTop: 10,
  },
  input: {
    backgroundColor: AppColor.white,
    minHeight: 48,
  },
  inputOutline: {
    borderRadius: 8,
  },
  inputText: {
    fontFamily: Mulish400,
    fontSize: 15,
  },
  helper: {
    fontFamily: Mulish400,
    marginBottom: 2,
    paddingLeft: 0,
    paddingTop: 0,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 12,
    marginTop: 6,
  },
  forgotPasswordText: {
    color: "#155EEF",
    fontFamily: Mulish400,
    fontSize: 14,
  },
  signInButton: {
    alignItems: "center",
    backgroundColor: "#092A63",
    borderRadius: 8,
    flexDirection: "row",
    height: 48,
    justifyContent: "center",
    marginBottom: 12,
    marginTop: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#071A3D",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonLabel: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  buttonArrow: {
    color: AppColor.white,
    fontFamily: Mulish400,
    fontSize: 22,
    marginLeft: 14,
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  signUpText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 14,
  },
  signUpLink: {
    color: "#155EEF",
    fontFamily: Mulish700,
    fontSize: 14,
  },
  copyright: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 14,
    textAlign: "center",
  },
});

export default SignInScreen;
