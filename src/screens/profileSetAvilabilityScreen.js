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
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import {
  getFoodtruckDetail_API,
  updateFoodTruckProfile_API,
} from "../api/appAPI";
import { updateFoodTruck } from "../redux/slices/userSlice";
import StatusBarManager from "../components/StatusBarManager";
import { setSelectedCuisine, setSelectedLocations } from "../redux/slices/foodTruckProfileSlice";
import { showSnackbar } from "../redux/slices/snackbarSlice";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
      value: null,
      openTime: moment().startOf("day").toDate(), // 00:00
      closeTime: moment().startOf("day").toDate(), // 00:00
      enabled: false,
    });
    setAvailability(updated);
  };

  const transformLocations = (data) => {
    return data.flatMap((dayItem) =>
      dayItem.locations
        .filter((location) => location.enabled && location.value)
        .map((location) => {
          return {
            _id: location._id, // Keep existing ID if available
            locationId: location.value,
            day: dayItem.day.toLowerCase(),
            startTime: moment(location.openTime).format("HH:mm"),
            endTime: moment(location.closeTime).format("HH:mm"),
            available: true,
          };
        })
    );
  };

  const handleContinuePress = async () => {
    console.log("availability => ", availability);

    for (let day of availability) {
      for (let loc of day.locations) {
        if (loc.enabled && !loc.value) {
          Alert.alert(
            "Missing Location",
            `Please select a location for ${day.day} before continuing.`
          );
          return;
        }
      }
    }

    const finalResult = transformLocations(availability);
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
      if (response.success && response.data) {
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

  // Function to transform API data to component format
  const transformApiDataToState = (apiData, locationData = []) => {
    return days.map((day) => {
      const dayLower = day.toLowerCase();
      const dayEntries = apiData.filter((item) => item.day === dayLower);

      // If no entries for this day, return default
      if (dayEntries.length === 0) {
        return {
          day,
          locations: [
            {
              value: null,
              locationTitle: "",
              openTime: moment().startOf("day").toDate(),
              closeTime: moment().startOf("day").toDate(),
              enabled: false,
            },
          ],
        };
      }

      // Transform each location entry for this day
      return {
        day,
        locations: dayEntries.map((entry) => {
          // Find the matching location from locationData
          const location = locationData.find(
            (loc) => loc._id === entry.locationId
          );

          return {
            value: entry.locationId,
            locationTitle: location?.title || "",
            openTime: moment(entry.startTime, "HH:mm").toDate(),
            closeTime: moment(entry.endTime, "HH:mm").toDate(),
            enabled: entry.available,
            _id: entry._id,
          };
        }),
      };
    });
  };

  const getDataFromAPI = async () => {
    setDataLoading(true);
    try {
      const foodtruck_id = user?.foodTruck?._id;
      const response = await getFoodtruckDetail_API(foodtruck_id);
      if (response.success && response.data) {
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

      {dataLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <NativeIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom }}
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
                  fontFamily: Primary400,
                }}
              >
                Availability
              </Text>
              <Text
                style={{
                  color: "#606268",
                  fontSize: 14,
                  fontFamily: Secondary400,
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
                              fontFamily: Secondary400,
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
                          trackColor={AppColor.primary}
                          value={loc.enabled}
                          onValueChange={() => toggleSwitch(index, locIndex)}
                        />
                      </View>

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
                        placeholderStyle={{ fontFamily: Secondary400 }}
                        itemTextStyle={{ fontFamily: Secondary400 }}
                        selectedTextStyle={{ fontFamily: Secondary400 }}
                      />

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
                    labelStyle={{ fontFamily: Secondary400 }}
                  >
                    Add Location
                  </Button>
                </View>
              ))}
            </View>

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
        </ScrollView>
      )}
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
    fontFamily: Primary400,
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
    fontSize: 16,
    fontFamily: Secondary400,
    color: AppColor.black,
    textAlign: "center",
  },
  timeSubLabel: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    fontFamily: Secondary400,
  },
  dropdown: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
    marginTop: 12,
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
    marginBottom: 20,
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
    fontFamily: Secondary400,
    fontSize: 16,
    color: AppColor.white,
  },
});
