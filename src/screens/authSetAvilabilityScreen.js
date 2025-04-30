// import React, { useState } from "react";
// import { View, ScrollView, StyleSheet, StatusBar } from "react-native";
// import { Text, Button, Switch, Card, IconButton } from "react-native-paper";
// import DateTimePickerModal from "react-native-modal-datetime-picker";
// import { Dropdown } from "react-native-element-dropdown";
// import { AppColor, Primary400, Secondary400 } from "../utils/theme";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { useNavigation } from "@react-navigation/native";
// import FontAwesome6 from "react-native-vector-icons/FontAwesome6";

// const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// const dummyLocations = [
//   { label: "13th Street", value: "13th_street" },
//   { label: "Charlotte", value: "charlotte" },
//   { label: "Downtown", value: "downtown" },
//   { label: "Uptown", value: "uptown" },
// ];

// export default function AvailabilityScreen() {
//   const insets = useSafeAreaInsets();
//   const navigation = useNavigation();

//   const [availability, setAvailability] = useState(
//     days.map((day) => ({
//       day,
//       openTime: new Date(),
//       closeTime: new Date(),
//       isPickerVisible: false,
//       pickerField: null,
//       enabled: true,
//       locations: ["13th_street"],
//     }))
//   );

//   const [activePickerIndex, setActivePickerIndex] = useState(null);
//   const [pickerField, setPickerField] = useState(null);
//   const [isPickerVisible, setPickerVisible] = useState(false);

//   const showTimePicker = (index, field) => {
//     setActivePickerIndex(index);
//     setPickerField(field);
//     setPickerVisible(true);
//   };

//   const handleConfirm = (selectedDate) => {
//     const updated = [...availability];
//     if (pickerField && activePickerIndex !== null) {
//       updated[activePickerIndex][pickerField] = selectedDate;
//       setAvailability(updated);
//     }
//     setPickerVisible(false);
//   };

//   const toggleSwitch = (index) => {
//     const updated = [...availability];
//     updated[index].enabled = !updated[index].enabled;
//     setAvailability(updated);
//   };

//   const updateLocation = (index, locIndex, value) => {
//     const updated = [...availability];
//     updated[index].locations[locIndex] = value;
//     setAvailability(updated);
//   };

//   const addLocation = (index) => {
//     const updated = [...availability];
//     updated[index].locations.push("");
//     setAvailability(updated);
//   };

//   return (
//     <View style={styles.container}>
//       <StatusBar backgroundColor={AppColor.white} barStyle="dark-content" />

//       {/* Header */}
//       <View style={[styles.header, { paddingTop: insets.top }]}>
//         <IconButton
//           icon="arrow-left"
//           iconColor={AppColor.black}
//           size={24}
//           onPress={() => navigation.goBack()}
//         />
//         <Text style={styles.headerTitle}>{"Set Availability"}</Text>
//         <View style={{ width: 48 }} />
//       </View>

//       <ScrollView
//         contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom }}
//         bounces={false}
//         showsVerticalScrollIndicator={false}
//       >
//         <View style={{ flex: 1 }}>
//           {/* Step Container */}
//           <View style={styles.stepContainer}>
//             {/* Step 1 - filled circle with checkmark */}
//             <View style={styles.stepSubContainer}>
//               <View style={styles.filledCircle}>
//                 <FontAwesome6 name="check" color={AppColor.white} size={18} />
//               </View>
//             </View>

//             {/* Line connecting steps */}
//             <View style={styles.line} />

//             {/* Step 2 - filled circle with checkmark */}
//             <View style={styles.stepSubContainer}>
//               <View style={styles.filledCircle}>
//                 <FontAwesome6 name="check" color={AppColor.white} size={18} />
//               </View>
//             </View>
//           </View>

//           {/* SubHeader Container */}
//           <View
//             style={{
//               backgroundColor: AppColor.white,
//               paddingHorizontal: 16,
//               paddingVertical: 30,
//             }}
//           >
//             <Text
//               variant="headlineMedium"
//               style={{
//                 marginBottom: 12,
//                 color: AppColor.black,
//                 fontSize: 24,
//                 fontFamily: Primary400,
//               }}
//             >
//               {"Availability"}
//             </Text>
//             <Text
//               style={{
//                 color: "#606268",
//                 fontSize: 14,
//                 fontFamily: Secondary400,
//               }}
//             >
//               {"Set open & close time of your food-truck"}
//             </Text>
//           </View>

