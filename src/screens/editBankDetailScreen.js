import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator as NativeIndicator,
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
import { useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dropdown } from "react-native-element-dropdown";
import { AppColor, Mulish400, Mulish700 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import StatePickerModal from "../components/StatePickerModal";
import { getStateCode } from "../utils/usStates";
import {
  bankAccountTypeList,
  bankPaymentMethodList,
  bankCurrencyList,
  emailRegex,
  addressRegex,
  addressStateRegex,
  addressPostalCodeRegex,
} from "../utils/constants";
import { addBankDetail_API, getBankDetail_API, uploadImage_API } from "../api/appAPI";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { setBankStatus } from "../redux/slices/userSlice";

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

const validateAddressLine1 = (value) => {
  if (!value.trim()) return "Address Line 1 is required";
  if (!addressRegex.test(value)) {
    return "Address must contain only letters, numbers, and basic punctuation.";
  }
  return "";
};

const validateAddressLine2 = (value) => {
  // if (!value.trim()) return "Address Line 2 is required";
  if (!addressRegex.test(value)) {
    return "Address must contain only letters, numbers, and basic punctuation.";
  }
  return "";
};

const validateCity = (value) => {
  if (!value.trim()) return "City is required";
  if (!addressRegex.test(value)) {
    return "City must contain only letters, numbers, and basic punctuation.";
  }
  return "";
};

const validateState = (value) => {
  if (!value.trim()) return "State is required";
  if (!addressStateRegex.test(value)) {
    return "State value is not valid";
  }
  return "";
};

const validatePostalcode = (value) => {
  if (!value.trim()) return "Postal code is required";
  if (!addressPostalCodeRegex.test(value)) {
    return "Postal Code is not valid";
  }
  return "";
};

const maskAccountNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

const isMaskedAccountNumber = (value) => /^\*+\d{4}$/.test(String(value || ""));

const EditBankDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [bankData, setBankData] = useState(null);
  const [savedAccountNumber, setSavedAccountNumber] = useState("");
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
  const [paymentQrCodeUrl, setPaymentQrCodeUrl] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const requiresBankDetails = ["ACH", "CHECK"].includes(selectedPaymentMethod);
  const requiresQrCode = ["CASHAPP", "PAYPAL", "VENMO"].includes(selectedPaymentMethod);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

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
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const handleContinueBtnPress = async () => {
    // Validate all required fields
    const newErrors = {
      accountHolderName: validateAccountHolderName(accountHolderName),
      bankName: requiresBankDetails ? validateBankName(bankName) : "",
      accountNumber: requiresBankDetails ? validateAccountNumber(accountNumber) : "",
      routingNumber: requiresBankDetails && !validateRoutingNumber(routingNumber) ? "Routing number is required" : "",
      accountType: requiresBankDetails ? validateAccountType(selectedAccountType) : "",
      remittanceEmail: validateRemittanceEmail(remittanceEmail),
      // swiftCode: validateSwiftCode(swiftCode),
      // iban: validateIban(iban),
      currency: validateCurrency(selectedCurrency),
      paymentMethod: validatePaymentMethod(selectedPaymentMethod),
      addressLine1: requiresBankDetails ? validateAddressLine1(addressLine1) : "",
      addressLine2: validateAddressLine2(addressLine2),
      city: requiresBankDetails ? validateCity(city) : "",
      state: requiresBankDetails ? validateState(state) : "",
      postalCode: requiresBankDetails ? validatePostalcode(postalCode) : "",
      paymentQrCodeUrl: requiresQrCode && !paymentQrCodeUrl ? "QR code is required" : "",
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
        bankName: requiresBankDetails ? bankName : "",
        accountNumber: requiresBankDetails && isMaskedAccountNumber(accountNumber)
          ? savedAccountNumber
          : requiresBankDetails ? accountNumber : "",
        routingNumber: requiresBankDetails ? routingNumber : "",
        accountType: requiresBankDetails ? selectedAccountType : "",
        remittanceEmail,
        // swiftCode,
        // iban,
        currency: selectedCurrency,
        paymentMethod: selectedPaymentMethod,
        paymentQrCodeUrl: requiresQrCode ? paymentQrCodeUrl : "",
        bankAddressLine1: requiresBankDetails ? addressLine1 : "",
        bankAddressLine2: requiresBankDetails ? addressLine2 : "",
        bankCity: requiresBankDetails ? city : "",
        bankState: requiresBankDetails ? state : "",
        bankPostal: requiresBankDetails ? postalCode : "",
      };
      const response = await addBankDetail_API(payload);
      console.log("response => ", response);
      if (response?.success && response?.data) {
        setBankData(response?.data?.bankDetail);
        dispatch(setBankStatus(true));
        dispatch(
          showSnackbar({
            message: "Bank detail updated successfully",
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

  const setAPIDataToLocalState = (data = null) => {
    setBankData(data); // keep original data
    setSavedAccountNumber(data?.accountNumber || "");
    setAccountHolderName(data?.accountHolderName || "");
    setBankName(data?.bankName || "");
    setAccountNumber(maskAccountNumber(data?.accountNumber || ""));
    setRoutingNumber(data?.routingNumber || "");
    setSelectedAccountType(data?.accountType || "");
    setRemittanceEmail(data?.remittanceEmail || "");
    setSwiftCode(data?.swiftCode || "");
    setIban(data?.iban || "");
    setSelectedCurrency(data?.currency || "");
    setSelectedPaymentMethod(data?.paymentMethod || "");
    setPaymentQrCodeUrl(data?.paymentQrCodeUrl || "");
    setAddressLine1(data?.bankAddressLine1 || "");
    setAddressLine2(data?.bankAddressLine2 || "");
    setCity(data?.bankCity || "");
    setState(getStateCode(data?.bankState || ""));
    setPostalCode(data?.bankPostal || "");
  };

  const uploadPaymentQrCode = async () => {
    try {
      const image = await ImagePicker.openPicker({ mediaType: "photo", cropping: false });
      setUploadingQr(true);
      const formData = new FormData();
      formData.append("file", { uri: image.path, name: image.path.split("/").pop() || `payment-qr-${Date.now()}.jpg`, type: image.mime || "image/jpeg" });
      const response = await uploadImage_API(formData);
      const url = response?.data?.file;
      if (!response?.success || !url) throw new Error("QR upload failed");
      setPaymentQrCodeUrl(url);
      setErrors((current) => ({ ...current, paymentQrCodeUrl: "" }));
    } catch (error) {
      if (!String(error?.message || error).toLowerCase().includes("cancel")) Alert.alert("Upload failed", "Could not upload the payment QR code.");
    } finally {
      setUploadingQr(false);
    }
  };

  const getBankDetailFromAPI = async () => {
    setDataLoading(true);
    try {
      const response = await getBankDetail_API();
      console.log("response => ", response);
      if (response?.success && response?.data) {
        setAPIDataToLocalState(response?.data?.bankDetail);
        if (response?.data?.bankDetail) {
          dispatch(setBankStatus(true));
        } else {
          dispatch(setBankStatus(false));
        }
      }
    } catch (error) {
      console.log("bank data fetch error => ", error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    getBankDetailFromAPI();
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
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text
          style={{
            fontSize: 19.78,
            fontFamily: Mulish700,
            color: AppColor.black,
          }}
        >
          {"Bank Account Info"}
        </Text>
        <IconButton
          icon="pencil"
          iconColor={AppColor.black}
          size={24}
          style={{ opacity: 0 }}
          disabled={true}
        />
      </View>

      {dataLoading ? (
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
                        <Text style={styles.continueButtonText}>{uploadingQr ? "Uploading…" : paymentQrCodeUrl ? "Replace QR Code" : "Upload QR Code"}</Text>
                      </TouchableOpacity>
                      {paymentQrCodeUrl ? <HelperText type="info">QR code uploaded</HelperText> : null}
                      {!!errors.paymentQrCodeUrl && <HelperText type="error">{errors.paymentQrCodeUrl}</HelperText>}
                    </View>
                  ) : null}
                  {/* Account Holder Name */}
                  <View style={styles.section}>
                    <Text style={styles.inputLabel}>
                      {"Account Holder Name"}
                    </Text>
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

                  {requiresBankDetails ? <>
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
                    <Text style={styles.inputLabel}>
                      {"Routing Number (ABA)"}
                    </Text>
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
                  {/* <View style={styles.section}>
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
                  </View> */}

                  {/* IBAN */}
                  {/* <View style={styles.section}>
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
                  </View> */}

                  {/* Divider with address title */}
                  <View
                    style={[
                      styles.section,
                      { flexDirection: "row", alignItems: "center" },
                    ]}
                  >
                    <Divider style={{ flex: 1 }} />
                    <Text
                      style={{
                        marginHorizontal: 16,
                        fontSize: 18,
                        fontFamily: Mulish700,
                        color: AppColor.gray,
                      }}
                    >
                      {"Bank Address"}
                    </Text>
                    <Divider style={{ flex: 1 }} />
                  </View>

                  {/* Address Line 1 */}
                  <View style={styles.section}>
                    <Text style={styles.inputLabel}>{"Address Line 1"}</Text>
                    <TextInput
                      dense
                      value={addressLine1}
                      onChangeText={(text) => {
                        setAddressLine1(text);
                        if (!validateAddressLine1(text)) {
                          setErrors((prev) => ({
                            ...prev,
                            addressLine1: "",
                          }));
                        }
                      }}
                      style={styles.inputStyle}
                      contentStyle={styles.inputText}
                      placeholder="Enter Address Line 1"
                      placeholderTextColor={AppColor.placeholderTextColor}
                      mode="outlined"
                      error={!!errors.addressLine1}
                      outlineColor={AppColor.border}
                      activeOutlineColor={AppColor.primary}
                      outlineStyle={{ borderRadius: 8 }}
                      autoCapitalize="sentences"
                      theme={{ colors: { onSurfaceVariant: "#777" } }}
                    />
                    {!!errors.addressLine1 && (
                      <HelperText
                        type="error"
                        visible={!!errors.addressLine1}
                        style={styles.helper}
                      >
                        {errors.addressLine1}
                      </HelperText>
                    )}
                  </View>

                  {/* Address Line 2 */}
                  <View style={styles.section}>
                    <Text style={styles.inputLabel}>{"Address Line 2"}</Text>
                    <TextInput
                      dense
                      value={addressLine2}
                      onChangeText={(text) => {
                        setAddressLine2(text);
                        if (!validateAddressLine2(text)) {
                          setErrors((prev) => ({
                            ...prev,
                            addressLine2: "",
                          }));
                        }
                      }}
                      style={styles.inputStyle}
                      contentStyle={styles.inputText}
                      placeholder="Enter Address Line 2"
                      placeholderTextColor={AppColor.placeholderTextColor}
                      mode="outlined"
                      error={!!errors.addressLine2}
                      outlineColor={AppColor.border}
                      activeOutlineColor={AppColor.primary}
                      outlineStyle={{ borderRadius: 8 }}
                      autoCapitalize="sentences"
                      theme={{ colors: { onSurfaceVariant: "#777" } }}
                    />
                    {!!errors.addressLine2 && (
                      <HelperText
                        type="error"
                        visible={!!errors.addressLine2}
                        style={styles.helper}
                      >
                        {errors.addressLine2}
                      </HelperText>
                    )}
                  </View>

                  {/* City */}
                  <View style={styles.section}>
                    <Text style={styles.inputLabel}>{"City"}</Text>
                    <TextInput
                      dense
                      value={city}
                      onChangeText={(text) => {
                        setCity(text);
                        if (!validateCity(text)) {
                          setErrors((prev) => ({
                            ...prev,
                            city: "",
                          }));
                        }
                      }}
                      style={styles.inputStyle}
                      contentStyle={styles.inputText}
                      placeholder="Enter City"
                      placeholderTextColor={AppColor.placeholderTextColor}
                      mode="outlined"
                      error={!!errors.city}
                      outlineColor={AppColor.border}
                      activeOutlineColor={AppColor.primary}
                      outlineStyle={{ borderRadius: 8 }}
                      autoCapitalize="sentences"
                      theme={{ colors: { onSurfaceVariant: "#777" } }}
                    />
                    {!!errors.city && (
                      <HelperText
                        type="error"
                        visible={!!errors.city}
                        style={styles.helper}
                      >
                        {errors.city}
                      </HelperText>
                    )}
                  </View>

                  {/* State */}
                  <View style={styles.section}>
                    <StatePickerModal
                      label="State"
                      value={state}
                      error={!!errors.state}
                      onChange={(value) => {
                        setState(value);
                        setErrors((prev) => ({
                          ...prev,
                          state: "",
                        }));
                      }}
                    />
                    {!!errors.state && (
                      <HelperText
                        type="error"
                        visible={!!errors.state}
                        style={styles.helper}
                      >
                        {errors.state}
                      </HelperText>
                    )}
                  </View>

                  {/* Postal Code */}
                  <View style={styles.section}>
                    <Text style={styles.inputLabel}>{"Postal Code"}</Text>
                    <TextInput
                      dense
                      value={postalCode}
                      onChangeText={(text) => {
                        setPostalCode(text);
                        if (!validatePostalcode(text)) {
                          setErrors((prev) => ({
                            ...prev,
                            postalCode: "",
                          }));
                        }
                      }}
                      style={styles.inputStyle}
                      contentStyle={styles.inputText}
                      placeholder="Enter Postal Code"
                      placeholderTextColor={AppColor.placeholderTextColor}
                      mode="outlined"
                      error={!!errors.postalCode}
                      outlineColor={AppColor.border}
                      activeOutlineColor={AppColor.primary}
                      outlineStyle={{ borderRadius: 8 }}
                      autoCapitalize="sentences"
                      maxLength={6}
                      theme={{ colors: { onSurfaceVariant: "#777" } }}
                    />
                    {!!errors.postalCode && (
                      <HelperText
                        type="error"
                        visible={!!errors.postalCode}
                        style={styles.helper}
                      >
                        {errors.postalCode}
                      </HelperText>
                    )}
                  </View>
                  </> : null}
                </View>
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

export default EditBankDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
