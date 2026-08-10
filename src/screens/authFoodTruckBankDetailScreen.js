import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImagePicker from "react-native-image-crop-picker";
import {
  ActivityIndicator,
  Divider,
  HelperText,
  IconButton,
  TextInput,
} from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
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
import {
  buildPaymentMethodPayload,
  getPaymentMethodFields,
} from "../helpers/paymentMethodDetails.helper";
import { addBankDetail_API, registerComplete_API, uploadImage_API } from "../api/appAPI";
import {
  onUnderReview,
  setVendorOnboardingStep,
} from "../redux/slices/authSlice";
import { setBankStatus, setProfileStatus } from "../redux/slices/userSlice";
import StatePickerModal from "../components/StatePickerModal";
import { getStateCode } from "../utils/usStates";

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
  if (!text.trim()) return "";
  return /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i.test(text.trim())
    ? ""
    : "Enter a valid 8 or 11 character SWIFT code";
};

const validateIban = (text) => {
  if (!text.trim()) return "";
  return /^[A-Z0-9]{15,34}$/i.test(text.replace(/\s/g, ""))
    ? ""
    : "Enter a valid IBAN";
};

const validateWalletPaymentHandle = (text) =>
  text.trim() ? "" : "Payment handle / account identifier is required";

const validatePaymentMethod = (text) => {
  if (!text.trim()) return "Please select payment method";
  return "";
};

const AuthFoodTruckBankDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { selectedSignupAddOns } = useSelector(
    (state) => state.userReducer
  );
  const isOnboardingFlow = route?.params?.onboardingFlow === true;

  const [loading, setLoading] = useState(false);
  const [accountHolderName, setAccountHolderName] = useState("");
  const [walletPaymentHandle, setWalletPaymentHandle] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("");
  const [remittanceEmail, setRemittanceEmail] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [iban, setIban] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [bankAddressLine1, setBankAddressLine1] = useState("");
  const [bankAddressLine2, setBankAddressLine2] = useState("");
  const [bankCity, setBankCity] = useState("");
  const [bankState, setBankState] = useState("");
  const [bankPostal, setBankPostal] = useState("");
  const [paymentQrCodeUrl, setPaymentQrCodeUrl] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const { requiresBankDetails, requiresQrCode } =
    getPaymentMethodFields(selectedPaymentMethod);

  const [errors, setErrors] = useState({
    accountHolderName: "",
    walletPaymentHandle: "",
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
      accountHolderName: requiresBankDetails
        ? validateAccountHolderName(accountHolderName)
        : "",
      walletPaymentHandle: requiresQrCode
        ? validateWalletPaymentHandle(walletPaymentHandle)
        : "",
      bankName: requiresBankDetails ? validateBankName(bankName) : "",
      accountNumber: requiresBankDetails ? validateAccountNumber(accountNumber) : "",
      routingNumber: requiresBankDetails && !validateRoutingNumber(routingNumber)
        ? "Routing number is required"
        : "",
      accountType: requiresBankDetails ? validateAccountType(selectedAccountType) : "",
      remittanceEmail: requiresQrCode ? validateRemittanceEmail(remittanceEmail) : "",
      swiftCode: requiresBankDetails ? validateSwiftCode(swiftCode) : "",
      iban: requiresBankDetails ? validateIban(iban) : "",
      currency: requiresQrCode ? validateCurrency(selectedCurrency) : "",
      paymentMethod: validatePaymentMethod(selectedPaymentMethod),
      paymentQrCodeUrl: requiresQrCode && !paymentQrCodeUrl ? "QR code is required" : "",
      bankAddressLine1: requiresBankDetails && !bankAddressLine1.trim() ? "Bank address is required" : "",
      bankCity: requiresBankDetails && !bankCity.trim() ? "City is required" : "",
      bankState: requiresBankDetails && !bankState.trim() ? "State is required" : "",
      bankPostal: requiresBankDetails && !bankPostal.trim() ? "Postal code is required" : "",
    };

    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error !== "");
    if (hasErrors) {
      return;
    }

    setLoading(true);
    try {
      const payload = buildPaymentMethodPayload(selectedPaymentMethod, {
        accountHolderName,
        walletPaymentHandle,
        bankName,
        accountNumber,
        routingNumber,
        accountType: selectedAccountType,
        remittanceEmail,
        swiftCode,
        iban,
        currency: selectedCurrency,
        paymentQrCodeUrl,
        bankAddressLine1,
        bankAddressLine2,
        bankCity,
        bankState: getStateCode(bankState),
        bankPostal,
      });
      const response = await addBankDetail_API(payload);
      console.log("response => ", response);
      if (response?.success && response?.data) {
        const response1 = await registerComplete_API();
        console.log("response1 => ", response1);
        if (response1?.success) {
          if (isOnboardingFlow) {
            dispatch(setBankStatus(true));
            dispatch(setProfileStatus("APPROVED"));
            dispatch(setVendorOnboardingStep("MENU"));
            navigation.reset({
              index: 0,
              routes: [{ name: "authMenuSetupPromptScreen" }],
            });
          } else {
            dispatch(onUnderReview(true));
            navigation.reset({
              index: 0,
              routes: [{ name: "authUnderReviewNoteScreen" }],
            });
          }
        }
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setLoading(false);
    }
  };

  const uploadPaymentQrCode = async () => {
    try {
      const image = await ImagePicker.openPicker({ mediaType: "photo", cropping: false });
      setUploadingQr(true);
      const formData = new FormData();
      formData.append("file", {
        uri: image.path,
        name: image.path.split("/").pop() || `payment-qr-${Date.now()}.jpg`,
        type: image.mime || "image/jpeg",
      });
      const response = await uploadImage_API(formData);
      const url = response?.data?.file;
      if (!response?.success || !url) throw new Error("QR upload failed");
      setPaymentQrCodeUrl(url);
      setErrors((current) => ({ ...current, paymentQrCodeUrl: "" }));
    } catch (error) {
      if (!String(error?.message || error).toLowerCase().includes("cancel")) {
        Alert.alert("Upload failed", "Could not upload the payment QR code.");
      }
    } finally {
      setUploadingQr(false);
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
          onPress={() => {
            if (isOnboardingFlow) {
              dispatch(setVendorOnboardingStep("PROFILE"));
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: "authFoodTruckProfileScreen",
                    params: {
                      onboardingFlow: true,
                      addOns: selectedSignupAddOns,
                    },
                  },
                ],
              });
              return;
            }
            navigation.goBack();
          }}
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

              <View style={styles.section}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <Dropdown
                  data={bankPaymentMethodList}
                  labelField="label"
                  valueField="type"
                  value={selectedPaymentMethod}
                  onChange={(selected) => {
                    setSelectedPaymentMethod(selected.type);
                    setPaymentQrCodeUrl("");
                    setErrors((current) => ({ ...current, paymentMethod: "", paymentQrCodeUrl: "" }));
                  }}
                  placeholder="Select Payment Method"
                  style={styles.dropdown}
                  placeholderStyle={{ fontFamily: Mulish400, color: AppColor.textHighlighter }}
                  itemTextStyle={{ fontFamily: Mulish400 }}
                  selectedTextStyle={{ fontFamily: Mulish400 }}
                />
                {!!errors.paymentMethod && <HelperText type="error">{errors.paymentMethod}</HelperText>}
              </View>

              {requiresQrCode ? (
                <View style={styles.section}>
                  <Text style={styles.inputLabel}>Payment QR Code</Text>
                  <TouchableOpacity style={styles.continueButton} onPress={uploadPaymentQrCode} disabled={uploadingQr}>
                    <Text style={styles.continueButtonText}>
                      {uploadingQr ? "Uploading…" : paymentQrCodeUrl ? "Replace QR Code" : "Upload QR Code"}
                    </Text>
                  </TouchableOpacity>
                  {paymentQrCodeUrl ? <HelperText type="info">QR code uploaded</HelperText> : null}
                  {!!errors.paymentQrCodeUrl && <HelperText type="error">{errors.paymentQrCodeUrl}</HelperText>}
                </View>
              ) : null}

              {requiresQrCode ? <View style={styles.section}>
                <Text style={styles.inputLabel}>
                  Payment Handle / Account Identifier
                </Text>
                <TextInput
                  dense
                  value={walletPaymentHandle}
                  onChangeText={(text) => {
                    setWalletPaymentHandle(text);
                    if (!validateWalletPaymentHandle(text)) {
                      setErrors((prev) => ({
                        ...prev,
                        walletPaymentHandle: "",
                      }));
                    }
                  }}
                  style={styles.inputStyle}
                  contentStyle={styles.inputText}
                  placeholder="Enter payment handle or account identifier"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.walletPaymentHandle}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                  theme={{ colors: { onSurfaceVariant: "#777" } }}
                />
                {!!errors.walletPaymentHandle && (
                  <HelperText
                    type="error"
                    visible={!!errors.walletPaymentHandle}
                    style={styles.helper}
                  >
                    {errors.walletPaymentHandle}
                  </HelperText>
                )}
              </View> : null}

              <View style={{ display: requiresBankDetails ? "flex" : "none" }}>
              <View style={styles.section}>
                <Text style={styles.inputLabel}>Account Holder Name</Text>
                <TextInput
                  dense
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                  style={styles.inputStyle}
                  contentStyle={styles.inputText}
                  placeholder="Name on the bank account"
                  placeholderTextColor={AppColor.placeholderTextColor}
                  mode="outlined"
                  error={!!errors.accountHolderName}
                  outlineColor={AppColor.border}
                  activeOutlineColor={AppColor.primary}
                  outlineStyle={{ borderRadius: 8 }}
                />
                {!!errors.accountHolderName ? <HelperText type="error">{errors.accountHolderName}</HelperText> : null}
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
              {[
                ["Bank Address", bankAddressLine1, setBankAddressLine1, "bankAddressLine1"],
                ["Bank Address Line 2", bankAddressLine2, setBankAddressLine2, null],
                ["Bank City", bankCity, setBankCity, "bankCity"],
              ].map(([label, value, setter, errorKey]) => (
                <View style={styles.section} key={label}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput
                    dense
                    value={value}
                    onChangeText={(text) => {
                      setter(text);
                      if (errorKey && text.trim()) setErrors((current) => ({ ...current, [errorKey]: "" }));
                    }}
                    placeholder={label}
                    mode="outlined"
                    style={styles.inputStyle}
                    error={errorKey ? !!errors[errorKey] : false}
                  />
                  {errorKey && errors[errorKey] ? <HelperText type="error">{errors[errorKey]}</HelperText> : null}
                </View>
              ))}
              <View style={styles.section}>
                <StatePickerModal
                  label="Bank State"
                  value={bankState}
                  error={errors.bankState}
                  onChange={(value) => {
                    setBankState(getStateCode(value));
                    if (value) {
                      setErrors((current) => ({ ...current, bankState: "" }));
                    }
                  }}
                />
                {!!errors.bankState && (
                  <HelperText type="error">{errors.bankState}</HelperText>
                )}
              </View>
              <View style={styles.section}>
                <Text style={styles.inputLabel}>Bank Postal Code</Text>
                <TextInput
                  dense
                  value={bankPostal}
                  onChangeText={(text) => {
                    setBankPostal(text);
                    if (text.trim()) {
                      setErrors((current) => ({ ...current, bankPostal: "" }));
                    }
                  }}
                  placeholder="Bank Postal Code"
                  mode="outlined"
                  style={styles.inputStyle}
                  error={!!errors.bankPostal}
                />
                {!!errors.bankPostal && (
                  <HelperText type="error">{errors.bankPostal}</HelperText>
                )}
              </View>
              </View>
              {/* Remittance Email */}
              <View style={[styles.section, !requiresQrCode && { display: "none" }]}>
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
              <View style={[styles.section, !requiresQrCode && { display: "none" }]}>
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
              <View style={[styles.section, !requiresBankDetails && { display: "none" }]}>
                <Text style={styles.inputLabel}>SWIFT Code (Optional)</Text>
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
              <View style={[styles.section, !requiresBankDetails && { display: "none" }]}>
                <Text style={styles.inputLabel}>IBAN (Optional)</Text>
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
            <Text style={styles.continueButtonText}>
              {isOnboardingFlow ? "Save Payment Details" : "Continue"}
            </Text>
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
