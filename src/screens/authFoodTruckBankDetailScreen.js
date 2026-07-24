import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Divider,
  HelperText,
  IconButton,
  TextInput,
} from "react-native-paper";
import { useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import { Dropdown } from "react-native-element-dropdown";
import { AppColor, Mulish400, Mulish700 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import {
  bankAccountTypeList,
  bankPaymentMethodList,
  bankCurrencyList,
  emailRegex,
} from "../utils/constants";
import { addBankDetail_API, registerComplete_API } from "../api/appAPI";
import { onUnderReview } from "../redux/slices/authSlice";

const validateAccountHolderName = (text) => {
  if (!text.trim()) return "Account holder name is required";
  return "";
};

const validateBankName = (text) => {
  if (!text.trim()) return "Bank name is required";
  return "";
};

const validateAccountNumber = (text) => {
  const digitsOnly = text.replace(/\D/g, "");
  if (!digitsOnly.trim()) return "Account number is required";
  return "";
};

const validateRoutingNumber = (text) => {
  const digitsOnly = text.replace(/\D/g, "");
  return digitsOnly.length === 9;
};

const validateAccountType = (text) => {
  if (!text.trim()) return "Please select account type";
  return "";
};

const validateRemittanceEmail = (text) => {
  if (!text.trim()) return "Remittance email is required";
  if (!emailRegex.test(text)) return "Invalid remittance email";
  return "";
};

const validateCurrency = (text) => {
  if (!text.trim()) return "Please select currency";
  return "";
};

const validateSwiftCode = (text) => {
  if (!text.trim()) return "SWIFT code is required";
  return "";
};

const validateIban = (text) => {
  if (!text.trim()) return "IBAN is required";
  return "";
};

const validatePaymentMethod = (text) => {
  if (!text.trim()) return "Please select payment method";
  return "";
};

const AuthFoodTruckBankDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("");
  const [remittanceEmail, setRemittanceEmail] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [iban, setIban] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  const [errors, setErrors] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    accountType: "",
    remittanceEmail: "",
    swiftCode: "",
    iban: "",
    currency: "",
    paymentMethod: "",
  });

  const handleContinueBtnPress = async () => {
    // Validate all required fields
    const newErrors = {
      accountHolderName: validateAccountHolderName(accountHolderName),
      bankName: validateBankName(bankName),
      accountNumber: validateAccountNumber(accountNumber),
      routingNumber: validateRoutingNumber(routingNumber)
        ? ""
        : "Routing number is required",
      accountType: validateAccountType(selectedAccountType),
      remittanceEmail: validateRemittanceEmail(remittanceEmail),
      swiftCode: validateSwiftCode(swiftCode),
      iban: validateIban(iban),
      currency: validateCurrency(selectedCurrency),
      paymentMethod: validatePaymentMethod(selectedPaymentMethod),
    };

    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error !== "");
    if (hasErrors) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        accountHolderName,
        bankName,
        accountNumber,
        routingNumber,
        accountType: selectedAccountType,
        remittanceEmail,
        swiftCode,
        iban,
        currency: selectedCurrency,
        paymentMethod: selectedPaymentMethod,
      };
      const response = await addBankDetail_API(payload);
      console.log("response => ", response);
      if (response?.success && response?.data) {
        const response1 = await registerComplete_API();
        console.log("response1 => ", response1);
        if (response1?.success) {
          dispatch(onUnderReview(true));
          navigation.reset({
            index: 0,
            routes: [{ name: "authUnderReviewNoteScreen" }],
          });
        }
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBarManager barStyle="light-content" />

      {/* Header Container */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.white}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Bank Detail</Text>
        <View style={{ width: 48 }} />
      </View>

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
            {/* Step Indicator Container */}
            <View style={styles.stepContainer}>
              <View style={styles.stepSubContainer}>
                <View style={styles.filledCircle}>
                  <FontAwesome6 name="check" color={AppColor.white} size={18} />
                </View>
              </View>
              <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.filledCircle}>
                  <FontAwesome6 name="check" color={AppColor.white} size={18} />
                </View>
              </View>
              <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.filledCircle}>
                  <FontAwesome6 name="check" color={AppColor.white} size={18} />
                </View>
              </View>
              <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.filledCircle}>
                  <FontAwesome6 name="check" color={AppColor.white} size={18} />
                </View>
              </View>
              <View style={styles.line} />
              <View style={styles.stepSubContainer}>
                <View style={styles.filledCircle}>
                  <FontAwesome6
                    name="person-walking"
                    color={AppColor.white}
                    size={18}
                  />
                </View>
              </View>
            </View>

            {/* Main Content */}
            <View
              style={[styles.content, { paddingBottom: insets.bottom + 20 }]}
            >
              {/* Account Info */}
              <View style={[styles.section, { marginBottom: 16 }]}>
                <Text style={styles.sectionTitle}>Bank Account Info</Text>
                <Text style={styles.sectionSubtitle}>
                  Swipe-In income to your account!!
                </Text>
              </View>

              <Divider />

              {/* Account Holder Name */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Account Holder Name"}</Text>
                <TextInput
                  dense
                  value={accountHolderName}
                  onChangeText={(text) => {
                    setAccountHolderName(text);
                    if (!validateAccountHolderName(text)) {
                      setErrors((prev) => ({
                        ...prev,
                        accountHolderName: "",
                      }));
                    }
                  }}
                  style={styles.inputStyle}
                  contentStyle={styles.inputText}
                  placeholder="Name on the bank account"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.accountHolderName}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.accountHolderName && (
                  <HelperText
                    type="error"
                    visible={!!errors.accountHolderName}
                    style={styles.helper}
                  >
                    {errors.accountHolderName}
                  </HelperText>
                )}
              </View>

              {/* Bank Name */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Bank Name"}</Text>
                <TextInput
                  dense
                  value={bankName}
                  onChangeText={(text) => {
                    setBankName(text);
                    if (!validateBankName(text)) {
                      setErrors((prev) => ({
                        ...prev,
                        bankName: "",
                      }));
                    }
                  }}
                  style={styles.inputStyle}
                  contentStyle={styles.inputText}
                  placeholder="Chase, Bank of America, etc"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.bankName}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.bankName && (
                  <HelperText
                    type="error"
                    visible={!!errors.bankName}
                    style={styles.helper}
                  >
                    {errors.bankName}
                  </HelperText>
                )}
              </View>

              {/* Account Number */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Account Number"}</Text>
                <TextInput
                  dense
                  value={accountNumber}
                  onChangeText={(text) => {
                    // Remove non-digits and limit to 17 characters
                    const digitsOnly = text.replace(/\D/g, "").slice(0, 17);
                    setAccountNumber(digitsOnly);
                    if (!validateAccountNumber(digitsOnly)) {
                      setErrors((prev) => ({
                        ...prev,
                        accountNumber: "",
                      }));
                    }
                  }}
                  style={styles.inputStyle}
                  contentStyle={styles.inputText}
                  placeholder="Account number"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.accountNumber}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  keyboardType="number-pad"
                  maxLength={17}
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.accountNumber && (
                  <HelperText
                    type="error"
                    visible={!!errors.accountNumber}
                    style={styles.helper}
                  >
                    {errors.accountNumber}
                  </HelperText>
                )}
              </View>

              {/* Routing Number */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Routing Number (ABA)"}</Text>
                <TextInput
                  dense
                  value={routingNumber}
                  onChangeText={(text) => {
                    // Remove non-digits and limit to 9 characters
                    const digitsOnly = text.replace(/\D/g, "").slice(0, 9);
                    setRoutingNumber(digitsOnly);

                    if (validateRoutingNumber(digitsOnly)) {
                      setErrors((prev) => ({
                        ...prev,
                        routingNumber: "",
                      }));
                    }
                  }}
                  style={styles.inputStyle}
                  contentStyle={styles.inputText}
                  placeholder="9-digit code"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.routingNumber}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  keyboardType="number-pad"
                  maxLength={9}
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.routingNumber && (
                  <HelperText
                    type="error"
                    visible={!!errors.routingNumber}
                    style={styles.helper}
                  >
                    {errors.routingNumber}
                  </HelperText>
                )}
              </View>

              {/* Account Type */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Account Type"}</Text>
                <Dropdown
                  data={bankAccountTypeList}
                  labelField="label"
                  valueField="type"
                  value={selectedAccountType}
                  onChange={(selected) => {
                    setSelectedAccountType(selected.type);
                    setErrors((prev) => ({
                      ...prev,
                      accountType: "",
                    }));
                  }}
                  placeholder="Select Account Type"
                  style={styles.dropdown}
                  placeholderStyle={{
                    fontFamily: Mulish400,
                    color: AppColor.textHighlighter,
                  }}
                  itemTextStyle={{ fontFamily: Mulish400 }}
                  selectedTextStyle={{ fontFamily: Mulish400 }}
                />
                {!!errors.accountType && (
                  <HelperText
                    type="error"
                    visible={!!errors.accountType}
                    style={styles.helper}
                  >
                    {errors.accountType}
                  </HelperText>
                )}
              </View>

              {/* Remittance Email */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Remittance Email"}</Text>
                <TextInput
                  dense
                  value={remittanceEmail}
                  onChangeText={(text) => {
                    setRemittanceEmail(text);
                    if (!validateRemittanceEmail(text)) {
                      setErrors((prev) => ({
                        ...prev,
                        remittanceEmail: "",
                      }));
                    }
                  }}
                  style={styles.inputStyle}
                  contentStyle={styles.inputText}
                  placeholder="Enter Remittance Email"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.remittanceEmail}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.remittanceEmail && (
                  <HelperText
                    type="error"
                    visible={!!errors.remittanceEmail}
                    style={styles.helper}
                  >
                    {errors.remittanceEmail}
                  </HelperText>
                )}
              </View>

              {/* Currency */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Currency"}</Text>
                <Dropdown
                  data={bankCurrencyList}
                  labelField="label"
                  valueField="type"
                  value={selectedCurrency}
                  onChange={(selected) => {
                    setSelectedCurrency(selected.type);
                    setErrors((prev) => ({
                      ...prev,
                      currency: "",
                    }));
                  }}
                  placeholder="Select Currency"
                  style={styles.dropdown}
                  placeholderStyle={{
                    fontFamily: Mulish400,
                    color: AppColor.textHighlighter,
                  }}
                  itemTextStyle={{ fontFamily: Mulish400 }}
                  selectedTextStyle={{ fontFamily: Mulish400 }}
                />
                {!!errors.currency && (
                  <HelperText
                    type="error"
                    visible={!!errors.currency}
                    style={styles.helper}
                  >
                    {errors.currency}
                  </HelperText>
                )}
              </View>

              {/* Swift Code */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Swift Code"}</Text>
                <TextInput
                  dense
                  value={swiftCode}
                  onChangeText={(text) => {
                    setSwiftCode(text);
                    if (!validateSwiftCode(text)) {
                      setErrors((prev) => ({
                        ...prev,
                        swiftCode: "",
                      }));
                    }
                  }}
                  style={styles.inputStyle}
                  contentStyle={styles.inputText}
                  placeholder="Enter Swift Code"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.swiftCode}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.swiftCode && (
                  <HelperText
                    type="error"
                    visible={!!errors.swiftCode}
                    style={styles.helper}
                  >
                    {errors.swiftCode}
                  </HelperText>
                )}
              </View>

              {/* IBAN */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"IBAN"}</Text>
                <TextInput
                  dense
                  value={iban}
                  onChangeText={(text) => {
                    setIban(text);
                    if (!validateIban(text)) {
                      setErrors((prev) => ({
                        ...prev,
                        iban: "",
                      }));
                    }
                  }}
                  style={styles.inputStyle}
                  contentStyle={styles.inputText}
                  placeholder="Enter IBAN"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.iban}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.iban && (
                  <HelperText
                    type="error"
                    visible={!!errors.iban}
                    style={styles.helper}
                  >
                    {errors.iban}
                  </HelperText>
                )}
              </View>

              {/* Payment Method */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>{"Payment Method"}</Text>
                <Dropdown
                  data={bankPaymentMethodList}
                  dropdownPosition="top"
                  labelField="label"
                  valueField="type"
                  value={selectedPaymentMethod}
                  onChange={(selected) => {
                    setSelectedPaymentMethod(selected.type);
                    setErrors((prev) => ({
                      ...prev,
                      paymentMethod: "",
                    }));
                  }}
                  placeholder="Select Payment Method"
                  style={styles.dropdown}
                  placeholderStyle={{
                    fontFamily: Mulish400,
                    color: AppColor.textHighlighter,
                  }}
                  itemTextStyle={{ fontFamily: Mulish400 }}
                  selectedTextStyle={{ fontFamily: Mulish400 }}
                />
                {!!errors.paymentMethod && (
                  <HelperText
                    type="error"
                    visible={!!errors.paymentMethod}
                    style={styles.helper}
                  >
                    {errors.paymentMethod}
                  </HelperText>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Continue Button */}
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
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AuthFoodTruckBankDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
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

  // Step Indicator
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  stepSubContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  filledCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AppColor.primary,
  },
  line: {
    width: "10%",
    height: 2,
    backgroundColor: AppColor.primary,
  },

  // content
  content: { flex: 1, backgroundColor: AppColor.white },
  section: { marginTop: 16, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 24, fontFamily: Mulish700, color: AppColor.text },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    marginTop: 4,
  },

  // Textinput
  inputLabel: {
    fontFamily: Mulish400,
    fontSize: 15,
    color: AppColor.text,
    marginBottom: 8,
  },
  inputStyle: {
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

  // dropdown
  dropdown: {
    width: "100%",
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
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
