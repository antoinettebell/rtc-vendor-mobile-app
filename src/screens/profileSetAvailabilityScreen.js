import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator as NativeIndicator,
  Pressable,
} from "react-native";
import {
  Text,
  Button,
  Switch,
  IconButton,
  ActivityIndicator,
} from "react-native-paper";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Dropdown } from "react-native-element-dropdown";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Octicons from "react-native-vector-icons/Octicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { useDispatch, useSelector } from "react-redux";
import Tooltip from "react-native-walkthrough-tooltip";
import {
  getFoodtruckDetail_API,
  updateFoodTruckProfile_API,
} from "../api/appAPI";
import { updateFoodTruck } from "../redux/slices/userSlice";
import StatusBarManager from "../components/StatusBarManager";
import {
  setSelectedCuisine,
  setSelectedLocations,
} from "../redux/slices/foodTruckProfileSlice";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import {
  formatApiDataToComponentState,
  hasTimeOverlap,
  transformLocationsForAPI,
} from "../helpers/availability.helper";
import { fullDayNames } from "../utils/constants";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getExpandedDaysFromAvailability = (items = []) =>
  items.reduce((acc, item, index) => {
    acc[item.day || String(index)] = !!item.dayEnabled;
    return acc;
  }, {});

export default function ProfileAvailabilityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedLocations } = useSelector(
    (state) => state.foodTruckProfileReducer
  );
  const { user } = useSelector((state) => state.userReducer);

  const [availability, setAvailability] = useState(
    days.map((day) => ({
      day,
      dayEnabled: false, // New property for the main day switch
      locations: [
        {
          uniqueId: uuidv4(),
          value: null,
          truckUnitId: null,
          openTime: moment().startOf("day").toDate(), // 00:00
          closeTime: moment().startOf("day").toDate(), // 00:00
          enabled: false,
        },
      ],
    }))
  );
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(null);
  const [activeLocIndex, setActiveLocIndex] = useState(null);
  const [pickerField, setPickerField] = useState(null);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [toolTipVisible, setToolTipVisible] = useState(false);
  const [expandedDays, setExpandedDays] = useState({});
  const [editingDays, setEditingDays] = useState({});
  const truckUnitOptions = (user?.foodTruck?.truck_units || [])
    .filter((unit) => !unit.is_archived)
    .map((unit, index) => ({
      label: unit.name || `Truck ${index + 1}`,
      value: unit._id,
    }));
  const requiresTruckUnitSelection = truckUnitOptions.length > 1;

  const getDataFromAPI = async () => {
    setDataLoading(true);
    try {
      const foodtruck_id = user?.foodTruck?._id;
      const response = await getFoodtruckDetail_API(foodtruck_id);
      console.log("response => ", response);
      if (response?.success && response?.data) {
        dispatch(setSelectedLocations(response.data.foodtruck.locations));
	        const formattedAvailabilityData = formatApiDataToComponentState(
	          response.data.foodtruck.availability,
	          response.data.foodtruck.locations
	        );
	        setAvailability(formattedAvailabilityData);
	        setExpandedDays(getExpandedDaysFromAvailability(formattedAvailabilityData));
	        setEditingDays({});
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(
        showSnackbar({ message: "Something went wrong!", type: "error" })
      );
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    getDataFromAPI();
  }, []);

  const showTimePicker = (dayIndex, locIndex, field) => {
    setActiveDayIndex(dayIndex);
    setActiveLocIndex(locIndex);
    setPickerField(field);
    setPickerVisible(true);
  };

  const handleConfirm = (selectedDate) => {
    const updated = [...availability];
    if (pickerField && activeDayIndex !== null && activeLocIndex !== null) {
      updated[activeDayIndex].locations[activeLocIndex][pickerField] =
        selectedDate;
      setAvailability(updated);
    }
    setPickerVisible(false);
  };

  const toggleLocationSwitch = (dayIndex, locIndex) => {
    const updated = [...availability];
    updated[dayIndex].locations[locIndex].enabled =
      !updated[dayIndex].locations[locIndex].enabled;
    setAvailability(updated);
  };

  const toggleDaySwitch = (dayIndex) => {
    const updated = [...availability];
    const newDayEnabledStatus = !updated[dayIndex].dayEnabled;
    updated[dayIndex].dayEnabled = newDayEnabledStatus;
    // Set all locations for the day to the new dayEnabled state
    updated[dayIndex].locations = updated[dayIndex].locations.map((loc) => ({
      ...loc,
      enabled: newDayEnabledStatus,
    }));
    setAvailability(updated);
    setExpandedDays((prev) => ({
      ...prev,
      [updated[dayIndex].day]: newDayEnabledStatus || prev[updated[dayIndex].day],
    }));
  };

  const toggleDayExpanded = (dayKey) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayKey]: !prev[dayKey],
    }));
  };

  const setDayEditing = (dayKey, editing) => {
    setEditingDays((prev) => ({
      ...prev,
      [dayKey]: editing,
    }));
    if (editing) {
      setExpandedDays((prev) => ({
        ...prev,
        [dayKey]: true,
      }));
    }
  };

  const updateLocation = (dayIndex, locIndex, selectedItem) => {
    const updated = [...availability];
    updated[dayIndex].locations[locIndex] = {
      ...updated[dayIndex].locations[locIndex],
      value: selectedItem._id,
      locationTitle: selectedItem.title,
      locationAddress: selectedItem.address,
    };
    setAvailability(updated);
  };

  const updateTruckUnit = (dayIndex, locIndex, selectedItem) => {
    const updated = [...availability];
    updated[dayIndex].locations[locIndex] = {
      ...updated[dayIndex].locations[locIndex],
      truckUnitId: selectedItem.value || selectedItem._id || null,
      truckUnitName: selectedItem.label || selectedItem.name || "",
    };
    setAvailability(updated);
  };

  const addLocation = (dayIndex) => {
    const updated = [...availability];
    const dayEnabledStatus = updated[dayIndex].dayEnabled; // Get the day's enabled status
    updated[dayIndex].locations.push({
      uniqueId: uuidv4(),
      value: null,
      truckUnitId: null,
      openTime: moment().startOf("day").toDate(), // 00:00
      closeTime: moment().startOf("day").toDate(), // 00:00
      enabled: dayEnabledStatus, // Set enabled based on day's status
    });
    setAvailability(updated);
  };

  const removeLocation = (dayIndex, locIndex) => {
    Alert.alert(
      "Remove Timeslot",
      "Are you sure you want to remove this time slot?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          onPress: () => {
            const updatedAvailability = [...availability];
            const dayToUpdate = updatedAvailability[dayIndex];

            // Remove the specific location slot
            dayToUpdate.locations.splice(locIndex, 1);

            // If, after removal, there are no more locations for this day,
            // add a default one, inheriting the day's enabled status.
            if (dayToUpdate.locations.length === 0) {
              dayToUpdate.locations.push({
                uniqueId: uuidv4(),
                value: null,
                truckUnitId: null,
                openTime: moment().startOf("day").toDate(), // 00:00
                closeTime: moment().startOf("day").toDate(), // 00:00
                enabled: dayToUpdate.dayEnabled, // Inherit day's enabled status
              });
            }
            setAvailability(updatedAvailability);
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Handle API call for saving data
  const saveScheduleChanges = async (changedDay = null) => {
    console.log("availability => ", availability);

    // --- Validation: Check for missing location ---
    for (let day of availability) {
      // Only validate if the day is enabled
      if (day.dayEnabled) {
        for (let loc of day.locations) {
          if (!loc.value) {
            Alert.alert(
              "Missing Location",
              `Please select a location for ${fullDayNames[day.day] || day.day} before continuing.`
            );
            return;
          }
          if (requiresTruckUnitSelection && loc.enabled && !loc.truckUnitId) {
            Alert.alert(
              "Missing Food Truck",
              `Please select a food truck for ${fullDayNames[day.day] || day.day} before saving.`
            );
            return;
          }
        }
      }
    }

    // --- COMBINED VALIDATION: End Time strictly after Start Time & Time Slot Overlaps for the same day ---
    // for (let i = 0; i < availability.length; i++) {
    //   const currentDay = availability[i];
    //   const fullCurrentDayName = fullDayNames[currentDay.day] || currentDay.day; // Get full day name

    //   // Filter only enabled slots that have a location selected, and only if the day is enabled
    //   const enabledAndSelectedLocations = currentDay.dayEnabled
    //     ? currentDay.locations.filter((loc) => loc.enabled && loc.value)
    //     : [];

    //   // FIRST: Validate each individual slot's StartTime vs EndTime
    //   for (let j = 0; j < enabledAndSelectedLocations.length; j++) {
    //     const loc = enabledAndSelectedLocations[j];
    //     const startTime = moment(loc.openTime);
    //     const endTime = moment(loc.closeTime);
    //     if (!endTime.isAfter(startTime)) {
    //       Alert.alert(
    //         "Invalid Time Slot",
    //         `On ${fullCurrentDayName}, the Close Time (${endTime.format("h:mm A")}) for '${loc.locationTitle || "an unnamed location slot"}' must be after its Open Time (${startTime.format("h:mm A")}). Please adjust.`
    //       );
    //       return; // Stop execution if an invalid individual time slot is found
    //     }
    //   }

    //   // If there's 0 or 1 enabled slot, no overlap is possible for this day, so continue to the next day
    //   if (enabledAndSelectedLocations.length < 2) {
    //     continue;
    //   }

    //   // SECOND: Check for overlaps between pairs of time slots on the same day
    //   for (let j = 0; j < enabledAndSelectedLocations.length; j++) {
    //     const loc1 = enabledAndSelectedLocations[j];
    //     // Start inner loop from j + 1 to avoid comparing a slot with itself and to avoid duplicate checks
    //     for (let k = j + 1; k < enabledAndSelectedLocations.length; k++) {
    //       const loc2 = enabledAndSelectedLocations[k];
    //       if (
    //         hasTimeOverlap(
    //           loc1.openTime,
    //           loc1.closeTime,
    //           loc2.openTime,
    //           loc2.closeTime
    //         )
    //       ) {
    //         const loc1Name = loc1.locationTitle || "an unnamed location slot";
    //         const loc2Name = loc2.locationTitle || "an unnamed location slot";

    //         Alert.alert(
    //           "Time Slot Overlap Detected",
    //           `On ${fullCurrentDayName}, the time slot for '${loc1Name}' (Open Time: ${moment(loc1.openTime).format("h:mm A")} - Close Time: ${moment(loc1.closeTime).format("h:mm A")}) overlaps with the time slot for '${loc2Name}' (Open Time: ${moment(loc2.openTime).format("h:mm A")} - Close Time: ${moment(loc2.closeTime).format("h:mm A")}). Please adjust your times.`,
    //           [{ text: "OK" }]
    //         );
    //         return; // Stop execution if an overlap is found
    //       } else {
    //         console.log(
    //           `No overlap between ${loc1.locationTitle} and ${loc2.locationTitle}`
    //         );
    //       }
    //     }
    //   }
    // }
    // --- END COMBINED VALIDATION ---

    const finalResult = transformLocationsForAPI(availability, {
      requireTruckUnit: requiresTruckUnitSelection,
    });
    console.log("finalResult => ", finalResult);
    const incompleteScheduleRow = finalResult.find(
      (row) =>
        row.available &&
        (!row.locationId || (requiresTruckUnitSelection && !row.truckUnitId))
    );
    if (incompleteScheduleRow) {
      Alert.alert(
        "Missing Food Truck",
        "Please select a food truck for every active weekly schedule row before saving."
      );
      return;
    }

    // if (finalResult?.length < 1) {
    //   Alert.alert(
    //     "Availability Required",
    //     "Please provide at least one availability."
    //   );
    //   return;
    // }

    setLoading(true);
    try {
      const payload = {
        availability: finalResult?.length ? finalResult : [],
        availabilityChangeDay: changedDay,
      };
      const response = await updateFoodTruckProfile_API({
        payload,
        foodTruckId: user?.foodTruck?._id,
      });
      if (response?.success && response?.data) {
        console.log("response => ", response);
        dispatch(updateFoodTruck(response.data.foodtruck));
        dispatch(setSelectedCuisine(response.data.foodtruck.cuisine));
        dispatch(setSelectedLocations(response.data.foodtruck.locations));
        setEditingDays((prev) => ({
          ...prev,
          [changedDay]: false,
        }));
        dispatch(
          showSnackbar({
            message: "Weekly schedule updated.",
            type: "success",
          })
        );
      }
    } catch (error) {
      console.error("error =>", error);
      dispatch(showSnackbar({ message: error.message, type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDay = (dayKey) => {
    Alert.alert(
      "Update Weekly Schedule",
      "Are you sure you want to change this date/time/location?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: () => saveScheduleChanges(dayKey),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header Container */}
	      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ width: "20%" }}>
          <IconButton
            icon="arrow-left"
            iconColor={AppColor.black}
            size={24}
            onPress={() => navigation.goBack()}
          />
        </View>
        <Text style={styles.headerTitle}>{"Weekly Schedule"}</Text>
        <View style={{ width: "20%" }} />
      </View>

      {/* Content Container */}
      {dataLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <NativeIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollViewContentContainer}
            bounces={false}
            showsVerticalScrollIndicator={false}
            pointerEvents={loading ? "none" : "auto"}
          >
            <View style={{ flex: 1 }}>
              {/* Content Header Continer */}
              <View style={styles.contentHeaderContainer}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                    gap: 8,
                  }}
                >
                  <Text style={styles.contentHeaderTitle}>
                    {"Weekly Schedule"}
                  </Text>
                  <Tooltip
                    animated={true}
                    disableShadow={true}
                    placement="bottom"
                    isVisible={toolTipVisible}
                    backgroundColor="rgba(0,0,0,0)"
                    arrowSize={{ width: 16, height: 8, color: AppColor.text }}
                    contentStyle={{
                      padding: 18,
                      borderRadius: 8,
                      backgroundColor: AppColor.text,
                    }}
                    content={
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: Mulish400,
                          color: AppColor.white,
                        }}
                      >
                        {
                          "Set the weekly hours and truck assignment for each serving location."
                        }
                      </Text>
                    }
                    onClose={() => setToolTipVisible(false)}
                  >
                    <Pressable
                      hitSlop={5}
                      style={{ marginBottom: -3 }}
                      onPress={() => setToolTipVisible(true)}
                    >
                      <MaterialIcons
                        name="info"
                        color={AppColor.textHighlighter}
                        size={22}
                      />
                    </Pressable>
                  </Tooltip>
                </View>
                <Text style={styles.contentHeaderDescription}>
                  {
                    "Set the weekly open and close schedule customers can view for each location."
                  }
                </Text>
              </View>

              {/* TimeSlots Container */}
	              <View style={styles.timeSlotsContainer}>
	                {availability.map((item, index) => {
	                  const dayKey = item.day || String(index);
	                  const expanded = !!expandedDays[dayKey];
	                  const isDayEditing = !!editingDays[dayKey];
	                  return (
	                    <View key={dayKey} style={styles.dayContainer}>
	                      <View
	                        style={[
	                          styles.timeRow,
	                          item.dayEnabled && expanded && { marginBottom: 16 },
	                        ]}
	                      >
	                        <Pressable
	                          onPress={() => toggleDayExpanded(dayKey)}
	                          style={styles.dayHeaderPressable}
	                          hitSlop={8}
	                        >
	                          <View style={styles.dayCircle}>
	                            <Text style={styles.dayCircleText}>{item.day}</Text>
	                          </View>
	                          <Text style={styles.dayNameText}>
	                            {fullDayNames[item.day]}
	                          </Text>
	                          <MaterialIcons
	                            name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
	                            size={26}
	                            color={AppColor.textHighlighter}
	                          />
	                        </Pressable>
	                        <TouchableOpacity
	                          activeOpacity={0.7}
	                          style={[
	                            styles.dayActionButton,
	                            isDayEditing && styles.dayActionButtonActive,
	                          ]}
	                          onPress={() =>
	                            isDayEditing
	                              ? handleSaveDay(dayKey)
	                              : setDayEditing(dayKey, true)
	                          }
	                          disabled={loading}
	                        >
	                          <Text
	                            style={[
	                              styles.dayActionText,
	                              isDayEditing && styles.dayActionTextActive,
	                            ]}
	                          >
	                            {isDayEditing ? "Save" : "Edit"}
	                          </Text>
	                        </TouchableOpacity>
	                        <Switch
	                          color={AppColor.primary}
	                          value={item.dayEnabled}
	                          onValueChange={() => toggleDaySwitch(index)}
	                          disabled={!isDayEditing || loading}
	                        />
	                      </View>

	                      {item.dayEnabled && expanded && (
	                        <View>
	                          {item.locations.map((loc, locIndex) => (
	                            <View key={loc.uniqueId}>
	                              <View style={styles.timeSlotRow}>
	                                <View style={styles.timeInputContainer}>
	                                  <Text style={styles.timeInputLabel}>{"Open"}</Text>
	                                  <TouchableOpacity
	                                    activeOpacity={0.7}
	                                    style={styles.timeInputButton}
	                                    onPress={() =>
	                                      showTimePicker(index, locIndex, "openTime")
	                                    }
	                                    disabled={!isDayEditing || loading}
	                                  >
	                                    <Text style={styles.timeLabel}>
	                                      {loc.openTime.toLocaleTimeString([], {
	                                        hour: "2-digit",
	                                        minute: "2-digit",
	                                      })}
	                                    </Text>
	                                    <Octicons
	                                      name="clock"
	                                      size={20}
	                                      color={AppColor.textHighlighter}
	                                    />
	                                  </TouchableOpacity>
	                                </View>

	                                <View style={styles.timeInputContainer}>
	                                  <Text style={styles.timeInputLabel}>{"Close"}</Text>
	                                  <TouchableOpacity
	                                    activeOpacity={0.7}
	                                    style={styles.timeInputButton}
	                                    onPress={() =>
	                                      showTimePicker(index, locIndex, "closeTime")
	                                    }
	                                    disabled={!isDayEditing || loading}
	                                  >
	                                    <Text style={styles.timeLabel}>
	                                      {loc.closeTime.toLocaleTimeString([], {
	                                        hour: "2-digit",
	                                        minute: "2-digit",
	                                      })}
	                                    </Text>
	                                    <Octicons
	                                      name="clock"
	                                      size={20}
	                                      color={AppColor.textHighlighter}
	                                    />
	                                  </TouchableOpacity>
	                                </View>
	                              </View>

	                              <View style={styles.locationInputContainer}>
	                                <Text style={styles.locationInputLabel}>{"Location"}</Text>
	                                <View style={styles.locationDropdownWrapper}>
	                                  <Dropdown
	                                    data={selectedLocations}
	                                    labelField="title"
	                                    valueField="_id"
	                                    value={loc.value}
	                                    onChange={(selectedItem) =>
	                                      updateLocation(index, locIndex, selectedItem)
	                                    }
	                                    placeholder="Select Location"
	                                    style={styles.dropdown}
	                                    placeholderStyle={{ fontFamily: Mulish400 }}
	                                    itemTextStyle={{ fontFamily: Mulish400 }}
	                                    selectedTextStyle={{ fontFamily: Mulish400 }}
	                                    disable={!isDayEditing || loading}
	                                  />
	                                  <TouchableOpacity
	                                    activeOpacity={0.7}
	                                    style={styles.removeLocationButton}
	                                    onPress={() => removeLocation(index, locIndex)}
	                                    disabled={!isDayEditing || loading}
	                                  >
	                                    <MaterialCommunityIcons
	                                      name="trash-can"
	                                      color={AppColor.red}
	                                      size={32}
	                                    />
	                                  </TouchableOpacity>
	                                </View>
	                              </View>

	                              {truckUnitOptions.length > 0 && (
	                                <View style={styles.locationInputContainer}>
	                                  <Text style={styles.locationInputLabel}>
	                                    {"Food Truck"}
	                                  </Text>
	                                  <Dropdown
	                                    data={truckUnitOptions}
	                                    labelField="label"
	                                    valueField="value"
	                                    value={loc.truckUnitId}
	                                    onChange={(selectedItem) =>
	                                      updateTruckUnit(index, locIndex, selectedItem)
	                                    }
	                                    placeholder="Select Food Truck"
	                                    style={styles.dropdown}
	                                    placeholderStyle={{ fontFamily: Mulish400 }}
	                                    itemTextStyle={{ fontFamily: Mulish400 }}
	                                    selectedTextStyle={{ fontFamily: Mulish400 }}
	                                    disable={!isDayEditing || loading}
	                                  />
	                                </View>
	                              )}

	                              {locIndex !== item?.locations?.length - 1 && (
	                                <View style={styles.divider} />
	                              )}
	                            </View>
	                          ))}

	                          <Button
	                            icon="plus-circle-outline"
	                            mode="outlined"
	                            onPress={() => addLocation(index)}
	                            style={styles.addButton}
	                            textColor={AppColor.primary}
	                            theme={styles.addButtonTheme}
	                            labelStyle={{ fontFamily: Mulish400 }}
	                            disabled={!isDayEditing || loading}
	                          >
	                            Add Location
	                          </Button>
	                        </View>
	                      )}
	                    </View>
	                  );
	                })}
	              </View>
            </View>
          </ScrollView>

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
	              style={styles.continueButton}
	              activeOpacity={0.7}
	              onPress={() => navigation.goBack()}
	              disabled={loading}
	            >
	              {loading ? (
	                <ActivityIndicator color={AppColor.white} />
	              ) : (
	                <Text style={styles.continueButtonText}>{"Done"}</Text>
	              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Date Time Picker Modal */}
      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode="time"
        date={
          availability[activeDayIndex]?.locations[activeLocIndex]?.[
            pickerField
          ] || new Date()
        }
        onConfirm={handleConfirm}
        onCancel={() => setPickerVisible(false)}
        is24Hour={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.white,
    paddingHorizontal: 8,
    paddingBottom: 12,
    minHeight: 76,
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
  },
  headerTitle: {
    color: AppColor.black,
    fontSize: 20,
    fontFamily: Mulish700,
  },

  // Content
  dayContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#E5E5EA",
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dayHeaderPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayActionButton: {
    minWidth: 54,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: AppColor.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: AppColor.white,
  },
  dayActionButtonActive: {
    backgroundColor: AppColor.primary,
  },
  dayActionText: {
    color: AppColor.primary,
    fontSize: 13,
    fontFamily: Mulish700,
  },
  dayActionTextActive: {
    color: AppColor.white,
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.black,
    textAlign: "center",
  },

  dropdown: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  addButton: {
    marginTop: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  addButtonTheme: {
    colors: { outline: AppColor.primary },
  },

  continueButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginVertical: 10,
    marginHorizontal: 16,
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
  continueButtonText: {
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },

  // Content Header
  contentHeaderContainer: {
    backgroundColor: AppColor.white,
    paddingHorizontal: 16,
    paddingVertical: 30,
  },
  contentHeaderTitle: {
    fontSize: 24,
    fontFamily: Mulish700,
    color: AppColor.black,
  },
  contentHeaderDescription: {
    color: "#606268",
    fontSize: 14,
    fontFamily: Mulish400,
  },

  // Time Slots
  timeSlotsContainer: {
    padding: 16,
  },
  dayCircleText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Mulish700,
  },
  dayNameText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Mulish700,
    color: AppColor.black,
  },
  timeSlotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  timeInputContainer: {
    flex: 1 / 2,
    gap: 5,
  },
  timeInputLabel: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.text,
  },
  timeInputButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 5,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: AppColor.border,
  },
  locationInputContainer: {
    gap: 5,
  },
  locationInputLabel: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.text,
  },
  locationDropdownWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  removeLocationButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    width: 48,
  },
  divider: {
    borderBottomColor: "#E5E5EA",
    borderBottomWidth: 1,
    marginVertical: 24,
  },

  // Continue Button
  continueButtonContainer: {
    borderTopWidth: 1,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
  },

  scrollViewContentContainer: {
    flexGrow: 1,
  },
});
