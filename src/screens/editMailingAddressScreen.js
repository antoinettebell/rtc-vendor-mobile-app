import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator as NativeIndicator,
  View,
} from "react-native";
import {
  ActivityIndicator,
  HelperText,
  IconButton,
  TextInput,
} from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Mulish400, Mulish700 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import AntDesign from "react-native-vector-icons/AntDesign";
import { CountryPicker } from "react-native-country-codes-picker";
import {
  addressPostalCodeRegex,
  addressCountryRegex,
  addressRegex,
} from "../utils/constants";
import { getUserDetail_API, updateUserDetail_API } from "../api/appAPI";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { setUser, updateUser } from "../redux/slices/userSlice";
import StatePickerModal from "../components/StatePickerModal";
import { getStateCode, usStates } from "../utils/usStates";

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

const EditMailingAddressScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.userReducer);

  const [loading, setLoading] = useState(false);
  const [getUserDetailLoading, setGetUserDetailLoading] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [mailingAddressLine1, setMailingAddressLine1] = useState("");
  const [mailingAddressLine2, setMailingAddressLine2] = useState("");
  const [mailingCity, setMailingCity] = useState("");
  const [mailingState, setMailingState] = useState("");
  const [mailingCountry, setMailingCountry] = useState("US");
  const [mailingPostalCode, setMailingPostalCode] = useState("");

  const [errors, setErrors] = useState({
    mailingAddressLine1: "",
    mailingAddressLine2: "",
    mailingCity: "",
    mailingState: "",
    mailingCountry: "",
    mailingPostalCode: "",
  });

  const handleContinueBtnPress = async () => {
    const newErrors = {
      mailingAddressLine1: validateMailingAddressLine1(mailingAddressLine1),
      mailingAddressLine2: validateMailingAddressLine2(mailingAddressLine2),
      mailingCity: validateMailingCity(mailingCity),
      mailingState: validateMailingState(mailingState),
      mailingCountry: validateMailingCountry(mailingCountry),
      mailingPostalCode: validateMailingPostalcode(mailingPostalCode),
    };

    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error !== "");
    if (hasErrors) {
      return;
    }

    setLoading(true);
    try {
      const user_id = user?._id;
      let payload = {
        addressLine1: mailingAddressLine1,
        addressCity: mailingCity,
        addressState: mailingState,
        addressCountry: mailingCountry,
        addressPostal: mailingPostalCode,
      };
      if (mailingAddressLine2.trim().length > 0) {
        payload.addressLine2 = mailingAddressLine2;
      }
      const response = await updateUserDetail_API({
        payload,
        user_id,
      });
      console.log("response => ", response);
      if (response?.success && response?.data) {
        dispatch(updateUser(response.data.user));
        dispatch(
          showSnackbar({
            message: "Mailing address updated successfully",
            type: "success",
          })
        );
        navigation.goBack();
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStateOnDataFetch = (data) => {
    setMailingAddressLine1(data?.addressLine1 || "");
    setMailingAddressLine2(data?.addressLine2 || "");
    setMailingCity(data?.addressCity || "");
    setMailingState(getStateCode(data?.addressState || ""));
    setMailingCountry(data?.addressCountry || "");
    setMailingPostalCode(data?.addressPostal || "");
  };

  const getUserDetailFromAPI = async () => {
    setGetUserDetailLoading(true);
    try {
      const user_id = user?._id;
      const response = await getUserDetail_API(user_id);
      console.log("response => ", response);
      if (response?.success && response.data) {
        const USER_DATA = response.data.user;
        dispatch(setUser(USER_DATA));
        updateStateOnDataFetch(USER_DATA); // update local states
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setGetUserDetailLoading(false);
    }
  };

  useEffect(() => {
    getUserDetailFromAPI();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top,
          backgroundColor: AppColor.white,
          borderBottomWidth: 1,
          borderBlockColor: AppColor.border,
        }}
      >
        <View style={{ width: "20%" }}>
          <IconButton
            icon="arrow-left"
            iconColor={AppColor.black}
            size={24}
            onPress={() => navigation.goBack()}
          />
        </View>
        <Text
          style={{
            fontSize: 19.78,
            fontFamily: Mulish700,
            color: AppColor.black,
          }}
        >
          {"Mailing Address Info"}
        </Text>
        <View style={{ width: "20%" }} />
      </View>

      {getUserDetailLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: insets.bottom,
          }}
        >
          <NativeIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <>
          {/* Content */}
          <KeyboardAvoidingView
            enabled={Platform.OS === "ios"}
            behavior="padding"
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              pointerEvents={loading ? "none" : "auto"}
            >
              <View style={{ flex: 1 }}>
                {/* Main Content */}
                <View
                  style={[
                    styles.content,
                    { paddingBottom: insets.bottom + 20 },
                  ]}
                >
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
                </View>
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
                    setMailingCountry(item.code);
                    setErrors((prev) => ({
                      ...prev,
                      mailingCountry: "",
                    }));
                    setCountryPickerVisible(false);
                  }}
                  onBackdropPress={() => setCountryPickerVisible(false)}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Update Button */}
          <View
            style={{
              paddingBottom: insets.bottom,
              borderTopWidth: 1,
              borderColor: AppColor.border,
              backgroundColor: AppColor.white,
            }}
          >
            <TouchableOpacity
              onPress={handleContinueBtnPress}
              activeOpacity={0.7}
              style={styles.continueButton}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.continueButtonText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

export default EditMailingAddressScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
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

  // continue button
  continueButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginVertical: 10,
    marginHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  continueButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
});
