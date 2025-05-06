import React, { useState } from "react";
import {
  View,
  StyleSheet,
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
  TextInput,
  HelperText,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";

import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { emailRegex } from "../utils/constants";
import { forgotPassword_API } from "../api/authAPI";

const ForgetPasswordScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const handleVerifyOtp = async () => {
    let isValid = true;

    if (!validateEmail(email)) {
      setEmailError("Enter a valid email!");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (isValid) {
      setLoading(true);
      try {
        const response = await forgotPassword_API({
          email,
          userType: "VENDOR",
        });
        console.log("forgotPassword_API API response ====> ", response);
        if (response.success && response.data) {
          navigation.navigate("otpVerification", {
            verificationFor: "forget-password",
            data: { ...response.data, user: { email } },
            nextScreen: "",
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
        setLoading(false);
      }
    }
  };

  const validateEmail = (email) => {
    return emailRegex?.test(email);
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
        <Text style={styles.headerTitle}>Forget Password</Text>
        <View style={{ width: 48 }} />
      </View>

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
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/images/AppLogo.png")}
                style={styles.logo}
              />
            </View>

            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter the email address associated with your account. You will
              receive an email to define a new password.
            </Text>

            {/* Email Input */}
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              dense
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError(
                  validateEmail(text) ? "" : "Enter a valid email!"
                );
              }}
              style={styles.input}
              contentStyle={styles.inputText}
              mode="outlined"
              error={!!emailError}
              placeholder="Enter your email address"
              placeholderTextColor={AppColor.placeholderTextColor}
              outlineColor={AppColor.border}
              activeOutlineColor={AppColor.primary}
              outlineStyle={{ borderRadius: 8 }}
              autoCapitalize="none"
              keyboardType="email-address"
              theme={{ colors: { onSurfaceVariant: "#777" } }}
            />
            {!!emailError && (
              <HelperText type="error" visible style={styles.helper}>
                {emailError}
              </HelperText>
            )}

            <TouchableOpacity
              onPress={handleVerifyOtp}
              activeOpacity={0.7}
              style={styles.sendButton}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.buttonLabel}>Send Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Snackbar */}
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

export default ForgetPasswordScreen;

// Styles
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
  logo: {
    height: 104,
    width: 104,
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
  inputLabel: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: AppColor.text,
    marginBottom: 6,
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
  sendButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginVertical: 30,
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
});
