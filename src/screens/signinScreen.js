// import React, { useState, useRef } from "react";
// import { View, StyleSheet } from "react-native";
// import {
//   TextInput,
//   Button,
//   Text,
//   HelperText,
//   IconButton,
// } from "react-native-paper";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import { Mulish700 } from "../utils/theme";

// const SignInScreen = ({ navigation }) => {
//   const passwordRef = useRef(null);

//   const [email, setEmail] = useState("");
//   const [emailError, setEmailError] = useState("");

//   const [password, setPassword] = useState("");
//   const [passwordError, setPasswordError] = useState("");
//   const [showPassword, setShowPassword] = useState(false);

//   const validateEmail = (email) => {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return emailRegex.test(email);
//   };

//   const validatePassword = (password) => {
//     const passwordRegex =
//       /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,15}$/;
//     return passwordRegex.test(password);
//   };

//   const handleSignIn = () => {
//     let isValid = true;

//     if (!validateEmail(email)) {
//       setEmailError("Enter a valid email!");
//       isValid = false;
//     } else {
//       setEmailError("");
//     }

//     if (!validatePassword(password)) {
//       setPasswordError(
//         "Password must be 8–15 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char."
//       );
//       isValid = false;
//     } else {
//       setPasswordError("");
//     }

//     if (isValid) {
//       console.log("✨ Logging in with:", email);
//       // Trigger login logic here
//       navigation.navigate("otpVerification");
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text variant="headlineMedium" style={styles.header}>
//         👋 Welcome Back!
//       </Text>
//       <Text variant="bodyMedium" style={styles.subHeader}>
//         Log in to continue exploring.
//       </Text>

//       <TextInput
//         label="Email"
//         value={email}
//         onChangeText={(text) => {
//           setEmail(text);
//           setEmailError(validateEmail(text) ? "" : "Enter a valid email!");
//         }}
//         autoCapitalize="none"
//         keyboardType="email-address"
//         style={styles.input}
//         mode="outlined"
//         error={!!emailError}
//         returnKeyType="next"
//         onSubmitEditing={() => passwordRef.current?.focus()}
//       />
//       <HelperText type="error" visible={!!emailError} style={styles.helper}>
//         {emailError}
//       </HelperText>

//       <TextInput
//         ref={passwordRef}
//         label="Password"
//         value={password}
//         onChangeText={(text) => {
//           setPassword(text);
//           setPasswordError(
//             validatePassword(text)
//               ? ""
//               : "Password must be 8–15 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char."
//           );
//         }}
//         secureTextEntry={!showPassword}
//         style={styles.input}
//         mode="outlined"
//         error={!!passwordError}
//         returnKeyType="done"
//         onSubmitEditing={handleSignIn}
//         right={
//           <TextInput.Icon
//             icon={showPassword ? "eye-off" : "eye"}
//             onPress={() => setShowPassword(!showPassword)}
//           />
//         }
//       />
//       <HelperText type="error" visible={!!passwordError} style={styles.helper}>
//         {passwordError}
//       </HelperText>

//       <Button
//         mode="contained"
//         onPress={handleSignIn}
//         style={styles.button}
//         contentStyle={styles.buttonContent}
//         labelStyle={{ fontWeight: "bold" }}
//       >
//         Let’s Go 🚀
//       </Button>

//       <View style={styles.signUpContainer}>
//         <Text variant="bodyMedium" style={styles.signUpText}>
//           Don’t have an account?
//         </Text>
//         <Button
//           mode="text"
//           onPress={() => {
//             // TODO: navigate to SignUp screen
//             console.log("📝 Navigate to Sign Up");
//             navigation.navigate("signup");
//           }}
//           labelStyle={{ fontWeight: "bold", color: "#007BFF" }}
//           contentStyle={{ marginLeft: 4 }}
//         >
//           Sign Up
//         </Button>
//       </View>
//     </View>
//   );
// };

// export default SignInScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 24,
//     justifyContent: "center",
//     backgroundColor: "#F7F9FC",
//   },
//   header: {
//     textAlign: "center",
//     marginBottom: 8,
//     fontFamily: Mulish700,
//   },
//   subHeader: {
//     textAlign: "center",
//     marginBottom: 24,
//     color: "#666",
//   },
//   input: {
//     backgroundColor: "white",
//     marginBottom: 0,
//   },
//   helper: {
//     marginBottom: 8,
//     marginTop: 0,
//     paddingTop: 0,
//   },
//   button: {
//     marginTop: 16,
//     borderRadius: 8,
//   },
//   buttonContent: {
//     paddingVertical: 8,
//   },
//   signUpContainer: {
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     marginTop: 16,
//   },
//   signUpText: {
//     color: "#555",
//   },
// });

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  TextInput,
  IconButton,
  Button,
  HelperText,
  ActivityIndicator,
  Portal,
  Snackbar,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { emailRegex, passwordRegex } from "../utils/constants";
import { login_API } from "../api/authAPI";
import { useDispatch } from "react-redux";
import { setAuthToken, setUser } from "../redux/slices/userSlice";
import { onSignin } from "../redux/slices/authSlice";
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

const SignInScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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

  const handleSignIn = async () => {
    let isValid = true;

    if (!validateEmail(email)) {
      setEmailError("Enter a valid email!");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!validatePassword(password)) {
      setPasswordError(
        "Password must be 8–15 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char."
      );
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (isValid) {
      console.log("✨ Logging in with:", email);
      // Trigger login logic here
      setLoading(true);
      try {
        const response = await login_API({ email, password });
        console.log("response ====> ", response);
        if (response.success && response.data) {
          dispatch(setUser(response.data.user));
          dispatch(
            setSelectedCuisine(response.data.user.foodTruck.cuisine || [])
          );
          dispatch(
            setSelectedLocations(response.data.user.foodTruck.locations || [])
          );
          dispatch(setAuthToken(response.data.authToken));
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
                  />
                }
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
                onPress={handleSignIn}
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
  },
  formContainer: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: Secondary400,
    fontSize: 15,
    color: AppColor.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColor.white,
  },
  inputText: {
    fontFamily: Secondary400,
    fontSize: 15,
  },
  helper: {
    marginBottom: 8,
    paddingLeft: 0,
    paddingTop: 0,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
  },
  signUpLink: {
    color: AppColor.text,
    fontSize: 14,
    fontFamily: Secondary400,
  },
  orText: {
    textAlign: "center",
    color: AppColor.textHighlighter,
    fontSize: 14,
    fontFamily: Secondary400,
    marginBottom: 10,
  },
  skipButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonLabel: {
    fontFamily: Secondary400,
    fontSize: 16,
    color: AppColor.white,
  },
});

export default SignInScreen;
