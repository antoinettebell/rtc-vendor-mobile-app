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
import { useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dropdown } from "react-native-element-dropdown";
import { AppColor, Mulish400, Mulish700 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import { bankAccountTypeList } from "../utils/constants";
import { addBankDetail_API, getBankDetail_API } from "../api/appAPI";
import { showSnackbar } from "../redux/slices/snackbarSlice";

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

const EditBankDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [bankData, setBankData] = useState(null);
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("");
  const [errors, setErrors] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    accountType: "",
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
      };
      const response = await addBankDetail_API(payload);
      console.log("response => ", response);
      if (response?.success && response?.data) {
        setBankData(response?.data?.bankDetail);
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
    setAccountHolderName(data?.accountHolderName || "");
    setBankName(data?.bankName || "");
    setAccountNumber(data?.accountNumber || "");
    setRoutingNumber(data?.routingNumber || "");
    setSelectedAccountType(data?.accountType || "");
  };

  const getBankDetailFromAPI = async () => {
    setDataLoading(true);
    try {
      const response = await getBankDetail_API();
      console.log("response => ", response);
      if (response?.success && response?.data) {
        setAPIDataToLocalState(response?.data?.bankDetail);
      }
    } catch (error) {
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
