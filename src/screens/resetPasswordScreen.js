// import React, { useState } from "react";
// import {
//   View,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   StatusBar,
//   Image,
//   ScrollView,
//   KeyboardAvoidingView,
//   Platform,
// } from "react-native";
// import { TextInput, IconButton, Button } from "react-native-paper";
// import { useNavigation } from "@react-navigation/native";
// import { AppColor, Primary400, Secondary400 } from "../utils/theme";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// const ResetPasswordScreen = () => {
//   const insets = useSafeAreaInsets();

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [passwordVisible, setPasswordVisible] = useState(false);
//   const navigation = useNavigation();

//   const togglePasswordVisibility = () => {
//     setPasswordVisible(!passwordVisible);
//   };

//   return (
//     <View style={styles.container}>
//       <StatusBar backgroundColor={AppColor.primary} barStyle="light-content" />

//       {/* Header */}
//       <View style={[styles.header, { paddingTop: insets.top }]}>
//         <IconButton
//           icon="arrow-left"
//           iconColor={AppColor.white}
//           size={24}
//           onPress={() => navigation.goBack()}
//         />
//         <Text style={styles.headerTitle}>{"Reset Password"}</Text>
//         <View style={{ width: 48 }} />
//       </View>

//       {/* Content */}
//       <KeyboardAvoidingView
//         enabled={Platform.OS === "ios"}
//         behavior="padding"
//         style={{
//           flex: 1,
//           marginBottom: -insets.bottom,
//         }}
//       >
//         <ScrollView
//           contentContainerStyle={{
//             flexGrow: 1,
//             paddingBottom: insets.bottom + 20,
//           }}
//           bounces={false}
//           showsVerticalScrollIndicator={false}
//           keyboardShouldPersistTaps="handled"
//         >
//           <View style={styles.content}>
//             {/* Logo */}
//             <View style={styles.logoContainer}>
//               <Image
//                 source={require("../assets/images/AppLogo.png")}
//                 style={{ height: 104, width: 104 }}
//               />
//             </View>

//             {/* Sign In Form */}
//             <Text style={styles.title}>{"Reset Password"}</Text>
//             <Text style={styles.subtitle}>
//               {"Please insert another password"}
//             </Text>

//             <View style={styles.formContainer}>
//               <Text style={styles.inputLabel}>{"New Password"}</Text>
//               <TextInput
//                 dense
//                 value={email}
//                 onChangeText={setEmail}
//                 style={styles.input}
//                 contentStyle={styles.inputText}
//                 placeholder="must be at least 8 characters"
//                 mode="outlined"
//                 secureTextEntry={!passwordVisible}
//                 outlineColor={AppColor.border}
//                 activeOutlineColor={AppColor.primary}
//                 outlineStyle={{ borderRadius: 8 }}
//                 right={
//                   <TextInput.Icon
//                     icon={passwordVisible ? "eye-off" : "eye"}
//                     onPress={togglePasswordVisibility}
//                     color={AppColor.textHighlighter}
//                   />
//                 }
//                 theme={{ colors: { onSurfaceVariant: "#777" } }}
//               />

//               <Text style={[styles.inputLabel, { marginTop: 16 }]}>
//                 {"Confirm New Password"}
//               </Text>
//               <TextInput
//                 dense
//                 value={password}
//                 onChangeText={setPassword}
//                 style={styles.input}
//                 contentStyle={styles.inputText}
//                 placeholder="repeat password "
//                 mode="outlined"
//                 secureTextEntry={!passwordVisible}
//                 outlineColor={AppColor.border}
//                 activeOutlineColor={AppColor.primary}
//                 outlineStyle={{ borderRadius: 8 }}
//                 right={
//                   <TextInput.Icon
//                     icon={passwordVisible ? "eye-off" : "eye"}
//                     onPress={togglePasswordVisibility}
//                     color={AppColor.textHighlighter}
//                   />
//                 }
//                 theme={{ colors: { onSurfaceVariant: "#777" } }}
//               />