//           {/* Days Container */}
//           <View style={{ padding: 16 }}>
//             {availability.map((item, index) => (
//               <View
//                 key={item.day}
//                 style={{
//                   marginBottom: 16,
//                   padding: 16,
//                   backgroundColor: AppColor.white,
//                   borderWidth: 1,
//                   borderRadius: 10,
//                   borderColor: "#E5E5EA",
//                 }}
//               >
//                 <View
//                   style={{
//                     flexDirection: "row",
//                     alignItems: "center",
//                     justifyContent: "space-between",
//                   }}
//                 >
//                   <Button
//                     mode="contained-tonal"
//                     textColor={AppColor.white}
//                     style={{
//                       borderRadius: 20,
//                       backgroundColor: AppColor.primary,
//                     }}
//                     labelStyle={{
//                       fontFamily: Secondary400,
//                       fontSize: 16.7,
//                     }}
//                   >
//                     {item.day}
//                   </Button>

//                   <Button onPress={() => showTimePicker(index, "openTime")}>
//                     {item.openTime.toLocaleTimeString([], {
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     })}
//                   </Button>

//                   <Button onPress={() => showTimePicker(index, "closeTime")}>
//                     {item.closeTime.toLocaleTimeString([], {
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     })}
//                   </Button>

//                   <Switch
//                     trackColor={AppColor.primary}
//                     value={item.enabled}
//                     onValueChange={() => toggleSwitch(index)}
//                   />
//                 </View>

//                 {item.locations.map((loc, locIndex) => (
//                   <Dropdown
//                     key={locIndex}
//                     data={dummyLocations}
//                     labelField="label"
//                     valueField="value"
//                     value={loc}
//                     onChange={(item) =>
//                       updateLocation(index, locIndex, item.value)
//                     }
//                     style={{
//                       borderWidth: 1,
//                       borderColor: "#ccc",
//                       borderRadius: 6,
//                       paddingHorizontal: 12,
//                       marginTop: 10,
//                     }}
//                     placeholder="Select Location"
//                   />
//                 ))}

//                 <Button
//                   icon="plus"
//                   mode="text"
//                   onPress={() => addLocation(index)}
//                   style={{ marginTop: 8 }}
//                 >
//                   Add Location
//                 </Button>
//               </View>
//             ))}
//           </View>

//           <Button
//             mode="contained"
//             onPress={() => console.log("Submit:", availability)}
//             style={{ marginTop: 20 }}
//           >
//             Continue
//           </Button>
//         </View>
//       </ScrollView>

//       {/* TimePicker Modal */}
//       <DateTimePickerModal
//         isVisible={isPickerVisible}
//         mode="time"
//         date={availability[activePickerIndex]?.[pickerField] || new Date()}
//         onConfirm={handleConfirm}
//         onCancel={() => setPickerVisible(false)}
//         is24Hour={false}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F9FAFB",
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     backgroundColor: AppColor.white,
//     paddingHorizontal: 8,
//     paddingBottom: 5,
//     borderBottomWidth: 1,
//     borderColor: "#E5E5EA",
//   },
//   headerTitle: {
//     color: AppColor.black,
//     fontSize: 20,
//     fontFamily: Primary400,
//   },

