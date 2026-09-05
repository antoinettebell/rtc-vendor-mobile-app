import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AntDesign from "react-native-vector-icons/AntDesign";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import {
	  getUserDetail_API,
	  getEmployeeDashboard_API,
	  updateFoodTruckUnit_API,
  updateFoodTruckUnits_API,
} from "../api/appAPI";
import { Divider, IconButton } from "react-native-paper";
import { setSelectedPlan, setUser, updateFoodTruck } from "../redux/slices/userSlice";
import FastImage from "@d11/react-native-fast-image";
import {
  setSelectedCuisine,
  setSelectedLocations,
} from "../redux/slices/foodTruckProfileSlice";
import {
  formatEIN,
  formatPhoneNumber,
  formatSSN,
  getPhoneDigits,
} from "../helpers/profile.helper";
import { addOrUpdateUser } from "../redux/slices/userInfoSlice";
import AppImage from "../components/AppImage";

const MEDIA_IMAGE_TYPE = {
  INSTAGRAM: require("../assets/images/instagram.png"),
  FACEBOOK: require("../assets/images/facebook.png"),
  TWITTER: require("../assets/images/twitter.png"),
  WEB: require("../assets/images/global.png"),
};

const canUseMultipleTruckUnits = (plan) => {
  const planText = `${plan?.slug || ""} ${plan?.name || ""} ${
    plan?.title || ""
  }`;

  return (
    !!plan?.capabilities?.multipleTruckUnits ||
    plan?.slug === "SUB_ELITE" ||
    /elite/i.test(planText) ||
    Number(plan?.rate) === 5.5
  );
};