//               <TouchableOpacity
//                 onPress={() => console.log("Pressed")}
//                 activeOpacity={0.7}
//                 style={styles.signInButton}
//               >
//                 <Text style={styles.buttonLabel}>{"Reset Password"}</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: AppColor.white,
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     backgroundColor: AppColor.primary,
//     paddingHorizontal: 8,
//     borderBottomLeftRadius: 25,
//     borderBottomRightRadius: 25,
//   },
//   headerTitle: {
//     color: AppColor.white,
//     fontSize: 20,
//     fontFamily: Primary400,
//   },
//   content: {
//     flex: 1,
//     paddingHorizontal: 24,
//   },
//   logoContainer: {
//     alignItems: "flex-start",
//     marginTop: 30,
//     marginBottom: 20,
//   },
//   title: {
//     fontFamily: Primary400,
//     fontSize: 24,
//     color: AppColor.text,
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontFamily: Secondary400,
//     fontSize: 14,
//     color: AppColor.textHighlighter,
//     marginBottom: 50,
//   },
//   formContainer: {
//     flex: 1,
//   },
//   inputLabel: {
//     fontFamily: Secondary400,
//     fontSize: 15,
//     color: AppColor.text,
//     marginBottom: 8,
//   },
//   input: {
//     backgroundColor: AppColor.white,
//   },
//   inputText: {
//     fontFamily: Secondary400,
//   },
//   forgotPassword: {
//     alignSelf: "flex-end",
//     marginTop: 8,
//     marginBottom: 24,
//   },
//   forgotPasswordText: {
//     fontFamily: Secondary400,
//     fontSize: 14,
//     color: AppColor.textHighlighter,
//   },
//   signInButton: {
//     height: 48,
//     borderRadius: 5,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: AppColor.primary,
//     marginTop: 30,
//     marginBottom: 20,
//     ...Platform.select({
//       ios: {
//         shadowColor: AppColor.black,
//         shadowOffset: {
//           width: 0,
//           height: 2,
//         },
//         shadowOpacity: 0.3,
//         shadowRadius: 4,
//       },
//       android: {
//         elevation: 4,
//       },
//     }),
//   },
//   signUpContainer: {
//     flexDirection: "row",
//     justifyContent: "center",
//     marginBottom: 24,
//   },
//   signUpText: {
//     color: AppColor.textHighlighter,
//     fontSize: 14,
//     fontFamily: Secondary400,
//   },
//   signUpLink: {
//     color: AppColor.text,
//     fontSize: 14,
//     fontFamily: Secondary400,
//   },
//   orText: {
//     textAlign: "center",
//     color: AppColor.textHighlighter,
//     fontSize: 14,
//     fontFamily: Secondary400,
//     marginBottom: 10,
//   },
//   skipButton: {
//     height: 48,
//     borderRadius: 5,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   buttonLabel: {
//     fontFamily: Secondary400,
//     fontSize: 16,
//     color: AppColor.white,
//   },
// });

// export default ResetPasswordScreen;

// --------------------------------------------------------------------------------------------------------------------------

// import React, { useState } from "react";
// import {
//   View,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   StatusBar,
//   Image,
//   ScrollView,
//   KeyboardAvoidingView,
//   Platform,
//   Alert,
// } from "react-native";
// import { TextInput, IconButton } from "react-native-paper";
// import { useNavigation } from "@react-navigation/native";
// import { AppColor, Primary400, Secondary400 } from "../utils/theme";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// const ResetPasswordScreen = () => {
//   const insets = useSafeAreaInsets();
//   const navigation = useNavigation();

//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [passwordVisible, setPasswordVisible] = useState(false);

//   const togglePasswordVisibility = () => {
//     setPasswordVisible(!passwordVisible);
//   };

//   const handleResetPassword = () => {
//     if (!newPassword || !confirmPassword) {
//       Alert.alert("Error", "Please fill in all fields.");
//       return;
//     }

//     if (newPassword.length < 8) {
//       Alert.alert("Error", "Password must be at least 8 characters long.");
//       return;
//     }

//     if (newPassword !== confirmPassword) {
//       Alert.alert("Error", "Passwords do not match.");
//       return;
//     }

//     // Proceed to reset password
//     console.log("Password reset successful!");
//     // You can call your API here or navigate to success screen
//   };

