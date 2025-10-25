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
import { emailRegex, passwordRegex } from "../utils/constants";
import { registerVendor_API } from "../api/authAPI";
import StatusBarManager from "../components/StatusBarManager";
import { useSelector } from "react-redux";

const SignUpScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const { allSigninUsers } = useSelector((state) => state.userInfoReducer);

  const [name, setName] = useState("");
  const [foodTruckName, setFoodTruckName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [mailingCity, setMailingCity] = useState("");
  const [mailingState, setMailingState] = useState("");
  const [mailingCountry, setMailingCountry] = useState("");
  const [mailingZipCode, setMailingZipCode] = useState("");
  const [countryPickerType, setCountryPickerType] = useState(null);
  const [offGrid, setOffGrid] = useState(true);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "default",
  });

  const [errors, setErrors] = useState({
    name: "",
    foodTruckName: "",
    mailingAddress: "",
    mailingCity: "",
    mailingState: "",
    mailingCountry: "",
    mailingZipCode: "",
    mobileNumber: "",
    email: "",
    password: "",
  });

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const validateName = (value) => {
    if (!value.trim()) return "Name is required";
    return "";
  };

  const validateFoodTruckName = (value) => {
    if (!value.trim()) return "Food truck name is required";
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

  const validateMailingAddress = (value) => {
    if (!value.trim()) return "Address is required";
    return "";
  };

  const validateMailingCity = (value) => {
    if (!value.trim()) return "City is required";
    return "";
  };

  const validateMailingState = (value) => {
    if (!value.trim()) return "State is required";
    return "";
  };

  const validateMailingCountry = (value) => {
    if (!value.trim()) return "Country is required";
    return "";
  };

  const validateMailingZipcode = (value) => {
    if (!value.trim()) return "Zipcode is required";
    return "";
  };

  const validateForm = () => {
    const newErrors = {};

    const nameError = validateName(name);
    if (nameError) newErrors.name = nameError;

    const foodTruckNameError = validateFoodTruckName(foodTruckName);
    if (foodTruckNameError) newErrors.foodTruckName = foodTruckNameError;

    const mobileError = validateMobileNumber(mobileNumber);
    if (mobileError) newErrors.mobileNumber = mobileError;

    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    const mailingAddressError = validateMailingAddress(mailingAddress);
    if (mailingAddressError) newErrors.mailingAddress = mailingAddressError;

    const mailingCityError = validateMailingCity(mailingCity);
    if (mailingCityError) newErrors.mailingCity = mailingCityError;

    const mailingStateError = validateMailingState(mailingState);
    if (mailingStateError) newErrors.mailingState = mailingStateError;

    const mailingCountryError = validateMailingCountry(mailingCountry);
    if (mailingCountryError) newErrors.mailingCountry = mailingCountryError;

    const mailingZipcodeError = validateMailingZipcode(mailingZipCode);
    if (mailingZipcodeError) newErrors.mailingZipCode = mailingZipcodeError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    const isValid = validateForm();
    if (!isValid) return;

    const payload = {
      firstName: name,
      foodTruck: {
        name: foodTruckName,
        infoType: "truck",
      },
      email,
      password,
      countryCode,
      mobileNumber,
      mailing: {
        address: mailingAddress,
        city: mailingCity,
        state: mailingState,
        country: mailingCountry,
        zipcode: mailingZipCode,
      },
      subscribedForOffGrid: offGrid,
    };

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
            <Text style={styles.title}>{"Welcome to Round The Corner!"}</Text>
            <Text style={styles.subtitle}>{"Create new vendor account!"}</Text>

            <View style={styles.formContainer}>
              {/* Name */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Your Name *"}
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
                error={!!errors.name}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({ ...prev, name: validateName(name) }))
                }
              />
              {!!errors.name && (
                <HelperText
                  type="error"
                  visible={!!errors.name}
                  style={styles.helper}
                >
                  {errors.name}
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

              {/* Address */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Address *"}
              </Text>
              <TextInput
                dense
                value={mailingAddress}
                onChangeText={setMailingAddress}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Address"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.mailingAddress}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    mailingAddress: validateMailingAddress(mailingAddress),
                  }))
                }
              />
              {!!errors.mailingAddress && (
                <HelperText
                  type="error"
                  visible={!!errors.mailingAddress}
                  style={styles.helper}
                >
                  {errors.mailingAddress}
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
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"State *"}
              </Text>
              <TextInput
                dense
                value={mailingState}
                onChangeText={setMailingState}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter State"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.mailingState}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    mailingState: validateMailingState(mailingState),
                  }))
                }
              />
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

              {/* Zipcode */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Zipcode *"}
              </Text>
              <TextInput
                dense
                value={mailingZipCode}
                onChangeText={setMailingZipCode}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Zipcode"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                error={!!errors.mailingZipCode}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                autoCapitalize="sentences"
                maxLength={6}
                theme={{ colors: { onSurfaceVariant: "#777" } }}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    mailingZipCode: validateMailingZipcode(mailingZipCode),
                  }))
                }
              />
              {!!errors.mailingZipCode && (
                <HelperText
                  type="error"
                  visible={!!errors.mailingZipCode}
                  style={styles.helper}
                >
                  {errors.mailingZipCode}
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
                    setMailingCountry(`${item.name.en}, ${item.code}`);
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

              {/* offgrid checkbox */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setOffGrid(!offGrid)}
                  style={styles.iconBox}
                >
                  <Ionicons
                    name={offGrid ? "checkbox" : "square-outline"}
                    size={22}
                    color={AppColor.primary}
                  />
                </TouchableOpacity>

                <Text style={styles.termsText}>
                  {
                    "Would you like to join our nonprofit Underground of Wisdom Lane, an off-the-grid communication system?"
                  }
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSignUp}
                activeOpacity={0.7}
                disabled={!agreed || loading}
                style={[styles.signInButton, { opacity: agreed ? 1 : 0.5 }]}
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