//   stepContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     marginVertical: 15,
//   },
//   stepSubContainer: {
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   filledCircle: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: AppColor.primary,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   line: {
//     width: "25%",
//     height: 2,
//     backgroundColor: AppColor.primary,
//   },
// });

// import React, { useState } from "react";
// import {
//   View,
//   ScrollView,
//   StyleSheet,
//   StatusBar,
//   TouchableOpacity,
// } from "react-native";
// import { Text, Button, Switch, IconButton } from "react-native-paper";
// import DateTimePickerModal from "react-native-modal-datetime-picker";
// import { Dropdown } from "react-native-element-dropdown";
// import { AppColor, Primary400, Secondary400 } from "../utils/theme";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { useNavigation } from "@react-navigation/native";
// import FontAwesome6 from "react-native-vector-icons/FontAwesome6";

// const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// const dummyLocations = [
//   { label: "13th Street", value: "13th_street" },
//   { label: "Charlotte", value: "charlotte" },
//   { label: "Downtown", value: "downtown" },
//   { label: "Uptown", value: "uptown" },
// ];

// export default function AvailabilityScreen() {
//   const insets = useSafeAreaInsets();
//   const navigation = useNavigation();

//   const [availability, setAvailability] = useState(
//     days.map((day) => ({
//       day,
//       openTime: new Date(),
//       closeTime: new Date(),
//       enabled: true,
//       locations: ["13th_street"],
//     }))
//   );

//   const [activePickerIndex, setActivePickerIndex] = useState(null);
//   const [pickerField, setPickerField] = useState(null);
//   const [isPickerVisible, setPickerVisible] = useState(false);

//   const showTimePicker = (index, field) => {
//     setActivePickerIndex(index);
//     setPickerField(field);
//     setPickerVisible(true);
//   };

//   const handleConfirm = (selectedDate) => {
//     const updated = [...availability];
//     if (pickerField && activePickerIndex !== null) {
//       updated[activePickerIndex][pickerField] = selectedDate;
//       setAvailability(updated);
//     }
//     setPickerVisible(false);
//   };

//   const toggleSwitch = (index) => {
//     const updated = [...availability];
//     updated[index].enabled = !updated[index].enabled;
//     setAvailability(updated);
//   };

//   const updateLocation = (index, locIndex, value) => {
//     const updated = [...availability];
//     updated[index].locations[locIndex] = value;
//     setAvailability(updated);
//   };

//   const addLocation = (index) => {
//     const updated = [...availability];
//     updated[index].locations.push("");
//     setAvailability(updated);
//   };

//   return (
//     <View style={styles.container}>
//       <StatusBar backgroundColor={AppColor.white} barStyle="dark-content" />

//       {/* Header */}
//       <View style={[styles.header, { paddingTop: insets.top }]}>
//         <IconButton
//           icon="arrow-left"
//           iconColor={AppColor.black}
//           size={24}
//           onPress={() => navigation.goBack()}
//         />
//         <Text style={styles.headerTitle}>Set Availability</Text>
//         <View style={{ width: 48 }} />
//       </View>

//       <ScrollView
//         contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom }}
//         bounces={false}
//         showsVerticalScrollIndicator={false}
//       >
//         <View style={{ flex: 1 }}>
//           {/* Step Container */}
//           <View style={styles.stepContainer}>
//             {/* Step 1 - filled circle with checkmark */}
//             <View style={styles.stepSubContainer}>
//               <View style={styles.filledCircle}>
//                 <FontAwesome6 name="check" color={AppColor.white} size={18} />
//               </View>
//             </View>

//             {/* Line connecting steps */}
//             <View style={styles.line} />

//             {/* Step 2 - filled circle with checkmark */}
//             <View style={styles.stepSubContainer}>
//               <View style={styles.filledCircle}>
//                 <FontAwesome6 name="check" color={AppColor.white} size={18} />
//               </View>
//             </View>
//           </View>

//           {/* SubHeader */}
//           <View
//             style={{
//               backgroundColor: AppColor.white,
//               paddingHorizontal: 16,
//               paddingVertical: 30,
//             }}
//           >
//             <Text
//               style={{
//                 marginBottom: 12,
//                 color: AppColor.black,
//                 fontSize: 24,
//                 fontFamily: Primary400,
//               }}
//             >
//               Availability
//             </Text>
//             <Text
//               style={{
//                 color: "#606268",
//                 fontSize: 14,
//                 fontFamily: Secondary400,
//               }}
//             >
//               Set open & close time of your food-truck
//             </Text>
//           </View>

//           {/* Days Container */}
//           <View style={{ padding: 16 }}>
//             {availability.map((item, index) => (
//               <View key={index} style={styles.dayContainer}>
//                 {item.locations.map((loc, locIndex) => (
//                   <View
//                     key={`${index}-${locIndex}`}
//                     style={{ marginBottom: 16 }}
//                   >
//                     <View style={styles.timeRow}>
//                       {/* Day circle or truck icon */}
//                       <View style={styles.dayCircle}>
//                         <Text style={{ color: "#fff", fontSize: 16 }}>
//                           {item.day}
//                         </Text>
//                       </View>

//                       {/* Open Time */}
//                       <TouchableOpacity
//                         onPress={() => showTimePicker(index, "openTime")}
//                       >
//                         <Text style={styles.timeLabel}>
//                           {item.openTime.toLocaleTimeString([], {
//                             hour: "2-digit",
//                             minute: "2-digit",
//                           })}
//                         </Text>
//                         <Text style={styles.timeSubLabel}>Open</Text>
//                       </TouchableOpacity>

//                       {/* Close Time */}
//                       <TouchableOpacity
//                         onPress={() => showTimePicker(index, "closeTime")}
//                       >
//                         <Text style={styles.timeLabel}>
//                           {item.closeTime.toLocaleTimeString([], {
//                             hour: "2-digit",
//                             minute: "2-digit",
//                           })}
//                         </Text>
//                         <Text style={styles.timeSubLabel}>Close</Text>
//                       </TouchableOpacity>

//                       {/* Switch */}
//                       <Switch
//                         trackColor={AppColor.primary}
//                         value={item.enabled}
//                         onValueChange={() => toggleSwitch(index)}
//                       />
//                     </View>

//                     {/* Location Dropdown */}
//                     <Dropdown
//                       data={dummyLocations}
//                       labelField="label"
//                       valueField="value"
//                       value={loc}
//                       onChange={(selected) =>
//                         updateLocation(index, locIndex, selected.value)
//                       }
//                       style={styles.dropdown}
//                       placeholder="Select Location"
//                     />

//                     {/* Optional divider between entries */}
//                     {locIndex !== item.locations.length - 1 && (
//                       <View
//                         style={{
//                           borderBottomColor: "#E5E5EA",
//                           borderBottomWidth: 1,
//                           marginTop: 16,
//                         }}
//                       />
//                     )}
//                   </View>
//                 ))}

//                 {/* Add Location button inside the container */}
//                 <Button
//                   icon="plus"
//                   mode="outlined"
//                   onPress={() => addLocation(index)}
//                   style={styles.addButton}
//                 >
//                   Add Location
//                 </Button>
//               </View>
//             ))}
//           </View>

//           <Button
//             mode="contained"
//             onPress={() => console.log("Submit:", availability)}
//             style={{ margin: 20 }}
//           >
//             Continue
//           </Button>
//         </View>
//       </ScrollView>

//       {/* Time Picker */}
//       <DateTimePickerModal
//         isVisible={isPickerVisible}
//         mode="time"
//         date={availability[activePickerIndex]?.[pickerField] || new Date()}
//         onConfirm={handleConfirm}
//         onCancel={() => setPickerVisible(false)}
//         is24Hour={false}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F9FAFB",
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     backgroundColor: AppColor.white,
//     paddingHorizontal: 8,
//     paddingBottom: 5,
//     borderBottomWidth: 1,
//     borderColor: "#E5E5EA",
//   },
//   headerTitle: {
//     color: AppColor.black,
//     fontSize: 20,
//     fontFamily: Primary400,
//   },

//   stepContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     marginVertical: 15,
//   },
//   stepSubContainer: {
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   filledCircle: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: AppColor.primary,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   line: {
//     width: "25%",
//     height: 2,
//     backgroundColor: AppColor.primary,
//   },

//   dayContainer: {
//     marginBottom: 16,
//     padding: 16,
//     backgroundColor: AppColor.white,
//     borderWidth: 1,
//     borderRadius: 10,
//     borderColor: "#E5E5EA",
//   },
//   dayCircle: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: AppColor.primary,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   timeRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   timeLabel: {
//     fontSize: 16,
//     color: AppColor.black,
//     textAlign: "center",
//   },
//   timeSubLabel: {
//     fontSize: 12,
//     color: "#888",
//     textAlign: "center",
//   },
//   dropdown: {
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 6,
//     paddingHorizontal: 12,
//     marginTop: 12,
//   },
//   addButton: {
//     marginBottom: 16,
//     borderRadius: 6,
//   },
// });

import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Text, Button, Switch, IconButton } from "react-native-paper";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Dropdown } from "react-native-element-dropdown";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dummyLocations = [
  { label: "13th Street", value: "13th_street" },
  { label: "Charlotte", value: "charlotte" },
  { label: "Downtown", value: "downtown" },
  { label: "Uptown", value: "uptown" },
];

