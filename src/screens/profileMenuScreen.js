import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator as NativeIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import FastImage from "@d11/react-native-fast-image";
import Entypo from "react-native-vector-icons/Entypo";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getVersion, getBuildNumber } from "react-native-device-info";
import Modal from "react-native-modal";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import { onSignOut } from "../redux/slices/authSlice";
import { clearUserSlice } from "../redux/slices/userSlice";
import { clearFoodTruckProfileSlice } from "../redux/slices/foodTruckProfileSlice";
import StatusBarManager from "../components/StatusBarManager";
import {
  PROFILE_MENU_IMAGES,
  passwordRegex,
  vendorProfileStatus,
} from "../utils/constants";
import {
  ActivityIndicator,
  HelperText,
  Snackbar,
  TextInput,
} from "react-native-paper";
import { updatePassword_API } from "../api/authAPI";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { checkInstallationId } from "../helpers/notification.helper";
import { deleteAccount_API, removeFcmToken_API } from "../api/appAPI";
import { clearPushNotificationRedux } from "../redux/slices/pushNotificationSlice";
import AppImage from "../components/AppImage";
import { updateUserKey } from "../redux/slices/userInfoSlice";

const ItemComponent = ({ imageUri, label, rightIcon, isRed, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={styles.componentContainer}
  >
    <FastImage
      source={imageUri}
      resizeMode="cover"
      style={styles.componentImage}
    />
    <Text
      style={[
        styles.componentLabel,
        { color: isRed ? AppColor.red : AppColor.black },
      ]}
    >
      {label}
    </Text>
    {rightIcon ? (
      <Entypo name="chevron-small-right" size={24} color={AppColor.black} />
    ) : null}
  </TouchableOpacity>
);

const HR = () => <View style={styles.HR} />;

const SignoutModal = ({
  isModalVisible,
  signoutModalLoading,
  onYesSignoutPress,
  onNoSignoutPress,
}) => (
  <Modal
    isVisible={isModalVisible}
    backdropOpacity={0.5}
    useNativeDriverForBackdrop={true}
    useNativeDriver={true}
    hideModalContentWhileAnimating={true}
    statusBarTranslucent={true}
  >
    <View style={styles.modalContainer}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={{ position: "absolute", top: 10, right: 10 }}
        onPress={onNoSignoutPress}
      >
        <Ionicons
          name="close-circle-sharp"
          size={32}
          color={AppColor.primary}
        />
      </TouchableOpacity>
      <Text style={styles.modalTitle}>{"Sign out"}</Text>
      <Text style={styles.modalSubtitle}>
        {"Are you sure you want to sign out?"}
      </Text>
      <TouchableOpacity
        style={styles.signoutModalBtnYes}
        activeOpacity={0.7}
        onPress={onYesSignoutPress}
        disabled={signoutModalLoading}
      >
        {signoutModalLoading ? (
          <ActivityIndicator color={AppColor.white} />
        ) : (
          <Text style={styles.signoutModalBtnText}>{"Yes"}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.signoutModalBtnNo}
        activeOpacity={0.7}
        onPress={onNoSignoutPress}
      >
        <Text style={[styles.signoutModalBtnText, { color: AppColor.primary }]}>
          {"No"}
        </Text>
      </TouchableOpacity>
    </View>
  </Modal>
);

const ChangePWDModal = ({
  isModalVisible,
  onUpdatePress,
  onCancelPress,
  snackbarPWD,
  setSnackbarPWD,
}) => {
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [cnfrmPassword, setCnfrmPassword] = useState("");
  const [cnfrmPasswordError, setCnfrmPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetStates = () => {
    setPassword("");
    setPasswordError("");
    setPasswordVisible(false);
    setNewPassword("");
    setNewPasswordError("");
    setNewPasswordVisible(false);
    setCnfrmPassword("");
    setCnfrmPasswordError("");
  };

  const togglePasswordVisibility = (type) => {
    switch (type) {
      case "current":
        setPasswordVisible(!passwordVisible);
        break;
      case "new":
        setNewPasswordVisible(!newPasswordVisible);
        break;
      default:
        break;
    }
  };

  const validatePassword = (password) => {
    return passwordRegex?.test(password);
  };

  const onValidateBtnPress = async () => {
    const validatePasswordOnSubmit = (value, cnfrm = false) => {
      if (!passwordRegex.test(value)) {
        return "Password must be 8–15 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char.";
      }
      if (cnfrm) {
        if (newPassword !== cnfrmPassword) {
          return "Passwords do not match.";
        }
      }
      return "";
    };

    const pwdErr = validatePasswordOnSubmit(password);
    const newPwdErr = validatePasswordOnSubmit(newPassword);
    const cnfrmPwdErr = validatePasswordOnSubmit(cnfrmPassword, true);

    setPasswordError(pwdErr);
    setNewPasswordError(newPwdErr);
    setCnfrmPasswordError(cnfrmPwdErr);

    if (!!pwdErr || !!newPwdErr || !!cnfrmPwdErr) return;

    onUpdatePress({
      payload: {
        currentPassword: password,
        newPassword: cnfrmPassword,
      },
      setLoading,
    });
  };

  useEffect(() => {
    setTimeout(() => {
      resetStates();
    }, 500);
  }, [isModalVisible]);

  return (
    <Modal
      isVisible={isModalVisible}
      backdropOpacity={0.5}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={{ position: "absolute", top: 10, right: 10 }}
          onPress={onCancelPress}
          disabled={loading}
        >
          <Ionicons
            name="close-circle-sharp"
            size={32}
            color={AppColor.primary}
          />
        </TouchableOpacity>

        <Text style={styles.modalTitle}>{"Change Password"}</Text>

        <View>
          {/* Current Password */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>
            {"Current Password"}
          </Text>
          <TextInput
            dense
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (validatePassword(text)) {
                setPasswordError("");
              }
            }}
            style={styles.input}
            contentStyle={styles.inputText}
            placeholder=""
            placeholderTextColor={AppColor.placeholderTextColor}
            mode="outlined"
            autoCapitalize="none"
            error={!!passwordError}
            secureTextEntry={!passwordVisible}
            outlineColor={AppColor.border}
            activeOutlineColor={AppColor.primary}
            outlineStyle={{ borderRadius: 8 }}
            right={
              <TextInput.Icon
                icon={passwordVisible ? "eye-off" : "eye"}
                onPress={() => togglePasswordVisibility("current")}
                color={AppColor.textHighlighter}
                forceTextInputFocus={false}
              />
            }
            theme={{ colors: { onSurfaceVariant: "#777" } }}
          />

          {/* New Password */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>
            {"New Password"}
          </Text>
          <TextInput
            dense
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (validatePassword(text)) {
                setNewPasswordError("");
              }
            }}
            style={styles.input}
            contentStyle={styles.inputText}
            placeholder=""
            placeholderTextColor={AppColor.placeholderTextColor}
            mode="outlined"
            autoCapitalize="sentences"
            error={!!newPasswordError}
            secureTextEntry={!newPasswordVisible}
            outlineColor={AppColor.border}
            activeOutlineColor={AppColor.primary}
            outlineStyle={{ borderRadius: 8 }}
            right={
              <TextInput.Icon
                icon={newPasswordVisible ? "eye-off" : "eye"}
                onPress={() => togglePasswordVisibility("new")}
                color={AppColor.textHighlighter}
                forceTextInputFocus={false}
              />
            }
            theme={{ colors: { onSurfaceVariant: "#777" } }}
          />

          {/* Confirm Password */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>
            {"Confirm Password"}
          </Text>
          <TextInput
            dense
            value={cnfrmPassword}
            onChangeText={(text) => {
              setCnfrmPassword(text);
              if (validatePassword(text) && newPassword === text) {
                setCnfrmPasswordError("");
              }
            }}
            style={styles.input}
            contentStyle={styles.inputText}
            placeholder=""
            placeholderTextColor={AppColor.placeholderTextColor}
            mode="outlined"
            autoCapitalize="sentences"
            error={!!cnfrmPasswordError}
            secureTextEntry={!newPasswordVisible}
            outlineColor={AppColor.border}
            activeOutlineColor={AppColor.primary}
            outlineStyle={{ borderRadius: 8 }}
            right={
              <TextInput.Icon
                icon={newPasswordVisible ? "eye-off" : "eye"}
                onPress={() => togglePasswordVisibility("new")}
                color={AppColor.textHighlighter}
                forceTextInputFocus={false}
              />
            }
            theme={{ colors: { onSurfaceVariant: "#777" } }}
          />

          {!!passwordError || !!newPasswordError || !!cnfrmPasswordError ? (
            <HelperText
              type="error"
              visible={
                !!passwordError || !!newPasswordError || !!cnfrmPasswordError
              }
              style={styles.helper}
            >
              {passwordError || newPasswordError || cnfrmPasswordError}
            </HelperText>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.signoutModalBtnYes, { marginTop: 30 }]}
          activeOpacity={0.7}
          onPress={onValidateBtnPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={AppColor.white} />
          ) : (
            <Text style={styles.signoutModalBtnText}>{"Update"}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signoutModalBtnNo}
          activeOpacity={0.7}
          onPress={onCancelPress}
          disabled={loading}
        >
          <Text
            style={[styles.signoutModalBtnText, { color: AppColor.primary }]}
          >
            {"Cancel"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* SnackBar */}
      <Snackbar
        visible={snackbarPWD.visible}
        onDismiss={() => setSnackbarPWD({ ...snackbarPWD, visible: false })}
        duration={4000}
        style={{
          backgroundColor:
            snackbarPWD.type === "success"
              ? AppColor.snackbarSuccess
              : snackbarPWD.type === "error"
                ? AppColor.snackbarError
                : AppColor.snackbarDefault,
        }}
      >
        {snackbarPWD.message}
      </Snackbar>
    </Modal>
  );
};

const ProfileMenuScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user, bankStatus, profileStatus } = useSelector(
    (state) => state.userReducer
  );
  const [signoutModalVisible, setSignoutModalVisible] = useState(false);
  const [signoutModalLoading, setSignoutModalLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [changePWDModalVisible, setChangePWDModalVisible] = useState(false);
  const [snackbarPWD, setSnackbarPWD] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const handleSignOut = async () => {
    setSignoutModalLoading(true);
    try {
      const deviceId = await checkInstallationId();
      if (!deviceId) return;
      const response = await removeFcmToken_API(deviceId);
      console.log("response => ", response);
    } catch (error) {
      console.log("error => ", error);
    }

    setSignoutModalVisible(false);
    setSignoutModalLoading(false);

    setTimeout(() => {
      dispatch(clearUserSlice());
      dispatch(clearFoodTruckProfileSlice());
      dispatch(onSignOut());
      dispatch(clearPushNotificationRedux());
    }, 350);
  };

  const handleChangePassword = async ({ payload, setLoading }) => {
    try {
      setLoading(true);
      const user_id = user._id;
      const response = await updatePassword_API(payload, user_id);
      if (response?.success) {
        setChangePWDModalVisible(false);
        dispatch(showSnackbar({ message: response.message, type: "success" }));

        dispatch(
          updateUserKey({
            emailid: user.email,
            keyName: "password",
            keyValue: payload.newPassword,
          })
        );
      }
    } catch (error) {
      console.log("Error => ", error);
      setSnackbarPWD({
        visible: true,
        message: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action is permanent and cannot be reversed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleteAccountLoading(true);
            try {
              const response = await deleteAccount_API();
              console.log("response => ", response);
              if (response?.success && response?.data) {
                navigation.navigate("deleteOtpVerification", {
                  verificationFor: "delete-account",
                  data: { ...response.data, user: { email: user?.email } },
                  nextScreen: "",
                });
              }
            } catch (error) {
              console.log("error => ", error);
            } finally {
              setDeleteAccountLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleHelpSupportPress = async () => {
    const supportEmail = "support@roundthecorner.com";
    const subject = "RTC - Vendor";
    const body = `Hello,\n\nCan you please help me?\n\n\n\n\n\nBest regards,\n${user?.firstName} ${user?.lastName}\n${user?.email}`;

    const url = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.log("Error opening email app:", error);
      Alert.alert("Error", "Failed to open email app");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderColor: AppColor.border,
          backgroundColor: AppColor.white,
        }}
      >
        <Text
          style={{
            fontSize: 19.78,
            fontFamily: Mulish700,
            color: AppColor.black,
          }}
        >
          {"Profile"}
        </Text>
      </View>

      {/* Main Container */}
      <ScrollView
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Profile Info */}
        <View
          style={{
            backgroundColor: AppColor.white,
            paddingBottom: 16,
          }}
        >
          {/* Cover Image */}
          {user?.foodTruck?.photos[0] ? (
            <AppImage
              uri={user?.foodTruck?.photos[0]}
              containerStyle={{ height: 143, width: "100%", borderRadius: 0 }}
            />
          ) : (
            <View
              style={{
                height: 143,
                width: "100%",
                backgroundColor: "#F9FAFB",
              }}
            />
          )}
          {/* Circle Logo */}
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              marginTop: -52,
            }}
          >
            <AppImage
              uri={user?.foodTruck?.logo}
              containerStyle={{ height: 104, width: 104, borderRadius: 52 }}
            />
          </View>
          {/* Food Truck Name */}
          <Text
            style={{
              fontSize: 18,
              fontFamily: Mulish700,
              color: AppColor.black,
              textAlign: "center",
              marginVertical: 2,
            }}
          >
            {user?.foodTruck?.name}
          </Text>
          {/* Cuisines List */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 10,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.reatingContainer}
              onPress={() => navigation.navigate("rateReviewScreen")}
            >
              <View style={styles.iconContainer}>
                <FontAwesome name="star" size={14} color={AppColor.yellow} />
              </View>
              <Text
                style={styles.ratingText}
              >{`${user?.foodTruck?.avgRate || 0} (${user?.foodTruck?.totalReviews || 0} reviews)`}</Text>
            </TouchableOpacity>
            <View
              style={{
                width: 1,
                height: 18,
                marginHorizontal: 10,
                backgroundColor: "#9A9FAC",
              }}
            />
            <View>
              <FlatList
                horizontal
                bounces={false}
                showsHorizontalScrollIndicator={false}
                data={user?.foodTruck?.cuisine?.slice(0, 2)}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                ItemSeparatorComponent={() => (
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: Mulish400,
                      color: AppColor.black,
                    }}
                  >
                    {", "}
                  </Text>
                )}
                renderItem={({ item, index }) => (
                  <Text
                    key={index}
                    style={{
                      fontSize: 12,
                      fontFamily: Mulish400,
                      color: AppColor.black,
                    }}
                  >
                    {item.name}
                  </Text>
                )}
                ListFooterComponent={() =>
                  user?.foodTruck?.cuisine?.length > 2 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: Mulish400,
                        color: AppColor.black,
                      }}
                    >
                      {" & more"}
                    </Text>
                  ) : null
                }
              />
            </View>
          </View>
          {/* Category */}
          <Text
            style={{
              fontFamily: Mulish400,
              fontSize: 14,
              color: AppColor.black,
              textAlign: "center",
              marginTop: 10,
            }}
          >
            {user?.foodTruck?.infoType === "caterer"
              ? "Food Caterer"
              : "Food Truck"}
          </Text>
        </View>

        {/* Menu List */}
        <View
          style={{
            backgroundColor: AppColor.white,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: "#E5E5EA",
            paddingHorizontal: 19,
            paddingVertical: 5,
            margin: 16,
          }}
        >
          <ItemComponent
            rightIcon
            label="Your Profile"
            imageUri={PROFILE_MENU_IMAGES.yourProfile}
            onPress={() => navigation.navigate("userProfileScreen")}
          />
          <HR />
          <ItemComponent
            rightIcon
            label="Serving Locations"
            imageUri={PROFILE_MENU_IMAGES.servingLocations}
            onPress={() => navigation.navigate("profileServingLocationScreen")}
          />
          <HR />
          <ItemComponent
            rightIcon
            label="Cuisines"
            imageUri={PROFILE_MENU_IMAGES.cuisine}
            onPress={() => navigation.navigate("profileSelectCuisineScreen")}
          />
          <HR />
          <ItemComponent
            rightIcon
            label="Business Hours"
            imageUri={PROFILE_MENU_IMAGES.manageBusinessHours}
            onPress={() => navigation.navigate("profileSetBusinessHoursScreen")}
          />
          <HR />
          <ItemComponent
            rightIcon
            label="Pre-Order Availability"
            imageUri={PROFILE_MENU_IMAGES.manageAvailability}
            onPress={() => navigation.navigate("profileAvailabilityScreen")}
          />
          <HR />
          {(bankStatus || profileStatus === vendorProfileStatus.approved) && (
            <>
              <ItemComponent
                rightIcon
                label="Bank Detail"
                imageUri={PROFILE_MENU_IMAGES.bankDetail}
                onPress={() => navigation.navigate("editBankDetailScreen")}
              />
              <HR />
            </>
          )}
          <ItemComponent
            rightIcon
            label="Subscription"
            imageUri={PROFILE_MENU_IMAGES.subscription}
            onPress={() => navigation.navigate("profileSubscriptionScreen")}
          />
          <HR />
          <ItemComponent
            rightIcon
            label="Change Password"
            imageUri={PROFILE_MENU_IMAGES.changePassword}
            onPress={() => setChangePWDModalVisible(true)}
          />
          <HR />
          <ItemComponent
            rightIcon
            label="Help & Support"
            imageUri={PROFILE_MENU_IMAGES.helpSupportTC}
            onPress={handleHelpSupportPress}
          />
          <HR />
          <ItemComponent
            rightIcon
            label="Terms of Service"
            imageUri={PROFILE_MENU_IMAGES.helpSupportTC}
            onPress={() => navigation.navigate("appTermsOfServiceScreen")}
          />
          <HR />
          <ItemComponent
            label="Sign out"
            imageUri={PROFILE_MENU_IMAGES.logout}
            onPress={() => setSignoutModalVisible(true)}
          />
          <HR />
          <ItemComponent
            isRed
            label="Delete Account"
            imageUri={PROFILE_MENU_IMAGES.deleteAccount}
            onPress={handleDeleteAccountPress}
          />
        </View>

        <View
          style={{
            marginBottom: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text>{`v${getVersion()} (${getBuildNumber()})`}</Text>
        </View>
      </ScrollView>

      <Modal
        isVisible={deleteAccountLoading}
        backdropOpacity={0.5}
        useNativeDriverForBackdrop={true}
        useNativeDriver={true}
        hideModalContentWhileAnimating={true}
        statusBarTranslucent={true}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <NativeIndicator size="large" color={AppColor.white} />
        </View>
      </Modal>

      {/* Modals */}
      <SignoutModal
        isModalVisible={signoutModalVisible}
        signoutModalLoading={signoutModalLoading}
        onYesSignoutPress={handleSignOut}
        onNoSignoutPress={() => setSignoutModalVisible(false)}
      />

      <ChangePWDModal
        isModalVisible={changePWDModalVisible}
        snackbarPWD={snackbarPWD}
        setSnackbarPWD={setSnackbarPWD}
        onUpdatePress={handleChangePassword}
        onCancelPress={() => setChangePWDModalVisible(false)}
      />
    </View>
  );
};

