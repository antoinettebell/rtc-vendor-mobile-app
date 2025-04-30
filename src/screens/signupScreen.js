// import React, { useState } from "react";
// import { View, StyleSheet, ScrollView } from "react-native";
// import { TextInput, Button, Text, HelperText } from "react-native-paper";
// import { TouchableOpacity } from "react-native";
// import Ionicons from "react-native-vector-icons/Ionicons";

// const SignUpScreen = () => {
//   const [firstName, setFirstName] = useState("");
//   const [lastName, setLastName] = useState("");
//   const [email, setEmail] = useState("");
//   const [emailError, setEmailError] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [passwordError, setPasswordError] = useState("");
//   const [confirmError, setConfirmError] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirm, setShowConfirm] = useState(false);
//   const [agreed, setAgreed] = useState(false);

//   const validateEmail = (value) => {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return emailRegex.test(value);
//   };

//   const validatePassword = (value) => {
//     const passwordRegex =
//       /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,15}$/;
//     return passwordRegex.test(value);
//   };

//   const handleSignUp = () => {
//     let isValid = true;

//     if (!validateEmail(email)) {
//       setEmailError("Enter a valid email.");
//       isValid = false;
//     } else {
//       setEmailError("");
//     }

//     if (!validatePassword(password)) {
//       setPasswordError(
//         "Password must be 8–15 chars, 1 upper, 1 lower, 1 digit, 1 special char."
//       );
//       isValid = false;
//     } else {
//       setPasswordError("");
//     }

//     if (password !== confirmPassword) {
//       setConfirmError("Passwords do not match.");
//       isValid = false;
//     } else {
//       setConfirmError("");
//     }

//     if (isValid) {
//       console.log("✅ Signing up:", {
//         firstName,
//         lastName,
//         email,
//         password,
//       });
//       // Handle API/signup logic here
//     }
//   };

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text variant="headlineMedium" style={styles.header}>
//         👋 Create Account
//       </Text>
//       <Text variant="bodyMedium" style={styles.subHeader}>
//         Join us and let’s build something cool!
//       </Text>

//       <View style={styles.row}>
//         <TextInput
//           label="First Name"
//           value={firstName}
//           onChangeText={setFirstName}
//           mode="outlined"
//           style={[styles.input, styles.halfInput, { marginRight: 6 }]}
//         />
//         <TextInput
//           label="Last Name"
//           value={lastName}
//           onChangeText={setLastName}
//           mode="outlined"
//           style={[styles.input, styles.halfInput, { marginLeft: 6 }]}
//         />
//       </View>

//       <TextInput
//         label="Email"
//         value={email}
//         onChangeText={(text) => {
//           setEmail(text);
//           setEmailError(validateEmail(text) ? "" : "Enter a valid email.");
//         }}
//         autoCapitalize="none"
//         keyboardType="email-address"
//         mode="outlined"
//         error={!!emailError}
//         style={styles.input}
//       />
//       {!!emailError && (
//         <HelperText type="error" visible={!!emailError} style={styles.helper}>
//           {emailError}
//         </HelperText>
//       )}

//       <TextInput
//         label="Password"
//         value={password}
//         onChangeText={(text) => {
//           setPassword(text);
//           setPasswordError(
//             validatePassword(text)
//               ? ""
//               : "Password must be 8–15 chars, 1 upper, 1 lower, 1 digit, 1 special char."
//           );
//         }}
//         secureTextEntry={!showPassword}
//         mode="outlined"
//         style={styles.input}
//         error={!!passwordError}
//         right={
//           <TextInput.Icon
//             icon={showPassword ? "eye-off" : "eye"}
//             onPress={() => setShowPassword(!showPassword)}
//           />
//         }
//       />
//       {!!passwordError && (
//         <HelperText
//           type="error"
//           visible={!!passwordError}
//           style={styles.helper}
//         >
//           {passwordError}
//         </HelperText>
//       )}

//       <TextInput
//         label="Confirm Password"
//         value={confirmPassword}
//         onChangeText={(text) => {
//           setConfirmPassword(text);
//           setConfirmError(text === password ? "" : "Passwords do not match.");
//         }}
//         secureTextEntry={!showConfirm}
//         mode="outlined"
//         style={styles.input}
//         error={!!confirmError}
//         right={
//           <TextInput.Icon
//             icon={showConfirm ? "eye-off" : "eye"}
//             onPress={() => setShowConfirm(!showConfirm)}
//           />
//         }
//       />
//       {!!confirmError && (
//         <HelperText type="error" visible={!!confirmError} style={styles.helper}>
//           {confirmError}
//         </HelperText>
//       )}

//       <View style={styles.termsContainer}>
//         <TouchableOpacity
//           onPress={() => setAgreed(!agreed)}
//           style={styles.iconBox}
//         >
//           <Ionicons
//             name={agreed ? "checkbox" : "square-outline"}
//             size={24}
//             color="#007BFF"
//           />
//         </TouchableOpacity>

//         <Text style={styles.termsText} onPress={() => setAgreed(!agreed)}>
//           I agree to the <Text style={styles.linkText}>Terms & Conditions</Text>{" "}
//           and <Text style={styles.linkText}>Privacy Policy</Text>
//         </Text>
//       </View>

//       <Button
//         mode="contained"
//         onPress={handleSignUp}
//         style={styles.button}
//         contentStyle={styles.buttonContent}
//         labelStyle={{ fontWeight: "bold" }}
//         disabled={
//           !firstName ||
//           !lastName ||
//           !email ||
//           !password ||
//           !confirmPassword ||
//           !!emailError ||
//           !!passwordError ||
//           !!confirmError ||
//           !agreed
//         }
//       >
//         Sign Up 🚀
//       </Button>
//     </ScrollView>
//   );
// };

