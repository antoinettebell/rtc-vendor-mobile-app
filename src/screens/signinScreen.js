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
import { login_API } from "../api/authAPI";
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

const SignInScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const validateEmail = (email) => {
    return emailRegex?.test(email);
  };

  const validatePassword = (password) => {
    return passwordRegex?.test(password);
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

            <View style={styles.formContainer}>
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

              {/* Signin Btn */}
              <TouchableOpacity
                onPress={() => handleSignIn(email, password)}
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
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>{"Don't have account?"} </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("signup")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signUpLink}>{"Sign Up"}</Text>
                </TouchableOpacity>
              </View>
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
    marginBottom: 50,
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
