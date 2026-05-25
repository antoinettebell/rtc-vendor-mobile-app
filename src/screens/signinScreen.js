import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  TextInput,
  IconButton,
  HelperText,
  ActivityIndicator,
  Portal,
  Snackbar,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import {
  AppColor,
  Mulish700,
  Mulish400,
  Mulish500,
  Mulish600,
  Mulish900,
} from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { emailRegex, passwordRegex } from "../utils/constants";
import { employeeLogin_API, login_API } from "../api/authAPI";
import { useDispatch } from "react-redux";
import { setAuthToken, setUser } from "../redux/slices/userSlice";
import { onOnBoard, onSignin } from "../redux/slices/authSlice";
import StatusBarManager from "../components/StatusBarManager";
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
import runtimeConfig from "../config/runtimeConfig";

const SignInScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

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
                username: response?.data?.user?.foodTruck?.name || "",
                imageUrl: response?.data?.user?.foodTruck.logo || null,
              },
            })
          );

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

  const handleEmployeeSignIn = async () => {
    let isValid = true;
    const currentAccessCode = vendorAccessCode.trim();
    const currentLoginId = employeeLoginId.trim().toLowerCase();
    const currentPin = pin.trim();

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
        dispatch(
          setUser({
            ...response.data.employee,
            foodTruck: response.data.foodTruck,
            assignedLocation: response.data.assignedLocation,
          })
        );
        dispatch(setAuthToken(response.data.authToken));
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
      setEmail(route?.params?.savedUser?.emailid);
      setPassword(route?.params?.savedUser?.password);

      handleSignIn(
        route?.params?.savedUser?.emailid,
        route?.params?.savedUser?.password
      );
    }
  }, [route]);

  return (
    <View style={styles.container}>
      <StatusBarManager barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.white}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{"Sign In"}</Text>
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

            {/* Sign In Form */}
            <Text style={styles.title}>{"Sign In"}</Text>
            <Text style={styles.subtitle}>{"Sign in your account"}</Text>
            <View style={styles.debugConfigContainer}>
              <Text style={styles.debugConfigText}>
                {`API_URL: ${runtimeConfig.apiUrl}`}
              </Text>
              <Text style={styles.debugConfigText}>
                {`API_PREFIX: ${runtimeConfig.apiPrefix}`}
              </Text>
              <Text style={styles.debugConfigText}>
                {`Environment: ${runtimeConfig.environment}`}
              </Text>
              <Text style={styles.debugConfigText}>
                {`API source: ${runtimeConfig.apiUrlSource}`}
              </Text>
            </View>

            <View style={styles.modeSelector}>
              <TouchableOpacity
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
              {/* Email Container */}
              <Text style={styles.inputLabel}>{"Email"}</Text>
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
                placeholder=""
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!emailError}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="none"
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

              {/* Password Container */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Password"}
              </Text>
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
                placeholder=""
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                autoCapitalize="none"
                error={!!passwordError}
                secureTextEntry={!passwordVisible}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
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

              {/* Forget PWD Btn */}
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgetPWD}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>
                  {"Forgot Password?"}
                </Text>
              </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>{"Vendor Access Code"}</Text>
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
                    mode="outlined"
                    error={!!vendorAccessCodeError}
                    outlineColor={AppColor.border}
                    activeOutlineColor={AppColor.primary}
                    outlineStyle={{ borderRadius: 8 }}
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

                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                    {"Employee Login ID"}
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
                    mode="outlined"
                    autoCapitalize="none"
                    error={!!employeeLoginIdError}
                    outlineColor={AppColor.border}
                    activeOutlineColor={AppColor.primary}
                    outlineStyle={{ borderRadius: 8 }}
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

                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                    {"PIN"}
                  </Text>
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
                    mode="outlined"
                    autoCapitalize="none"
                    error={!!pinError}
                    secureTextEntry={!pinVisible}
                    outlineColor={AppColor.border}
                    activeOutlineColor={AppColor.primary}
                    outlineStyle={{ borderRadius: 8 }}
                    right={
                      <TextInput.Icon
                        icon={pinVisible ? "eye-off" : "eye"}
                        onPress={togglePinVisibility}
                        color={AppColor.textHighlighter}
                        forceTextInputFocus={false}
                      />
                    }
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
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

              {/* Signin Btn */}
              <TouchableOpacity
                onPress={() =>
                  loginMode === "OWNER"
                    ? handleSignIn(email, password)
                    : handleEmployeeSignIn()
                }
                activeOpacity={0.7}
                style={styles.signInButton}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={AppColor.white} />
                ) : (
                  <Text style={styles.buttonLabel}>{"Sign In"}</Text>
                )}
              </TouchableOpacity>

              {/* SignUp Btn */}
              {loginMode === "OWNER" && (
                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>{"Don't have account?"} </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("signup")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.signUpLink}>{"Sign Up"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

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
    marginBottom: 14,
  },
  debugConfigContainer: {
    backgroundColor: "#FFF7E6",
    borderColor: "#D9822B",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 28,
  },
  debugConfigText: {
    color: "#7A3E00",
    fontFamily: Mulish600,
    fontSize: 12,
    marginBottom: 2,
  },
  modeSelector: {
    backgroundColor: AppColor.lightGray || "#F5F5F5",
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 24,
    padding: 4,
  },
  modeButton: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 8,
  },
  modeButtonActive: {
    backgroundColor: AppColor.primary,
  },
  modeButtonText: {
    color: AppColor.textHighlighter,
    fontFamily: Mulish600,
    fontSize: 13,
    textAlign: "center",
  },
  modeButtonTextActive: {
    color: AppColor.white,
  },
  formContainer: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: Mulish400,
    fontSize: 15,
    color: AppColor.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColor.white,
  },
  inputText: {
    fontFamily: Mulish400,
    fontSize: 15,
  },
  helper: {
    marginBottom: 8,
    paddingLeft: 0,
    paddingTop: 0,
    fontFamily: Mulish400,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.textHighlighter,
  },
  signInButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginBottom: 20,
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
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  signUpText: {
    color: AppColor.textHighlighter,
    fontSize: 14,
    fontFamily: Mulish400,
  },
  signUpLink: {
    color: AppColor.text,
    fontSize: 14,
    fontFamily: Mulish700,
  },
  buttonLabel: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
});

export default SignInScreen;