// export default SignUpScreen;

// const styles = StyleSheet.create({
//   container: {
//     padding: 24,
//     backgroundColor: "#F7F9FC",
//     flexGrow: 1,
//     justifyContent: "center",
//   },
//   header: {
//     textAlign: "center",
//     marginBottom: 8,
//     fontWeight: "bold",
//   },
//   subHeader: {
//     textAlign: "center",
//     marginBottom: 24,
//     color: "#666",
//   },
//   input: {
//     backgroundColor: "#fff",
//     marginBottom: 10,
//   },
//   button: {
//     marginTop: 20,
//     borderRadius: 8,
//   },
//   buttonContent: {
//     paddingVertical: 8,
//   },
//   termsContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 16,
//     marginBottom: 4,
//   },
//   termsText: {
//     flex: 1,
//     color: "#555",
//     fontSize: 14,
//   },
//   linkText: {
//     color: "#007BFF",
//     textDecorationLine: "underline",
//   },
//   iconBox: {
//     padding: 4,
//     marginRight: 6,
//   },
//   row: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   halfInput: {
//     flex: 1,
//   },
//   helper: {
//     marginBottom: 4,
//     marginTop: -4, // pulls it closer to input
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
import { TextInput, IconButton, Button } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CountryPicker } from "react-native-country-codes-picker";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";

const SignUpScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [foodTruckName, setFoodTruckName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");
  const [mobileNumebr, setMobileNumber] = useState("");
  const [agreed, setAgreed] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

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
        <Text style={styles.headerTitle}>Sign Up</Text>
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

            {/* Sign Up Form */}
            <Text style={styles.title}>{"Welcome to Food Truck!"}</Text>
            <Text style={styles.subtitle}>{"Create new vendor account!"}</Text>

            <View style={styles.formContainer}>
              {/* Name */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Your Name"}
              </Text>
              <TextInput
                dense
                value={name}
                onChangeText={setName}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Your Name"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="none"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />

              {/* Food Truck Name */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Food Truck Name"}
              </Text>
              <TextInput
                dense
                value={foodTruckName}
                onChangeText={setFoodTruckName}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Food Truck Name"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="none"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />

              {/* Mobile No */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Enter mobile no.*"}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setCountryPickerVisible(true)}
                  style={styles.countryPickerButton}
                >
                  <Text style={styles.countryCodeText}>{countryCode}</Text>
                  <AntDesign
                    name="caretdown"
                    color={AppColor.textHighlighter}
                    size={14}
                  />
                </TouchableOpacity>

                <TextInput
                  dense
                  value={mobileNumebr}
                  onChangeText={setMobileNumber}
                  style={[styles.input, { flex: 1 }]}
                  contentStyle={styles.inputText}
                  placeholder="Enter Mobile No."
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  maxLength={10}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  keyboardType="phone-pad"
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
              </View>

              {/* Email */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Email ID"}
              </Text>
              <TextInput
                dense
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Email ID"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="none"
                keyboardType="email-address"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />

              {/* Password */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Password"}
              </Text>
              <TextInput
                dense
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Password"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
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

              {/* Country picker modal */}
              <CountryPicker
                show={countryPickerVisible}
                style={{
                  // Styles for whole modal [View]
                  modal: {
                    height: "70%",
                    // paddingBottom: insets.bottom,
                  },
                  // Styles for modal backdrop [View]
                  backdrop: {},
                  // Styles for bottom input line [View]
                  line: {},
                  // Styles for list of countries [FlatList]
                  itemsList: {},
                  // Styles for input [TextInput]
                  textInput: {
                    // height: 80,
                    // borderRadius: 0,
                  },
                  // Styles for country button [TouchableOpacity]
                  countryButtonStyles: {
                    // height: 80,
                  },
                  // Styles for search message [Text]
                  searchMessageText: {},
                  // Styles for search message container [View]
                  countryMessageContainer: {},
                  // Flag styles [Text]
                  flag: {},
                  // Dial code styles [Text]
                  dialCode: {},
                  // Country name styles [Text]
                  countryName: {},
                }}
                pickerButtonOnPress={(item) => {
                  setCountryCode(item.dial_code);
                  setCountryPickerVisible(false);
                }}
                onBackdropPress={() => setCountryPickerVisible(false)}
              />

              {/* T&C */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  onPress={() => setAgreed(!agreed)}
                  style={styles.iconBox}
                >
                  <Ionicons
                    name={agreed ? "checkbox" : "square-outline"}
                    size={22}
                    color={AppColor.primary}
                  />
                </TouchableOpacity>

                <Text
                  style={styles.termsText}
                  onPress={() => setAgreed(!agreed)}
                >
                  {"I agree to the"}
                  <Text style={styles.linkText}>{" Terms of Service"}</Text>
                  {" and "}
                  <Text style={styles.linkText}>{"Privacy Policy."}</Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate("otpVerification")}
                activeOpacity={0.7}
                style={styles.signInButton}
              >
                <Text style={styles.buttonLabel}>{"Signup"}</Text>
              </TouchableOpacity>

              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>
                  {"Already have an account? "}{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("signin")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signUpLink}>{"Sign In"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
    marginBottom: 10,
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
  countryPickerButton: {
    height: "100%",
    width: "25%",
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    gap: 5,
  },
  countryCodeText: {
    color: AppColor.text,
    fontSize: 15,
    fontFamily: Secondary400,
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
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
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
  buttonLabel: {
    fontFamily: Secondary400,
    fontSize: 16,
    color: AppColor.white,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 4,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: AppColor.text,
    fontFamily: Secondary400,
  },
  linkText: {
    color: AppColor.primary,
  },
  iconBox: {
    padding: 4,
    marginRight: 6,
  },
});

export default SignUpScreen;
