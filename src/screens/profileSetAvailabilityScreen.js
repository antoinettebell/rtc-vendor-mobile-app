import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator as NativeIndicator,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { useDispatch, useSelector } from "react-redux";
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
  hasTimeOverlap,
  transformApiDataToState,
  transformLocationsForAPI,
} from "../helpers/availability.helper";
import { fullDayNames } from "../utils/constants";

export default function ProfileAvailabilityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedLocations } = useSelector(
    (state) => state.foodTruckProfileReducer
  );
  const { user } = useSelector((state) => state.userReducer);

  // const [apiAvailability, setApiAvailability] = useState([]);
  const [availability, setAvailability] = useState([]);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(null);
  const [activeLocIndex, setActiveLocIndex] = useState(null);
  const [pickerField, setPickerField] = useState(null);
  const [isPickerVisible, setPickerVisible] = useState(false);

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

  const toggleSwitch = (dayIndex, locIndex) => {
    const updated = [...availability];
    updated[dayIndex].locations[locIndex].enabled =
      !updated[dayIndex].locations[locIndex].enabled;
    setAvailability(updated);
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

  const addLocation = (dayIndex) => {
    const updated = [...availability];
    updated[dayIndex].locations.push({
      uniqueId: uuidv4(),
      value: null,
      openTime: moment().startOf("day").toDate(), // 00:00
      closeTime: moment().startOf("day").toDate(), // 00:00
      enabled: false,
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
            // add a default, disabled one.
            if (dayToUpdate.locations.length === 0) {
              dayToUpdate.locations.push({
                uniqueId: uuidv4(),
                value: null,
                openTime: moment().startOf("day").toDate(), // 00:00
                closeTime: moment().startOf("day").toDate(), // 00:00
                enabled: false,
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
  const handleContinuePress = async () => {
    console.log("availability => ", availability);

    // --- Validation: Check for missing location ---
    for (let day of availability) {
      for (let loc of day.locations) {
        if (loc.enabled && !loc.value) {
          Alert.alert(
            "Missing Location",
            `Please select a location for ${fullDayNames[day.day] || day.day} before continuing.`
          );
          return;
        }
      }
    }

    // --- COMBINED VALIDATION: End Time strictly after Start Time & Time Slot Overlaps for the same day ---
    console.log("Starting combined time slot validations...");
    for (let i = 0; i < availability.length; i++) {
      const currentDay = availability[i];
      const fullCurrentDayName = fullDayNames[currentDay.day] || currentDay.day; // Get full day name
      console.log(`Checking availability for day: ${fullCurrentDayName}`);

      // Filter only enabled slots that have a location selected
      const enabledAndSelectedLocations = currentDay.locations.filter(
        (loc) => loc.enabled && loc.value
      );
      console.log(
        `  Enabled and selected locations for ${fullCurrentDayName}:`,
        enabledAndSelectedLocations.length
      );

      // FIRST: Validate each individual slot's StartTime vs EndTime
      for (let j = 0; j < enabledAndSelectedLocations.length; j++) {
        const loc = enabledAndSelectedLocations[j];
        const startTime = moment(loc.openTime);
        const endTime = moment(loc.closeTime);

        console.log(
          `    Checking Open Time vs Close Time for '${loc.locationTitle || "Unnamed Location"}' on ${fullCurrentDayName}: ${startTime.format("HH:mm")} - ${endTime.format("HH:mm")}`
        );

        if (!endTime.isAfter(startTime)) {
          Alert.alert(
            "Invalid Time Slot",
            `On ${fullCurrentDayName}, the **Close Time** (${endTime.format("h:mm A")}) for '${loc.locationTitle || "an unnamed location slot"}' must be after its **Open Time** (${startTime.format("h:mm A")}). Please adjust.`
          );
          console.log("Here I'm stopped!!! Invalid Open/Close Time detected.");
          return; // Stop execution if an invalid individual time slot is found
        }
      }

      // If there's 0 or 1 enabled slot, no overlap is possible for this day, so continue to the next day
      if (enabledAndSelectedLocations.length < 2) {
        console.log(
          `  Not enough enabled slots on ${fullCurrentDayName} to check for overlap.`
        );
        continue;
      }

      // SECOND: Check for overlaps between pairs of time slots on the same day
      for (let j = 0; j < enabledAndSelectedLocations.length; j++) {
        const loc1 = enabledAndSelectedLocations[j];
        console.log(`    Comparing loc1 (index ${j}):`, {
          day: fullCurrentDayName,
          location: loc1.locationTitle,
          open: moment(loc1.openTime).format("HH:mm"),
          close: moment(loc1.closeTime).format("HH:mm"),
        });

        // Start inner loop from j + 1 to avoid comparing a slot with itself and to avoid duplicate checks
        for (let k = j + 1; k < enabledAndSelectedLocations.length; k++) {
          const loc2 = enabledAndSelectedLocations[k];
          console.log(`      Comparing with loc2 (index ${k}):`, {
            day: fullCurrentDayName,
            location: loc2.locationTitle,
            open: moment(loc2.openTime).format("HH:mm"),
            close: moment(loc2.closeTime).format("HH:mm"),
          });

          if (
            hasTimeOverlap(
              loc1.openTime,
              loc1.closeTime,
              loc2.openTime,
              loc2.closeTime
            )
          ) {
            const loc1Name = loc1.locationTitle || "an unnamed location slot";
            const loc2Name = loc2.locationTitle || "an unnamed location slot";

            Alert.alert(
              "Time Slot Overlap Detected",
              `On ${fullCurrentDayName}, the time slot for '${loc1Name}' (**Open Time**: ${moment(loc1.openTime).format("h:mm A")} - **Close Time**: ${moment(loc1.closeTime).format("h:mm A")}) overlaps with the time slot for '${loc2Name}' (**Open Time**: ${moment(loc2.openTime).format("h:mm A")} - **Close Time**: ${moment(loc2.closeTime).format("h:mm A")}). Please adjust your times.`,
              [{ text: "OK" }]
            );
            console.log("Here I'm stopped!!! Overlap detected!");
            console.log(`    Overlap details:
            Day: ${fullCurrentDayName}
            Slot 1: ${loc1Name} (Open Time: ${moment(loc1.openTime).format("HH:mm")} - Close Time: ${moment(loc1.closeTime).format("HH:mm")})
            Slot 2: ${loc2Name} (Open Time: ${moment(loc2.openTime).format("HH:mm")} - Close Time: ${moment(loc2.closeTime).format("HH:mm")})
          `);
            return; // Stop execution if an overlap is found
          } else {
            console.log(
              `      No overlap between ${loc1.locationTitle} and ${loc2.locationTitle}`
            );
          }
        }
      }
    }
    console.log("All combined time slot validations completed with no issues.");
    // --- END COMBINED VALIDATION ---

    const finalResult = transformLocationsForAPI(availability);
    console.log("finalResult => ", finalResult);

    setLoading(true);
    try {
      const payload = {
        availability: finalResult,
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
        navigation.goBack();
      }
    } catch (error) {
      console.error("error =>", error);
      dispatch(showSnackbar({ message: error.message, type: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const getDataFromAPI = async () => {
    setDataLoading(true);
    try {
      const foodtruck_id = user?.foodTruck?._id;
      const response = await getFoodtruckDetail_API(foodtruck_id);
      if (response?.success && response?.data) {
        console.log("response => ", response);
        // dispatch(updateFoodTruck(response.data.foodtruck));
        // dispatch(setSelectedCuisine(response.data.foodtruck.cuisine));
        dispatch(setSelectedLocations(response.data.foodtruck.locations));

        // setApiAvailability(response.data.foodtruck.availability);
        setAvailability(
          transformApiDataToState(
            response.data.foodtruck.availability,
            response.data.foodtruck.locations
          )
        );
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

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header Container */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{"Manage Availability"}</Text>
        <View style={{ width: 48 }} />
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
            contentContainerStyle={{ flexGrow: 1 }}
            bounces={false}
            showsVerticalScrollIndicator={false}
            pointerEvents={loading ? "none" : "auto"}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  marginTop: 15,
                  paddingHorizontal: 16,
                  paddingVertical: 30,
                  backgroundColor: AppColor.white,
                }}
              >
                <Text
                  style={{
                    marginBottom: 12,
                    color: AppColor.black,
                    fontSize: 24,
                    fontFamily: Mulish700,
                  }}
                >
                  Availability
                </Text>
                <Text
                  style={{
                    color: "#606268",
                    fontSize: 14,
                    fontFamily: Mulish400,
                  }}
                >
                  Set open & close time of your food-truck
                </Text>
              </View>

              <View style={{ padding: 16 }}>
                {availability.map((item, index) => (
                  <View key={index} style={styles.dayContainer}>
                    {item.locations.map((loc, locIndex) => (
                      <View
                        key={`${index}-${locIndex}`}
                        style={{ marginBottom: 16 }}
                      >
                        <View style={styles.timeRow}>
                          <View style={styles.dayCircle}>
                            <Text
                              style={{
                                color: "#fff",
                                fontSize: 16,
                                fontFamily: Mulish700,
                              }}
                            >
                              {item.day}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() =>
                              showTimePicker(index, locIndex, "openTime")
                            }
                          >
                            <Text style={styles.timeLabel}>
                              {loc.openTime.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                            <Text style={styles.timeSubLabel}>Open</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              showTimePicker(index, locIndex, "closeTime")
                            }
                          >
                            <Text style={styles.timeLabel}>
                              {loc.closeTime.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                            <Text style={styles.timeSubLabel}>Close</Text>
                          </TouchableOpacity>

                          <Switch
                            color={AppColor.primary}
                            value={loc.enabled}
                            onValueChange={() => toggleSwitch(index, locIndex)}
                          />
                        </View>

                        <View
                          style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 12,
                          }}
                        >
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
                          />

                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={{
                              alignItems: "flex-end",
                              justifyContent: "center",
                              height: 40,
                              width: "16%",
                            }}
                            onPress={() => removeLocation(index, locIndex)}
                          >
                            <MaterialCommunityIcons
                              name="trash-can"
                              color={AppColor.red}
                              size={32}
                            />
                          </TouchableOpacity>
                        </View>

                        {locIndex !== item?.locations?.length - 1 && (
                          <View
                            style={{
                              borderBottomColor: "#E5E5EA",
                              borderBottomWidth: 1,
                              marginTop: 16,
                            }}
                          />
                        )}
                      </View>
                    ))}

                    <Button
                      icon="plus"
                      mode="outlined"
                      onPress={() => addLocation(index)}
                      style={styles.addButton}
                      labelStyle={{ fontFamily: Mulish400 }}
                    >
                      Add Location
                    </Button>
                  </View>
                ))}
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
              onPress={handleContinuePress}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.continueButtonText}>{"Continue"}</Text>
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
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
  },
  headerTitle: {
    color: AppColor.black,
    fontSize: 20,
    fontFamily: Mulish700,
  },

  // steps
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 15,
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
  line: {
    width: "25%",
    height: 2,
    backgroundColor: AppColor.primary,
  },

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
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.black,
    textAlign: "center",
  },
  timeSubLabel: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    fontFamily: Mulish400,
  },
  dropdown: {
    height: 40,
    width: "84%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  addButton: {
    marginBottom: 16,
    borderRadius: 6,
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
});