//   return (
//     <View style={styles.container}>
//       <StatusBar backgroundColor={AppColor.primary} barStyle="light-content" />

//       {/* Header */}
//       <View style={[styles.header, { paddingTop: insets.top }]}>
//         <IconButton
//           icon="arrow-left"
//           iconColor={AppColor.white}
//           size={24}
//           onPress={() => navigation.goBack()}
//         />
//         <Text style={styles.headerTitle}>Reset Password</Text>
//         <View style={{ width: 48 }} />
//       </View>

//       {/* Content */}
//       <KeyboardAvoidingView
//         enabled={Platform.OS === "ios"}
//         behavior="padding"
//         style={{ flex: 1, marginBottom: -insets.bottom }}
//       >
//         <ScrollView
//           contentContainerStyle={{
//             flexGrow: 1,
//             paddingBottom: insets.bottom + 20,
//           }}
//           keyboardShouldPersistTaps="handled"
//           showsVerticalScrollIndicator={false}
//           bounces={false}
//         >
//           <View style={styles.content}>
//             {/* Logo */}
//             <View style={styles.logoContainer}>
//               <Image
//                 source={require("../assets/images/AppLogo.png")}
//                 style={{ height: 104, width: 104 }}
//                 resizeMode="contain"
//               />
//             </View>

//             {/* Form */}
//             <Text style={styles.title}>Reset Password</Text>
//             <Text style={styles.subtitle}>Please insert your new password</Text>

//             <View style={styles.formContainer}>
//               {/* New Password Field */}
//               <Text style={styles.inputLabel}>New Password</Text>
//               <TextInput
//                 value={newPassword}
//                 onChangeText={setNewPassword}
//                 placeholder="Must be at least 8 characters"
//                 mode="outlined"
//                 secureTextEntry={!passwordVisible}
//                 dense
//                 style={styles.input}
//                 contentStyle={styles.inputText}
//                 outlineColor={AppColor.border}
//                 activeOutlineColor={AppColor.primary}
//                 outlineStyle={{ borderRadius: 8 }}
//                 right={
//                   <TextInput.Icon
//                     icon={passwordVisible ? "eye-off" : "eye"}
//                     onPress={togglePasswordVisibility}
//                     color={AppColor.textHighlighter}
//                   />
//                 }
//                 theme={{ colors: { onSurfaceVariant: "#777" } }}
//               />

//               {/* Confirm Password Field */}
//               <Text style={[styles.inputLabel, { marginTop: 16 }]}>
//                 Confirm New Password
//               </Text>
//               <TextInput
//                 value={confirmPassword}
//                 onChangeText={setConfirmPassword}
//                 placeholder="Repeat new password"
//                 mode="outlined"
//                 secureTextEntry={!passwordVisible}
//                 dense
//                 style={styles.input}
//                 contentStyle={styles.inputText}
//                 outlineColor={AppColor.border}
//                 activeOutlineColor={AppColor.primary}
//                 outlineStyle={{ borderRadius: 8 }}
//                 right={
//                   <TextInput.Icon
//                     icon={passwordVisible ? "eye-off" : "eye"}
//                     onPress={togglePasswordVisibility}
//                     color={AppColor.textHighlighter}
//                   />
//                 }
//                 theme={{ colors: { onSurfaceVariant: "#777" } }}
//               />

