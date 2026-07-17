import React, { useState, useEffect } from "react";
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
  IconButton,
  ActivityIndicator,
} from "react-native-paper";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Dropdown } from "react-native-element-dropdown";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Octicons from "react-native-vector-icons/Octicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import Tooltip from "react-native-walkthrough-tooltip";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import { setSelectedLocations } from "../redux/slices/foodTruckProfileSlice";
import {
  getFoodtruckDetail_API,
  updateFoodTruckProfile_API,
} from "../api/appAPI";
import { transformBusinessHoursForAPI } from "../helpers/availability.helper";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { updateFoodTruck } from "../redux/slices/userSlice";

const ProfileSetBusinessHrsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.userReducer);
  const { selectedLocations } = useSelector(
    (state) => state.foodTruckProfileReducer
  );

  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeLocIndex, setActiveLocIndex] = useState(null);
  const [pickerField, setPickerField] = useState(null);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [toolTipVisible, setToolTipVisible] = useState(false);
  const [selectedBusinessHrs, setSelectedBusinessHrs] = useState([
    {
      uniqueId: uuidv4(),
      value: null,
      openTime: moment().startOf("day").toDate(), // 00:00
      closeTime: moment().startOf("day").toDate(), // 00:00
      enabled: true,
    },
  ]);

  const getDataFromAPI = async () => {
    setDataLoading(true);
    try {
      const foodtruck_id = user?.foodTruck?._id;
      const response = await getFoodtruckDetail_API(foodtruck_id);
      console.log("response => ", response);
      if (response?.success && response?.data) {
        dispatch(setSelectedLocations(response.data.foodtruck.locations));
        const formattedBusinessHours = formatBusinessHours(
          response.data.foodtruck.businessHours,
          response.data.foodtruck.locations
        );
        setSelectedBusinessHrs(formattedBusinessHours);
      }
    } catch (error) {
      console.error("Error fetching business hours:", error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    getDataFromAPI();
  }, []);

  const showTimePicker = (locIndex, field) => {
    setActiveLocIndex(locIndex);
    setPickerField(field);
    setPickerVisible(true);
  };

  const handleConfirm = (selectedDate) => {
    const updated = [...selectedBusinessHrs];
    if (pickerField && activeLocIndex !== null) {
      updated[activeLocIndex][pickerField] = selectedDate;
      setSelectedBusinessHrs(updated);
    }
    setPickerVisible(false);
  };

  const updateLocation = (locIndex, selectedItem) => {
    const updated = [...selectedBusinessHrs];
    updated[locIndex] = {
      ...updated[locIndex],
      value: selectedItem._id,
      locationTitle: selectedItem.title,
      locationAddress: selectedItem.address,
    };
    setSelectedBusinessHrs(updated);
  };

  const addLocation = () => {
    const updated = [...selectedBusinessHrs];
    updated.push({
      uniqueId: uuidv4(),
      value: null,
      openTime: moment().startOf("day").toDate(), // 00:00
      closeTime: moment().startOf("day").toDate(), // 00:00
      enabled: true,
    });
    setSelectedBusinessHrs(updated);
  };

  const removeLocation = (locIndex) => {
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
            // If there's only one location, don't remove it
            if (selectedBusinessHrs.length === 1) {
              const updated = [...selectedBusinessHrs];
              updated[0] = {
                uniqueId: uuidv4(),
                value: null,
                openTime: moment().startOf("day").toDate(), // 00:00
                closeTime: moment().startOf("day").toDate(), // 00:00
                enabled: true,
              };
              setSelectedBusinessHrs(updated);
              return;
            }

            // Otherwise remove the location
            const updated = [...selectedBusinessHrs];
            updated.splice(locIndex, 1);
            setSelectedBusinessHrs(updated);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const formatBusinessHours = (businessHours, locations) => {
    if (!businessHours || businessHours.length === 0) {
      return [
        {
          uniqueId: uuidv4(),
          value: null,
          openTime: moment().startOf("day").toDate(), // 00:00
          closeTime: moment().startOf("day").toDate(), // 00:00
          enabled: true,
        },
      ];
    }

    return businessHours.map((item) => {
      const location = locations.find((loc) => loc._id === item.locationId);
      const [startHour, startMinute] = item.startTime.split(":").map(Number);
      const [endHour, endMinute] = item.endTime.split(":").map(Number);

      const openTime = moment()
        .startOf("day")
        .hour(startHour)
        .minute(startMinute)
        .toDate();
      const closeTime = moment()
        .startOf("day")
        .hour(endHour)
        .minute(endMinute)
        .toDate();

      return {
        uniqueId: uuidv4(),
        value: item.locationId,
        openTime: openTime,
        closeTime: closeTime,
        enabled: true,
        locationTitle: location ? location.title : null,
        locationAddress: location ? location.address : null,
        _id: item._id, // Include the _id from the API response
      };
    });
  };

  const handleContinuePress = async () => {
    // --- Check for missing location ---
    for (let loc of selectedBusinessHrs) {
      if (!loc.value) {
        Alert.alert(
          "Missing Location",
          `Please select a location before continuing.`
        );
        return;
      }
    }

    setLoading(true);
    try {
      const hrsData = transformBusinessHoursForAPI(selectedBusinessHrs);
      console.log("hrsData => ", hrsData);

      const foodtruck_id = user?.foodTruck?._id;
      const response = await updateFoodTruckProfile_API({
        payload: {
          businessHours: hrsData,
        },
        foodTruckId: foodtruck_id,
      });
      console.log("response => ", response);
      if (response?.success && response?.data) {
        dispatch(
          showSnackbar({ message: "Business Hours Updated", type: "success" })
        );
        dispatch(updateFoodTruck(response.data.foodtruck));
        navigation.goBack();
      }
    } catch (error) {
      console.error("error =>", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBarManager barStyle="dark-content" />

      {/* Header Container */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ width: "20%" }}>
          <IconButton
            icon="arrow-left"
            iconColor={AppColor.black}
            size={24}
            onPress={() => navigation.goBack()}
          />
        </View>
        <Text style={styles.headerTitle}>{"Business Hours"}</Text>
        <View style={{ width: "20%" }} />
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
          {/* Content Container */}
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
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
                  <Text style={styles.screenTitle}>{"Set Business Hours"}</Text>
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
                          "This allows customers to know normal business hours for immediately pickup/deliver."
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
                <Text style={styles.screenSubtitle}>
                  {"Set normal business hours of your food truck."}
                </Text>
              </View>

              {/* TimeSlots Container */}
              <View style={styles.timeSlotsContainer}>
                {selectedBusinessHrs.map((loc, locIndex) => (
                  <View key={loc.uniqueId} style={styles.dayContainer}>
                    <View style={styles.locationSection}>
                      <Text style={styles.sectionLabel}>{"Location"}</Text>
                      <View style={styles.dropdownContainer}>
                        <Dropdown
                          data={selectedLocations}
                          labelField="title"
                          valueField="_id"
                          value={loc.value}
                          onChange={(selectedItem) =>
                            updateLocation(locIndex, selectedItem)
                          }
                          placeholder="Select Location"
                          style={styles.dropdown}
                          placeholderStyle={styles.dropdownText}
                          itemTextStyle={styles.dropdownText}
                          selectedTextStyle={styles.dropdownText}
                        />
                        <TouchableOpacity
                          activeOpacity={0.7}
                          style={styles.removeButton}
                          onPress={() => removeLocation(locIndex)}
                        >
                          <MaterialCommunityIcons
                            name="trash-can"
                            color={AppColor.red}
                            size={32}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.timeRow}>
                      <View style={styles.timePickerContainer}>
                        <Text style={styles.sectionLabel}>{"From"}</Text>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          style={styles.timePickerButton}
                          onPress={() => showTimePicker(locIndex, "openTime")}
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

                      <View style={styles.timePickerContainer}>
                        <Text style={styles.sectionLabel}>{"To"}</Text>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          style={styles.timePickerButton}
                          onPress={() => showTimePicker(locIndex, "closeTime")}
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
                  </View>
                ))}
                <Button
                  icon="plus-circle-outline"
                  mode="outlined"
                  style={styles.addButton}
                  labelStyle={styles.addButtonLabel}
                  textColor={AppColor.primary}
                  theme={styles.addButtonTheme}
                  onPress={addLocation}
                >
                  {"Add Location"}
                </Button>
              </View>
            </View>
          </ScrollView>
          {/* Continue Button */}
          <View
            style={[
              styles.continueButtonContainer,
              { paddingBottom: insets.bottom },
            ]}
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

      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode="time"
        date={selectedBusinessHrs[activeLocIndex]?.[pickerField] || new Date()}
        onConfirm={handleConfirm}
        onCancel={() => setPickerVisible(false)}
        is24Hour={false}
      />
    </View>
  );
};

export default ProfileSetBusinessHrsScreen;

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
    backgroundColor: AppColor.white,
    paddingHorizontal: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderColor: AppColor.border,
  },
  headerTitle: {
    color: AppColor.black,
    fontSize: 20,
    fontFamily: Mulish700,
  },

  // Content Header
  contentHeaderContainer: {
    backgroundColor: AppColor.white,
    paddingHorizontal: 16,
    paddingVertical: 30,
  },
  screenTitle: {
    color: AppColor.black,
    fontSize: 24,
    fontFamily: Mulish700,
  },
  screenSubtitle: {
    color: "#606268",
    fontSize: 14,
    fontFamily: Mulish400,
  },

  // TimeSlots
  timeSlotsContainer: {
    padding: 16,
  },
  dayContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "#E5E5EA",
  },
  locationSection: {
    gap: 5,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.text,
  },
  dropdownContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  timePickerContainer: {
    flex: 1 / 2,
    gap: 5,
  },
  timePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 5,
    padding: 10,
    borderWidth: 1,
    borderColor: AppColor.border,
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.black,
    textAlign: "center",
  },

  dropdown: {
    height: 40,
    width: "84%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  dropdownText: {
    fontFamily: Mulish400,
  },
  removeButton: {
    alignItems: "flex-end",
    justifyContent: "center",
    height: 40,
    width: "16%",
  },
  addButton: {
    marginBottom: 16,
    borderRadius: 6,
  },
  addButtonLabel: {
    fontFamily: Mulish400,
  },
  addButtonTheme: {
    colors: { outline: AppColor.primary },
  },

  // Continue Button
  continueButtonContainer: {
    borderTopWidth: 1,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
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