export default ProfileMenuScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  signInButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
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
  buttonLabel: {
    fontFamily: Mulish400,
    fontSize: 16,
    color: AppColor.white,
  },

  // Component style
  componentContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 10,
  },
  componentImage: { height: 24, width: 24 },
  componentLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: Mulish400,
  },

  // HR
  HR: {
    height: 1,
    backgroundColor: "#E5E5EA",
  },

  // Logout Modal
  modalContainer: {
    backgroundColor: AppColor.white,
    marginHorizontal: "5%",
    paddingVertical: 36,
    paddingHorizontal: 33,
    borderRadius: 24,
  },
  modalTitle: {
    marginBottom: 30,
    fontSize: 22,
    fontFamily: Mulish700,
    color: AppColor.text,
    textAlign: "center",
  },
  modalSubtitle: {
    marginBottom: 20,
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    textAlign: "center",
  },
  signoutModalBtnYes: {
    width: "100%",
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginTop: 15,
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
  signoutModalBtnNo: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  signoutModalBtnText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 16,
  },

  // PWD Modal
  inputLabel: {
    fontSize: 15,
    fontFamily: Mulish400,
    color: AppColor.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColor.white,
  },
  inputText: {
    fontSize: 15,
    fontFamily: Mulish400,
  },
  helper: {
    // marginBottom: 8,
    paddingLeft: 0,
    // paddingTop: 0,
    fontFamily: Mulish400,
  },

  // Rating Container
  reatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  iconContainer: {
    height: 16,
    width: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingText: {
    fontFamily: Mulish400,
    fontSize: 12,
    color: AppColor.black,
  },
});
