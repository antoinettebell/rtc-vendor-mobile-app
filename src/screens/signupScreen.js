import React, { useState } from "react";
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
  Divider,
} from "react-native-paper";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CountryPicker } from "react-native-country-codes-picker";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  emailRegex,
  passwordRegex,
  addressRegex,
  addressCountryRegex,
  addressPostalCodeRegex,
  nameRegex,
  truckNameRegex,
} from "../utils/constants";
import { registerVendor_API } from "../api/authAPI";
import StatusBarManager from "../components/StatusBarManager";
import { useSelector } from "react-redux";
import StatePickerModal from "../components/StatePickerModal";
import { usStates } from "../utils/usStates";

const SMS_CONSENT_MESSAGE =
  "I agree to receive automated transactional text messages from Round the Corner, including order confirmations, ready-for-pickup alerts, delivery updates, account updates, and order completion notices at the mobile number provided. Consent is not a condition of purchase. Message and data rates may apply. Message frequency varies. Reply HELP for help and STOP to cancel. View our ";

const SignUpScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const { allSigninUsers } = useSelector((state) => state.userInfoReducer);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [foodTruckName, setFoodTruckName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mailingAddressLine1, setMailingAddressLine1] = useState("");
  const [mailingAddressLine2, setMailingAddressLine2] = useState("");
  const [mailingCity, setMailingCity] = useState("");
  const [mailingState, setMailingState] = useState("");
  const [mailingCountry, setMailingCountry] = useState("US");
  const [mailingPostalCode, setMailingPostalCode] = useState("");
  const [countryPickerType, setCountryPickerType] = useState(null);
  const [agreed, setAgreed] = useState(true);
  const [agreedToMessages, setAgreedToMessages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "default",
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    foodTruckName: "",
    mailingAddressLine1: "",
    mailingAddressLine2: "",
    mailingCity: "",
    mailingState: "",
    mailingCountry: "",
    mailingPostalCode: "",
    mobileNumber: "",
    email: "",
    password: "",
  });

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const validateFirstName = (value) => {
    if (!value.trim()) return "First Name is required";
    if (!nameRegex.test(value)) return "Enter a valid first name";
    return "";
  };

  const validateLastName = (value) => {
    if (!value.trim()) return "Last Name is required";
    if (!nameRegex.test(value)) return "Enter a valid last name";
    return "";
  };

  const validateFoodTruckName = (value) => {
    if (!value.trim()) return "Food truck name is required";
    if (!truckNameRegex.test(value)) return "Enter a valid food truck name";
    return "";
  };

  const validateMobileNumber = (value) => {
    if (!value.trim()) return "Mobile number is required";
    if (value.length < 10) return "Enter a valid 10-digit number";
    return "";
  };

  const validateEmail = (value) => {
    if (!value.trim()) return "Email is required";
    if (!emailRegex.test(value)) return "Enter a valid email!";
    return "";
  };

  const validatePassword = (value) => {
    if (!value.trim()) return "Password is required";
    if (!passwordRegex.test(value)) {
      return "Password must be 8–15 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char.";
    }
    return "";
  };

  const validateMailingAddressLine1 = (value) => {
    if (!value.trim()) return "Address Line 1 is required";
    if (!addressRegex.test(value)) {
      return "Address must contain only letters, numbers, and basic punctuation.";
    }
    return "";
  };

  const validateMailingAddressLine2 = (value) => {
    // if (!value.trim()) return "Address Line 2 is required";
    if (!addressRegex.test(value)) {
      return "Address must contain only letters, numbers, and basic punctuation.";
    }
    return "";
  };

  const validateMailingCity = (value) => {
    if (!value.trim()) return "City is required";
    if (!addressRegex.test(value)) {
      return "City must contain only letters, numbers, and basic punctuation.";
    }
    return "";
  };

  const validateMailingState = (value) => {
    if (!value.trim()) return "State is required";
    const normalizedValue = value.trim().toUpperCase();
    const validState = usStates.some(
      (state) =>
        state.value === normalizedValue ||
        state.label.toUpperCase() === normalizedValue
    );
    if (!validState) {
      return "Please select a valid state";
    }
    return "";
  };

  const validateMailingCountry = (value) => {
    if (!value.trim()) return "Country is required";
    if (!addressCountryRegex.test(value)) {
      return "Country value is not valid";
    }
    return "";
  };

  const validateMailingPostalcode = (value) => {
    if (!value.trim()) return "Postal code is required";
    if (!addressPostalCodeRegex.test(value)) {
      return "Postal Code is not valid";
    }
    return "";
  };

  const validateForm = () => {
    const newErrors = {};

    const firstNameError = validateFirstName(firstName);
    if (firstNameError) newErrors.firstName = firstNameError;

    const lastNameError = validateLastName(lastName);
    if (lastNameError) newErrors.lastName = lastNameError;

    const foodTruckNameError = validateFoodTruckName(foodTruckName);
    if (foodTruckNameError) newErrors.foodTruckName = foodTruckNameError;

    const mobileError = validateMobileNumber(mobileNumber);
    if (mobileError) newErrors.mobileNumber = mobileError;

    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    const mailingAddressLine1Error =
      validateMailingAddressLine1(mailingAddressLine1);
    if (mailingAddressLine1Error)
      newErrors.mailingAddressLine1 = mailingAddressLine1Error;

    const mailingAddressLine2Error =
      validateMailingAddressLine2(mailingAddressLine2);
    if (mailingAddressLine2Error)
      newErrors.mailingAddressLine2 = mailingAddressLine2Error;

    const mailingCityError = validateMailingCity(mailingCity);
    if (mailingCityError) newErrors.mailingCity = mailingCityError;

    const mailingStateError = validateMailingState(mailingState);
    if (mailingStateError) newErrors.mailingState = mailingStateError;

    const mailingCountryError = validateMailingCountry(mailingCountry);
    if (mailingCountryError) newErrors.mailingCountry = mailingCountryError;

    const mailingPostalcodeError = validateMailingPostalcode(mailingPostalCode);
    if (mailingPostalcodeError)
      newErrors.mailingPostalCode = mailingPostalcodeError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    const isValid = validateForm();
    if (!isValid) return;

    let payload = {
      firstName: firstName,
      lastName: lastName,
      foodTruck: {
        name: foodTruckName,
        infoType: "truck",
      },
      email,
      password,
      countryCode,
      mobileNumber,
      // mailing: {
      //   address: mailingAddressLine1,
      //   city: mailingCity,
      //   state: mailingState,
      //   country: mailingCountry,
      //   zipcode: mailingPostalCode,
      // },
      addressLine1: mailingAddressLine1,
      addressCity: mailingCity,
      addressState: mailingState,
      addressCountry: mailingCountry,
      addressPostal: mailingPostalCode,
    };

    if (mailingAddressLine2.trim().length > 0) {
      payload.addressLine2 = mailingAddressLine2;
    }

    console.log("Payload:", payload);
    setLoading(true);
    try {
      const response = await registerVendor_API(payload);
      console.log("Response => ", response);
      if (response?.success && response?.data) {
        navigation.navigate("otpVerification", {
          verificationFor: "sign-up",
          data: { ...response.data, localPassword: password },
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
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBarManager barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.white}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Business Details</Text>
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
          pointerEvents={loading ? "none" : "auto"}
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
            <Text style={styles.title}>{"Business Details"}</Text>
            <Text style={styles.subtitle}>
              {"Tell us about you and your food truck."}
            </Text>

            <View style={styles.formContainer}>
              {/* First Name */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Your First Name *"}
              </Text>
              <TextInput
                dense
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Your First Name"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.firstName}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    firstName: validateFirstName(firstName),
                  }))
                }
              />
              {!!errors.firstName && (
                <HelperText
                  type="error"
                  visible={!!errors.firstName}
                  style={styles.helper}
                >
                  {errors.firstName}
                </HelperText>
              )}

              {/* Last Name */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Your Last Name *"}
              </Text>
              <TextInput
                dense
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Your Last Name"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.lastName}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    lastName: validateLastName(lastName),
                  }))
                }
              />
              {!!errors.lastName && (
                <HelperText
                  type="error"
                  visible={!!errors.lastName}
                  style={styles.helper}
                >
                  {errors.lastName}
                </HelperText>
              )}

              {/* Food Truck Name */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Food Truck Name *"}
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
                error={!!errors.foodTruckName}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    foodTruckName: validateFoodTruckName(foodTruckName),
                  }))
                }
              />
              {!!errors.foodTruckName && (
                <HelperText
                  type="error"
                  visible={!!errors.foodTruckName}
                  style={styles.helper}
                >
                  {errors.foodTruckName}
                </HelperText>
              )}

              {/* Mailing Information */}
              <View style={styles.sectionHeaderContainer}>
                <Divider style={{ flex: 1 }} />
                <Text
                  style={{
                    marginHorizontal: 16,
                    fontSize: 18,
                    fontFamily: Mulish700,
                    color: AppColor.gray,
                  }}
                >
                  {"Mailing Information"}
                </Text>
                <Divider style={{ flex: 1 }} />
              </View>

              {/* Address Line 1 */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Address Line 1 *"}
              </Text>
              <TextInput
                dense
                value={mailingAddressLine1}
                onChangeText={setMailingAddressLine1}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Address Line 1"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.mailingAddressLine1}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    mailingAddressLine1:
                      validateMailingAddressLine1(mailingAddressLine1),
                  }))
                }
              />
              {!!errors.mailingAddressLine1 && (
                <HelperText
                  type="error"
                  visible={!!errors.mailingAddressLine1}
                  style={styles.helper}
                >
                  {errors.mailingAddressLine1}
                </HelperText>
              )}

              {/* Address Line 2 */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Address Line 2"}
              </Text>
              <TextInput
                dense
                value={mailingAddressLine2}
                onChangeText={setMailingAddressLine2}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Address Line 2"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.mailingAddressLine2}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    mailingAddressLine2:
                      validateMailingAddressLine2(mailingAddressLine2),
                  }))
                }
              />
              {!!errors.mailingAddressLine2 && (
                <HelperText
                  type="error"
                  visible={!!errors.mailingAddressLine2}
                  style={styles.helper}
                >
                  {errors.mailingAddressLine2}
                </HelperText>
              )}

              {/* City */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"City *"}
              </Text>
              <TextInput
                dense
                value={mailingCity}
                onChangeText={setMailingCity}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter City"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.mailingCity}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    mailingCity: validateMailingCity(mailingCity),
                  }))
                }
              />
              {!!errors.mailingCity && (
                <HelperText
                  type="error"
                  visible={!!errors.mailingCity}
                  style={styles.helper}
                >
                  {errors.mailingCity}
                </HelperText>
              )}

              {/* State */}
              <View style={{ marginTop: 16 }}>
                <StatePickerModal
                  value={mailingState}
                  error={!!errors.mailingState}
                  onChange={(state) => {
                    setMailingState(state);
                    setErrors((prev) => ({
                      ...prev,
                      mailingState: "",
                    }));
                  }}
                />
              </View>
              {!!errors.mailingState && (
                <HelperText
                  type="error"
                  visible={!!errors.mailingState}
                  style={styles.helper}
                >
                  {errors.mailingState}
                </HelperText>
              )}

              {/* Country */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Country *"}
              </Text>
              <View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setCountryPickerVisible(true);
                    setCountryPickerType("address");
                  }}
                  style={[
                    styles.countryInput,
                    !!errors.mailingCountry && styles.errorBorder,
                  ]}
                  disabled={true}
                >
                  <Text
                    style={[
                      styles.countryCodeText,
                      !mailingCountry && {
                        color: AppColor.placeholderTextColor,
                      },
                    ]}
                  >
                    {mailingCountry || "Select Country"}
                  </Text>
                  <AntDesign
                    name="caretdown"
                    color={AppColor.textHighlighter}
                    size={14}
                  />
                </TouchableOpacity>
              </View>
              {!!errors.mailingCountry && (
                <HelperText
                  type="error"
                  visible={!!errors.mailingCountry}
                  style={styles.helper}
                >
                  {errors.mailingCountry}
                </HelperText>
              )}

              {/* Postal Code */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Postal Code *"}
              </Text>
              <TextInput
                dense
                value={mailingPostalCode}
                onChangeText={setMailingPostalCode}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Postal Code"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.mailingPostalCode}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                maxLength={6}
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    mailingPostalCode:
                      validateMailingPostalcode(mailingPostalCode),
                  }))
                }
              />
              {!!errors.mailingPostalCode && (
                <HelperText
                  type="error"
                  visible={!!errors.mailingPostalCode}
                  style={styles.helper}
                >
                  {errors.mailingPostalCode}
                </HelperText>
              )}

              {/* Contact Information */}
              <View style={styles.sectionHeaderContainer}>
                <Divider style={{ flex: 1 }} />
                <Text
                  style={{
                    marginHorizontal: 16,
                    fontSize: 18,
                    fontFamily: Mulish700,
                    color: AppColor.gray,
                  }}
                >
                  {"Contact Information"}
                </Text>
                <Divider style={{ flex: 1 }} />
              </View>

              {/* Mobile No */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Enter mobile no. *"}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setCountryPickerVisible(true);
                    setCountryPickerType("phone");
                  }}
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
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  style={[styles.input, { flex: 1 }]}
                  contentStyle={styles.inputText}
                  placeholder="Enter Mobile No."
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.mobileNumber}
                  maxLength={10}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      mobileNumber: validateMobileNumber(mobileNumber),
                    }))
                  }
                />
              </View>
              {!!errors.mobileNumber && (
                <HelperText
                  type="error"
                  visible={!!errors.mobileNumber}
                  style={styles.helper}
                >
                  {errors.mobileNumber}
                </HelperText>
              )}

              {/* Required transactional SMS consent */}
              <Text style={styles.smsConsentTitle}>
                SMS Text Message Consent *
              </Text>
              <View style={[styles.termsContainer, styles.smsConsentContainer]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    setAgreedToMessages((currentValue) => !currentValue)
                  }
                  style={styles.iconBox}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: agreedToMessages }}
                  accessibilityLabel="Agree to receive transactional text messages"
                >
                  <Ionicons
                    name={agreedToMessages ? "checkbox" : "square-outline"}
                    size={22}
                    color={AppColor.primary}
                  />
                </TouchableOpacity>

                <Text style={styles.termsText}>
                  {SMS_CONSENT_MESSAGE}
                  <Text
                    style={styles.linkText}
                    onPress={() => navigation.navigate("termsOfService")}
                  >
                    {"Terms of Service"}
                  </Text>
                  {" and "}
                  <Text
                    style={styles.linkText}
                    onPress={() => navigation.navigate("privacyPolicy")}
                  >
                    {"Privacy Policy"}
                  </Text>
                </Text>
              </View>

              {/* Email */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Email ID *"}
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
                error={!!errors.email}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="username"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    email: validateEmail(email),
                  }))
                }
              />
              {!!errors.email && (
                <HelperText
                  type="error"
                  visible={!!errors.email}
                  style={styles.helper}
                >
                  {errors.email}
                </HelperText>
              )}

              {/* Password */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Password *"}
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
                error={!!errors.password}
                secureTextEntry={!passwordVisible}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="none"
                textContentType="password"
                right={
                  <TextInput.Icon
                    icon={passwordVisible ? "eye-off" : "eye"}
                    onPress={togglePasswordVisibility}
                    color={AppColor.textHighlighter}
                    forceTextInputFocus={false}
                  />
                }
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    password: validatePassword(password),
                  }))
                }
              />
              {!!errors.password && (
                <HelperText
                  type="error"
                  visible={!!errors.password}
                  style={styles.helper}
                >
                  {errors.password}
                </HelperText>
              )}

              {/* Country picker modal */}
              <CountryPicker
                show={countryPickerVisible}
                style={{
                  modal: {
                    height: "70%",
                  },
                  backdrop: {
                    backgroundColor: "rgba(0,0,0,0.1)",
                  },
                  line: {},
                  itemsList: {},
                  textInput: {},
                  countryButtonStyles: { paddingVertical: 0 },
                  searchMessageText: {},
                  countryMessageContainer: {},
                  flag: {},
                  dialCode: {},
                  countryName: {},
                }}
                pickerButtonOnPress={(item) => {
                  if (countryPickerType === "phone") {
                    setCountryCode(item.dial_code);
                  } else if (countryPickerType === "address") {
                    setMailingCountry(item.code);
                    setErrors((prev) => ({
                      ...prev,
                      mailingCountry: "",
                    }));
                  }
                  setCountryPickerVisible(false);
                  setCountryPickerType(null);
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

                <Text style={styles.termsText}>
                  {"I agree to the"}
                  <Text
                    style={styles.linkText}
                    onPress={() => navigation.navigate("termsOfService")}
                  >
                    {" Terms of Service"}
                  </Text>
                  {" and "}
                  <Text
                    style={styles.linkText}
                    onPress={() => navigation.navigate("privacyPolicy")}
                  >
                    {"Privacy Policy."}
                  </Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSignUp}
                activeOpacity={0.7}
                disabled={!agreed || !agreedToMessages || loading}
                style={[styles.signInButton, { opacity: (agreed && agreedToMessages) ? 1 : 0.5 }]}
              >
                {loading ? (
                  <ActivityIndicator color={AppColor.white} />
                ) : (
                  <Text style={styles.buttonLabel}>{"Signup"}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>
                  {"Already have an account? "}{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (allSigninUsers?.length > 0) {
                      navigation.navigate("oneTapSignin");
                    } else {
                      navigation.navigate("signin");
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signInLink}>{"Sign In"}</Text>
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
    marginBottom: 10,
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
  inputTextWithLine: {
    fontFamily: Mulish400,
    fontSize: 15,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: AppColor.border,
  },
  helper: {
    marginBottom: 8,
    paddingLeft: 0,
    paddingTop: 0,
    fontFamily: Mulish400,
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
    fontFamily: Mulish400,
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
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  signInText: {
    color: AppColor.textHighlighter,
    fontSize: 14,
    fontFamily: Mulish400,
  },
  signInLink: {
    color: AppColor.text,
    fontSize: 14,
    fontFamily: Mulish700,
  },
  buttonLabel: {
    fontFamily: Mulish700,
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
    fontFamily: Mulish400,
  },
  smsConsentTitle: {
    color: AppColor.text,
    fontFamily: Mulish700,
    fontSize: 15,
    marginTop: 20,
  },
  smsConsentContainer: {
    alignItems: "flex-start",
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    padding: 12,
  },
  linkText: {
    color: AppColor.primary,
  },
  iconBox: {
    padding: 4,
    marginRight: 6,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
  },
  countryInput: {
    height: 48,
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
  errorBorder: {
    borderColor: "#b3261e",
    borderWidth: 2,
  },
});

export default SignUpScreen;