//               {/* Reset Password Button */}
//               <TouchableOpacity
//                 style={styles.resetButton}
//                 activeOpacity={0.7}
//                 onPress={handleResetPassword}
//               >
//                 <Text style={styles.buttonLabel}>Reset Password</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: AppColor.white,
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     backgroundColor: AppColor.primary,
//     paddingHorizontal: 8,
//     borderBottomLeftRadius: 25,
//     borderBottomRightRadius: 25,
//   },
//   headerTitle: {
//     color: AppColor.white,
//     fontSize: 20,
//     fontFamily: Primary400,
//   },
//   content: {
//     flex: 1,
//     paddingHorizontal: 24,
//   },
//   logoContainer: {
//     alignItems: "flex-start",
//     marginTop: 30,
//     marginBottom: 20,
//   },
//   title: {
//     fontFamily: Primary400,
//     fontSize: 24,
//     color: AppColor.text,
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontFamily: Secondary400,
//     fontSize: 14,
//     color: AppColor.textHighlighter,
//     marginBottom: 50,
//   },
//   formContainer: {
//     flex: 1,
//   },
//   inputLabel: {
//     fontFamily: Secondary400,
//     fontSize: 15,
//     color: AppColor.text,
//     marginBottom: 8,
//   },
//   input: {
//     backgroundColor: AppColor.white,
//   },
//   inputText: {
//     fontFamily: Secondary400,
//   },
//   resetButton: {
//     height: 48,
//     borderRadius: 5,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: AppColor.primary,
//     marginTop: 30,
//     marginBottom: 20,
//     ...Platform.select({
//       ios: {
//         shadowColor: AppColor.black,
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.3,
//         shadowRadius: 4,
//       },
//       android: {
//         elevation: 4,
//       },
//     }),
//   },
//   buttonLabel: {
//     fontFamily: Secondary400,
//     fontSize: 16,
//     color: AppColor.white,
//   },
// });

// export default ResetPasswordScreen;

// --------------------------------------------------------------------------------------------------------------------------

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
import { TextInput, IconButton, Snackbar } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Modal from "react-native-modal";
import Octicons from "react-native-vector-icons/Octicons";

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const ResetPasswordScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const [isModalVisible, setModalVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleResetPassword = () => {
    if (!newPassword || !confirmPassword) {
      showSnackbar("Please fill in all fields.");
      return;
    }

    if (!passwordRegex.test(newPassword)) {
      showSnackbar(
        "Password must be 8+ characters with uppercase, lowercase, number & special character."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar("Passwords do not match.");
      return;
    }

    // Password valid
    console.log("Password reset successful!");
    // showSnackbar("Password reset successful!");
    setModalVisible(true); // Success -> show modal
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={AppColor.primary} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.white}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Success Modal */}
      <Modal
        isVisible={isModalVisible}
        backdropOpacity={0.5}
        animationIn="zoomIn"
        animationOut="zoomOut"
      >
        <View style={styles.modalContainer}>
          <Octicons
            name="check-circle-fill"
            size={77.5}
            color={AppColor.primary}
          />

          <Text style={styles.modalTitle}>{"Hello, John"}</Text>
          <Text style={styles.modalSubtitle}>
            {"Your password has been reset successfully!"}
          </Text>

          <TouchableOpacity
            style={styles.backToLoginButton}
            activeOpacity={0.7}
            onPress={() => {
              setModalVisible(false);
              navigation.navigate("signin");
            }}
          >
            <Text style={styles.backToLoginText}>{"Back to Login"}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Content */}
      <KeyboardAvoidingView
        enabled={Platform.OS === "ios"}
        behavior="padding"
        style={{ flex: 1, marginBottom: -insets.bottom }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/images/AppLogo.png")}
                style={{ height: 104, width: 104 }}
                resizeMode="contain"
              />
            </View>

            {/* Form */}
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Please insert your new password</Text>

            <View style={styles.formContainer}>
              {/* New Password */}
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Must be at least 8 characters"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                secureTextEntry={!passwordVisible}
                dense
                style={styles.input}
                contentStyle={styles.inputText}
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

              {/* Confirm Password */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                Confirm New Password
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                secureTextEntry={!passwordVisible}
                dense
                style={styles.input}
                contentStyle={styles.inputText}
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

              {/* Reset Button */}
              <TouchableOpacity
                style={styles.resetButton}
                activeOpacity={0.7}
                onPress={handleResetPassword}
              >
                <Text style={styles.buttonLabel}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "OK",
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
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
  resetButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginTop: 30,
    marginBottom: 20,
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
  buttonLabel: {
    fontFamily: Secondary400,
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
    fontFamily: Primary400,
    fontSize: 22,
    color: AppColor.text,
    marginVertical: 10,
  },
  modalSubtitle: {
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
    fontSize: 16,
  },
});

export default ResetPasswordScreen;