export default function AvailabilityScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [availability, setAvailability] = useState(
    days.map((day) => ({
      day,
      locations: [
        {
          value: "13th_street",
          openTime: new Date(),
          closeTime: new Date(),
          enabled: true,
        },
      ],
    }))
  );

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

  const updateLocation = (dayIndex, locIndex, value) => {
    const updated = [...availability];
    updated[dayIndex].locations[locIndex].value = value;
    setAvailability(updated);
  };

  const addLocation = (dayIndex) => {
    const updated = [...availability];
    updated[dayIndex].locations.push({
      value: "",
      openTime: new Date(),
      closeTime: new Date(),
      enabled: true,
    });
    setAvailability(updated);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={AppColor.white} barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Set Availability</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1 }}>
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
          </View>

          <View
            style={{
              backgroundColor: AppColor.white,
              paddingHorizontal: 16,
              paddingVertical: 30,
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
                        {locIndex === 0 ? (
                          <Text style={{ color: "#fff", fontSize: 16 }}>
                            {item.day}
                          </Text>
                        ) : (
                          <FontAwesome6
                            name="truck-fast"
                            color="#fff"
                            size={18}
                          />
                        )}
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
                      data={dummyLocations}
                      labelField="label"
                      valueField="value"
                      value={loc.value}
                      onChange={(selected) =>
                        updateLocation(index, locIndex, selected.value)
                      }
                      style={styles.dropdown}
                      placeholder="Select Location"
                    />

                    {locIndex !== item.locations.length - 1 && (
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
                >
                  Add Location
                </Button>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert("Hi", "", [
                { text: "Ok", onPress: () => console.log("Hyy") },
              ])
            }
          >
            <Text style={styles.continueButtonText}>{"Continue"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    color: AppColor.black,
    textAlign: "center",
  },
  timeSubLabel: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
  dropdown: {
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
