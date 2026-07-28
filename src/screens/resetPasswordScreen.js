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
  HelperText,
  Portal,
  Snackbar,
  ActivityIndicator,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Modal from "react-native-modal";
import Octicons from "react-native-vector-icons/Octicons";
import { passwordRegex } from "../utils/constants";
import { changePassword_API } from "../api/authAPI";
import StatusBarManager from "../components/StatusBarManager";

const ResetPasswordScreen = ({ route }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const Params = route.params;

  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errors, setErrors] = useState({
    password: "",
    confirmPassword: "",
  });
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const [isModalVisible, setModalVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleResetPassword = async () => {
    let hasError = false;
    const newErrors = {
      password: "",
      confirmPassword: "",
    };

    if (!newPassword) {
      newErrors.password = "Password is required.";
      hasError = true;
    } else if (!passwordRegex.test(newPassword)) {
      newErrors.password =
        "Password must be at least 8 characters with uppercase, lowercase, number & special character.";
      hasError = true;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required.";
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    // Clear errors and show modal
    setErrors({ password: "", confirmPassword: "" });
    setLoading(true);
    try {
      const payload = {
        token: Params.data.changePasswordToken,
        password: newPassword,
      };
      const response = await changePassword_API(payload);
      console.log("Response => ", response);
      if (response?.success) {
        setModalVisible(true);
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

  const onBackToLogin = () => {
    setModalVisible(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "signin" }],
    });
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
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 48 }} />
      </View>

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
          <Text style={styles.modalTitle}>{"Hello"}</Text>
          <Text style={styles.modalSubtitle}>
            {"Your password has been reset successfully!"}
          </Text>
          <TouchableOpacity
            style={styles.backToLoginButton}
            activeOpacity={0.7}
            onPress={onBackToLogin}
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
                autoCapitalize="none"
                right={
                  <TextInput.Icon
                    icon={passwordVisible ? "eye-off" : "eye"}
                    onPress={togglePasswordVisibility}
                    color={AppColor.textHighlighter}
                    forceTextInputFocus={false}
                  />
                }
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!errors.password && (
                <HelperText type="error" visible={true} style={styles.helper}>
                  {errors.password}
                </HelperText>
              )}

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
                autoCapitalize="sentences"
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
                    forceTextInputFocus={false}
                  />
                }
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!errors.confirmPassword && (
                <HelperText type="error" visible={true} style={styles.helper}>
                  {errors.confirmPassword}
                </HelperText>
              )}

              {/* Reset Button */}
              <TouchableOpacity