const formatEmployeeRate = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : "Not set";
};
const formatShiftHours = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)} hrs` : "0.00 hrs";
};
const SCHEDULE_DAY_LABELS = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};
const formatScheduleTime = (value) => {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};
const compactText = (...parts) =>
  parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
const getEmployeeAddressText = (employee = {}, fallback = {}) => {
  const street = employee.address_line1 || fallback.address_line1;
  const city = employee.address_city || fallback.address_city;
  const state = employee.address_state || fallback.address_state;
  const zip = employee.zip_code || fallback.zip_code || employee.address_zip;
  const cityState = [city, state].filter(Boolean).join(", ");
  const cityStateZip = [cityState, zip].filter(Boolean).join(" ");
  return compactText(street, cityStateZip) || "Not set";
};

const UserProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.userReducer);
  const isEmployeeProfile = !!user?.employee_internal_id;

  const [getUserDetailLoading, setGetUserDetailLoading] = useState(false);
  const [socialMedia, setSocialMedia] = useState([]);
  const [truckSaving, setTruckSaving] = useState(false);
  const [truckNameModal, setTruckNameModal] = useState(null);
  const [truckNameInput, setTruckNameInput] = useState("");
  const [truckPhoneInput, setTruckPhoneInput] = useState("");
  const [employeeDashboard, setEmployeeDashboard] = useState(null);
  const canUseMultipleTrucks = canUseMultipleTruckUnits(
    user?.foodTruck?.plan
  );
  const mainPhoneNumber = formatPhoneNumber(
    `${user?.countryCode || ""}${user?.mobileNumber || ""}`
  );
  const activeTruckUnits = (user?.foodTruck?.truck_units || []).filter(
    (unit) => !unit.is_archived
  );
  const archivedTruckUnits = (user?.foodTruck?.truck_units || []).filter(
    (unit) => unit.is_archived && !unit.is_primary
  );
  const visibleTruckUnits = activeTruckUnits.length
    ? activeTruckUnits
    : [
        {
          _id: null,
          name: user?.foodTruck?.name || "Truck 1",
          is_primary: true,
        },
      ];
  const employeeProfile = employeeDashboard?.employee || {};
  const employeeAddressText = getEmployeeAddressText(employeeProfile, user);
  const employeePhoneText = formatPhoneNumber(
    employeeProfile.phone_number || user?.phone_number || user?.mobileNumber || ""
  );
  const employeeRate =
    employeeProfile.employee_rate !== undefined &&
    employeeProfile.employee_rate !== null
      ? employeeProfile.employee_rate
      : user?.employee_rate;
  const employeeSchedule = employeeDashboard?.employee_schedule || [];

  const updateStateOnDataFetch = (USER_DATA, FOOD_TRUCK_DATA) => {
    setSocialMedia(FOOD_TRUCK_DATA?.socialMedia || []);

    dispatch(setSelectedCuisine(FOOD_TRUCK_DATA?.cuisine));
    dispatch(setSelectedLocations(FOOD_TRUCK_DATA?.locations));
    dispatch(setSelectedPlan(FOOD_TRUCK_DATA?.plan));
  };

  const onSocialLinkPress = async (url) => {
    try {
      // Add https:// if missing
      const processedUrl = url.includes("://") ? url : `https://${url}`;

      const supported = await Linking.canOpenURL(processedUrl);
      if (supported) {
        await Linking.openURL(processedUrl);
      } else {
        Alert.alert("Error", "Invalid URL! Cannot open URL.");
        console.log("Can't open URL:", processedUrl);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open URL");
      console.log("Error opening URL:", error);
    }
  };

  const getUserDetailFromAPI = async () => {
    setGetUserDetailLoading(true);
    try {
      const user_id = user?._id;
      const response = await getUserDetail_API(user_id);
      if (response?.success && response.data) {
        const USER_DATA = response.data.user;
        const FOOD_TRUCK_DATA = response.data.user.foodTruck;

        console.log("response => ", response);

        dispatch(setUser(USER_DATA));
        updateStateOnDataFetch(USER_DATA, FOOD_TRUCK_DATA); // update local states

        dispatch(
          addOrUpdateUser({
            emailid: USER_DATA.email,
            userData: {
              emailid: USER_DATA.email,
              username: FOOD_TRUCK_DATA?.name || "",
              imageUrl: FOOD_TRUCK_DATA.logo || null,
            },
          })
        );
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setGetUserDetailLoading(false);
    }
  };

  const getEmployeeDashboardFromAPI = async () => {
    if (!isEmployeeProfile) return;
    try {
      const response = await getEmployeeDashboard_API();
      if (response?.success && response?.data?.dashboard) {
        setEmployeeDashboard(response.data.dashboard);
      }
    } catch (error) {
      console.log("employee dashboard error => ", error);
    }
  };

  const applyFoodTruckResponse = (response) => {
    const nextFoodTruck = response?.data?.foodtruck;
    if (!nextFoodTruck) return;
    dispatch(updateFoodTruck(nextFoodTruck));
  };

  const openTruckNameModal = (mode, truckUnit = null) => {
    if (mode === "create" && !canUseMultipleTrucks) {
      Alert.alert(
        "Upgrade required",
        "Multiple food trucks are available on the Elite plan."
      );
      return;
    }
    setTruckNameModal({ mode, truckUnit });
    setTruckNameInput(mode === "edit" ? truckUnit?.name || "" : "");
    setTruckPhoneInput(mode === "edit" ? formatPhoneNumber(truckUnit?.phone || "") : "");
  };

  const closeTruckNameModal = () => {
    setTruckNameModal(null);
    setTruckNameInput("");
    setTruckPhoneInput("");
  };

  const createTruckUnit = async () => {
    if (!canUseMultipleTrucks) {
      Alert.alert(
        "Upgrade required",
        "Multiple food trucks are available on the Elite plan."
      );
      return;
    }
    if (!truckNameInput.trim()) {
      Alert.alert("Truck name required", "Enter a truck name.");
      return;
    }

    const phoneDigits = getPhoneDigits(truckPhoneInput);
    if (!phoneDigits) {
      Alert.alert("Phone required", "Enter a phone number for this truck.");
      return;
    }

    setTruckSaving(true);
    try {
      const response = await updateFoodTruckUnits_API({
        foodtruck_id: user?.foodTruck?._id,
        payload: {
          food_truck_count: visibleTruckUnits.length + 1,
          create_name: truckNameInput.trim(),
          phone: phoneDigits,
        },
      });
      applyFoodTruckResponse(response);
      closeTruckNameModal();
    } catch (error) {
      Alert.alert("Truck not saved", error?.message || "Please try again.");
    } finally {
      setTruckSaving(false);
    }
  };

  const renameTruckUnit = async () => {
    if (!truckNameInput.trim() || !truckNameModal?.truckUnit?._id) return;

    const phoneDigits = getPhoneDigits(truckPhoneInput);
    if (!phoneDigits) {
      Alert.alert("Phone required", "Enter a phone number for this truck.");
      return;
    }

    setTruckSaving(true);
    try {
      const response = await updateFoodTruckUnit_API({
        foodtruck_id: user?.foodTruck?._id,
        truck_unit_id: truckNameModal.truckUnit._id,
        payload: {
          name: truckNameInput.trim(),
          phone: phoneDigits,
        },
      });
      applyFoodTruckResponse(response);
      closeTruckNameModal();
    } catch (error) {
      Alert.alert("Truck not saved", error?.message || "Please try again.");
    } finally {
      setTruckSaving(false);
    }
  };

  const archiveTruckUnit = (truckUnit) => {
    Alert.alert(
      "Archive truck?",
      `${truckUnit.name} can be reactivated later from this profile.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            setTruckSaving(true);
            try {
              const response = await updateFoodTruckUnit_API({
                foodtruck_id: user?.foodTruck?._id,
                truck_unit_id: truckUnit._id,
                payload: { is_archived: true },
              });
              applyFoodTruckResponse(response);
            } catch (error) {
              Alert.alert("Truck not archived", error?.message || "Please try again.");
            } finally {
              setTruckSaving(false);
            }
          },
        },
      ]
    );
  };

  const reactivateTruckUnit = async (truckUnit) => {
    setTruckSaving(true);
    try {
      const response = await updateFoodTruckUnits_API({
        foodtruck_id: user?.foodTruck?._id,
        payload: {
          food_truck_count: visibleTruckUnits.length + 1,
          reactivate_truck_unit_id: truckUnit._id,
        },
      });
      applyFoodTruckResponse(response);
    } catch (error) {
      Alert.alert("Truck not reactivated", error?.message || "Please try again.");
    } finally {
      setTruckSaving(false);
    }
  };

  useEffect(() => {
    getUserDetailFromAPI();
    getEmployeeDashboardFromAPI();
  }, []);

  useEffect(() => {
    if (user?.foodTruck?.socialMedia) {
      setSocialMedia(user?.foodTruck?.socialMedia);
    }
  }, [user?.foodTruck?.socialMedia]);

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
          {"Your Profile"}
        </Text>
        <View style={{ width: "20%" }} />
      </View>

      {/* Main Container */}
      {getUserDetailLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: 0,
          }}
        >
          <ActivityIndicator size="large" color={AppColor.primary} />
        </View>
      ) : (
        <ScrollView
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* User Profile Data */}
          <View style={styles.contentContainer}>
            {/* Profile Picture and Name */}
            <View style={styles.profileHeaderContainer}>
              <AppImage
                uri={user?.foodTruck?.logo}
                containerStyle={styles.profileImage}
              />
              <View style={styles.profileInfoContainer}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {user?.foodTruck?.name}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
            </View>

            {/* Edit Button */}
            {!isEmployeeProfile ? (
              <IconButton
                icon="pencil"
                iconColor={AppColor.black}
                size={24}
                onPress={() => navigation.navigate("editProfileScreen")}
                style={{
                  position: "absolute",
                  right: 0,
                  top: -8,
                  overflow: "hidden",
                }}
              />
            ) : null}

            {isEmployeeProfile ? (
              <View style={styles.employeeProfileBox}>
                <View style={styles.employeeProfileHeader}>
                  <View style={styles.accessCodeIconContainer}>
                    <MaterialIcons
                      name="badge"
                      size={22}
                      color={AppColor.primary}
                    />
                  </View>
                  <View style={styles.accessCodeTextContainer}>
                    <Text style={styles.employeeProfileTitle}>
                      Employee Profile
                    </Text>
                    <Text style={styles.accessCodeHelper}>
                      Read-only details set by your employer.
                    </Text>
                  </View>
                </View>

                <View style={styles.employeeProfileGrid}>
                  <View style={styles.employeeProfileRow}>
                    <Text style={styles.employeeProfileLabel}>
                      Tap to Pay Serial Number
                    </Text>
                    <Text style={styles.employeeProfileValue}>
                      {employeeProfile.tap_to_pay_serial_number || "Not assigned"}
                    </Text>
                  </View>
                  <View style={styles.employeeProfileRow}>
                    <Text style={styles.employeeProfileLabel}>Hourly Pay</Text>
                    <Text style={styles.employeeProfileValue}>
                      {formatEmployeeRate(employeeRate)}
                    </Text>
                  </View>
                  <View style={styles.employeeProfileRow}>
                    <Text style={styles.employeeProfileLabel}>Today</Text>
                    <Text style={styles.employeeProfileValue}>
                      {formatShiftHours(
                        employeeDashboard?.shift_summary?.today?.gross_hours_worked
                      )}{" "}
                      with breaks /{" "}
                      {formatShiftHours(
                        employeeDashboard?.shift_summary?.today?.net_hours_worked
                      )}{" "}
                      without
                    </Text>
                  </View>
                  <View style={styles.employeeProfileRow}>
                    <Text style={styles.employeeProfileLabel}>This Week</Text>
                    <Text style={styles.employeeProfileValue}>
                      {formatShiftHours(
                        employeeDashboard?.shift_summary?.week?.gross_hours_worked
                      )}{" "}
                      with breaks /{" "}
                      {formatShiftHours(
                        employeeDashboard?.shift_summary?.week?.net_hours_worked
                      )}{" "}
                      without
                    </Text>
                  </View>
                  <View style={styles.employeeProfileRow}>
                    <Text style={styles.employeeProfileLabel}>Address</Text>
                    <Text style={styles.employeeProfileValue}>
                      {employeeAddressText}
                    </Text>
                  </View>
                  <View style={styles.employeeProfileRow}>
                    <Text style={styles.employeeProfileLabel}>Phone</Text>
                    <Text style={styles.employeeProfileValue}>
                      {employeePhoneText || "Not set"}
                    </Text>
                  </View>
                  <View style={styles.employeeProfileRow}>
                    <Text style={styles.employeeProfileLabel}>Schedule</Text>
                    {employeeSchedule.length ? (
                      employeeSchedule.map((assignment, assignmentIndex) => (
                        <View
                          key={
                            assignment._id ||
                            `${assignment.truck_unit_id}-${assignmentIndex}`
                          }
                          style={styles.employeeScheduleCard}
                        >
                          <Text style={styles.employeeProfileValue}>
                            {assignment.truck_unit_name || "Food truck"}
                          </Text>
                          <Text style={styles.employeeScheduleLocation}>
                            {assignment.location_name || "Assigned location"}
                          </Text>
                          {(assignment.days || [])
                            .filter((day) => day.enabled)
                            .map((day) => (
                              <Text
                                key={day.day}
                                style={styles.employeeScheduleDay}
                              >
                                {SCHEDULE_DAY_LABELS[day.day] || day.day}: {" "}
                                {formatScheduleTime(day.clock_in)} – {" "}
                                {formatScheduleTime(day.clock_out)}
                              </Text>
                            ))}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.employeeProfileValue}>
                        No employee schedule is assigned.
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ) : null}

            {!isEmployeeProfile ? (
              <>
                <View style={styles.truckSection}>
                  <View style={styles.truckSectionHeader}>
                    <View>
                      <Text style={styles.socialMediaTitle}>Food Trucks</Text>
                      <Text style={styles.accessCodeHelper}>
                        {visibleTruckUnits.length} active
                      </Text>
                    </View>
                    {canUseMultipleTrucks ? (
                      <TouchableOpacity
                        onPress={() => openTruckNameModal("create")}
                        disabled={truckSaving}
                        style={styles.truckAddButton}
                      >
                        <Ionicons name="add" size={18} color={AppColor.primary} />
                        <Text style={styles.truckAddText}>Add</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {visibleTruckUnits.map((truck, index) => (
                    <View
                      key={`active-truck-${truck._id || truck.name || index}`}
                      style={styles.truckRow}
                    >
                      <View style={styles.truckTextBlock}>
                        <Text style={styles.itemText} numberOfLines={1}>
                          {truck.name || `Truck ${index + 1}`}
                        </Text>
                        {truck.phone ? (
                          <Text style={styles.truckPhoneText} numberOfLines={1}>
                            {formatPhoneNumber(truck.phone)}
                          </Text>
                        ) : null}
                      </View>
                      {truck.is_primary ? (
                        <Text style={styles.lockedText}>Locked</Text>
                      ) : (
                        <View style={styles.truckActions}>
                          <IconButton
                            icon="pencil"
                            iconColor={AppColor.black}
                            size={18}
                            onPress={() => openTruckNameModal("edit", truck)}
                          />
                          <IconButton
                            icon="archive-outline"
                            iconColor={AppColor.red}
                            size={18}
                            onPress={() => archiveTruckUnit(truck)}
                          />
                        </View>
                      )}
                    </View>
                  ))}

                  {canUseMultipleTrucks
                    ? archivedTruckUnits.map((truck, index) => (
                        <View
                          key={`archived-truck-${truck._id || truck.name || index}`}
                          style={styles.truckRow}
                        >
                          <View style={styles.truckTextBlock}>
                            <Text style={styles.itemText} numberOfLines={1}>
                              {truck.name}
                            </Text>
                            {truck.phone ? (
                              <Text style={styles.truckPhoneText} numberOfLines={1}>
                                {formatPhoneNumber(truck.phone)}
                              </Text>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            onPress={() => reactivateTruckUnit(truck)}
                            disabled={truckSaving}
                            style={styles.reactivateButton}
                          >
                            <Text style={styles.reactivateText}>Reactivate</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    : null}
                </View>

                {socialMedia?.length > 0 && <Divider />}

                {socialMedia?.length > 0 && (
                  <View style={styles.socialMediaContainer}>
                    <Text style={styles.socialMediaTitle}>Social Media</Text>
                    {socialMedia?.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.7}
                        onPress={() => onSocialLinkPress(item.mediaUrl)}
                        style={styles.socialMediaItem}
                      >
                        <FastImage
                          source={MEDIA_IMAGE_TYPE[item.mediaType]}
                          style={styles.socialMediaIcon}
                        />
                        <Text style={styles.socialMediaText} numberOfLines={1}>
                          {item.mediaUrl}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : null}

            {!isEmployeeProfile ? <Divider /> : null}
            {!isEmployeeProfile ? (
            <View style={styles.socialMediaContainer}>
              <Text style={styles.socialMediaTitle}>Mailing Address</Text>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner}>
                  <MaterialIcons
                    name="location-on"
                    size={24}
                    color={AppColor.gray}
                  />
                </View>
                <Text style={styles.itemText}>{user?.addressLine1}</Text>
              </View>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner} />
                <Text style={styles.itemText}>{user?.addressLine2}</Text>
              </View>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner} />
                <Text style={styles.itemText}>{user?.addressCity}</Text>
              </View>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner} />
                <Text style={styles.itemText}>{user?.addressState}</Text>
              </View>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner} />
                <Text style={styles.itemText}>{user?.addressPostal}</Text>
              </View>

              <View style={[styles.itemContainer, { paddingVertical: 0 }]}>
                <View style={styles.itemIconContiner} />
                <Text style={styles.itemText}>{user?.addressCountry}</Text>
              </View>

              <View style={[styles.itemContainer, styles.profileDetailRow]}>
                <View style={styles.itemIconContiner}>
                  <Ionicons name="call-outline" size={24} color={AppColor.gray} />
                </View>
                <Text style={styles.itemText}>
                  Main Phone: {mainPhoneNumber || "N/A"}
                </Text>
              </View>

              <View style={[styles.itemContainer, styles.profileDetailRow]}>
                <View style={styles.itemIconContiner}>
                  {user?.foodTruck?.ein ? (
                    <AntDesign name="idcard" size={24} color={AppColor.gray} />
                  ) : (
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={24}
                      color={AppColor.gray}
                    />
                  )}
                </View>
                <Text style={styles.itemText}>
                  {user?.foodTruck?.ein
                    ? `EIN: ${formatEIN(user?.foodTruck?.ein || "") || "N/A"}`
                    : `SSN: ${formatSSN(user?.foodTruck?.ssn || "") || "N/A"}`}
                </Text>
              </View>

              {/* Edit Button */}
              <IconButton
                icon="pencil"
                iconColor={AppColor.black}
                size={24}
                onPress={() => navigation.navigate("editMailingAddressScreen")}
                style={{
                  position: "absolute",
                  right: -16,
                  top: 0,
                  overflow: "hidden",
                }}
              />
            </View>
            ) : null}
          </View>
        </ScrollView>
      )}
      <Modal transparent visible={!!truckNameModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.socialMediaTitle}>
              {truckNameModal?.mode === "edit" ? "Rename Truck" : "New Truck"}
            </Text>
            <TextInput
              value={truckNameInput}
              onChangeText={setTruckNameInput}
              placeholder="Truck name"
              style={styles.truckNameInput}
            />
            <TextInput
              value={truckPhoneInput}
              onChangeText={(text) => setTruckPhoneInput(formatPhoneNumber(text))}
              placeholder="Phone number"
              keyboardType="phone-pad"
              style={[styles.truckNameInput, styles.truckPhoneInput]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={closeTruckNameModal}
                disabled={truckSaving}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={
                  truckNameModal?.mode === "edit" ? renameTruckUnit : createTruckUnit
                }
                disabled={truckSaving}
                style={styles.saveButton}
              >
                {truckSaving ? (
                  <ActivityIndicator color={AppColor.white} />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default UserProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    margin: 16,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: AppColor.border,
  },

  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  itemIconContiner: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.black,
    marginRight: 40, // padding of container + image width
  },
  profileDetailRow: {
    paddingBottom: 0,
    paddingTop: 12,
  },

  profileHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    backgroundColor: AppColor.border,
  },
  profileInfoContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontFamily: Mulish700,
    color: AppColor.black,
    marginBottom: 4,
    width: "90%",
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.subText,
  },
  accessCodeBox: {
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  employeeProfileBox: {
    backgroundColor: "#F5FAFF",
    borderColor: "#BFDBFE",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  employeeProfileHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 12,
  },
  employeeProfileTitle: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 16,
  },
  employeeProfileGrid: {
    gap: 10,
  },
  employeeProfileRow: {
    borderTopColor: "#DCE4F2",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  employeeProfileLabel: {
    color: AppColor.subText,
    fontFamily: Mulish400,
    fontSize: 12,
    marginBottom: 3,
  },
  employeeProfileValue: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 14,
    lineHeight: 20,
  },
  employeeScheduleCard: {
    marginTop: 6,
  },
  employeeScheduleLocation: {
    color: AppColor.subText,
    fontFamily: Mulish400,
    fontSize: 13,
    marginBottom: 4,
  },
  employeeScheduleDay: {
    color: AppColor.black,
    fontFamily: Mulish400,
    fontSize: 13,
    lineHeight: 19,
  },
  accessCodeIconContainer: {
    alignItems: "center",
    backgroundColor: AppColor.white,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginRight: 10,
    width: 36,
  },
  accessCodeTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  accessCodeLabel: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  accessCodeHelper: {
    color: AppColor.subText,
    fontFamily: Mulish400,
    fontSize: 12,
    marginTop: 2,
  },
  accessCodeValue: {
    color: AppColor.black,
    fontFamily: Mulish700,
    fontSize: 18,
    letterSpacing: 0,
  },

  socialMediaContainer: {
    paddingVertical: 16,
  },
  socialMediaTitle: {
    fontSize: 18,
    fontFamily: Mulish700,
    color: AppColor.black,
    marginBottom: 10,
  },
  socialMediaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  socialMediaIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  socialMediaText: {
    fontSize: 16,
    fontFamily: Mulish400,
    color: "#0066cc",
    flex: 1,
  },
  truckSection: {
    paddingVertical: 16,
  },
  truckSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  truckAddButton: {
    alignItems: "center",
    borderColor: AppColor.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  truckAddText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 14,
  },
  truckRow: {
    alignItems: "center",
    borderTopColor: AppColor.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: 6,
  },
  truckTextBlock: {
    flex: 1,
    paddingRight: 8,
  },
  truckPhoneText: {
    color: AppColor.subText,
    fontFamily: Mulish400,
    fontSize: 13,
    marginTop: 2,
  },
  truckActions: {
    alignItems: "center",
    flexDirection: "row",
  },
  lockedText: {
    color: AppColor.subText,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  reactivateButton: {
    borderColor: AppColor.primary,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  reactivateText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 13,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalPanel: {
    backgroundColor: AppColor.white,
    borderRadius: 8,
    padding: 16,
    width: "100%",
  },
  truckNameInput: {
    borderColor: AppColor.border,
    borderRadius: 8,
    borderWidth: 1,
    color: AppColor.black,
    fontFamily: Mulish400,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  truckPhoneInput: {
    marginTop: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: AppColor.primary,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  cancelText: {
    color: AppColor.primary,
    fontFamily: Mulish700,
    fontSize: 15,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: AppColor.primary,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  saveText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 15,
  },

  addressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    margin: 16,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: AppColor.border,
  },
});
