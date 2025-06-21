// import React, { useEffect, useState } from "react";
// import {
//   StyleSheet,
//   Text,
//   View,
//   TouchableOpacity,
//   Alert,
//   Pressable,
//   Platform,
//   ScrollView,
// } from "react-native";
// import { useDispatch, useSelector } from "react-redux";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
// import { AppColor, Primary400, Secondary400 } from "../utils/theme";
// import StatusBarManager from "../components/StatusBarManager";
// import FastImage from "@d11/react-native-fast-image";
// import CustomBanner from "../components/CustomBanner";
// import { getUserDetail_API, updateFoodTruckProfile_API } from "../api/appAPI";
// import { setUser, updateFoodTruck } from "../redux/slices/userSlice";
// import LabeledSwitch from "../components/LabeledSwitch";
// import { useSharedValue } from "react-native-reanimated";
// import { Dropdown } from "react-native-element-dropdown";
// import { showSnackbar } from "../redux/slices/snackbarSlice";
// import { Divider } from "react-native-paper";
// import moment from "moment";

// const QuickStatsComponent = ({ title, subTitle, icon }) => (
//   <View
//     style={{
//       flexDirection: "row",
//       alignItems: "center",
//       gap: 16,
//       justifyContent: "space-between",
//       marginTop: 16,
//       marginBottom: 8,
//     }}
//   >
//     <View style={{ flex: 1, gap: 4 }}>
//       <Text
//         numberOfLines={1}
//         style={{
//           fontFamily: Secondary400,
//           fontSize: 14,
//           color: "#6F6F6F",
//         }}
//       >
//         {title}
//       </Text>
//       <Text
//         numberOfLines={1}
//         style={{
//           fontFamily: Secondary400,
//           fontSize: 16.7,
//           color: AppColor.black,
//         }}
//       >
//         {subTitle}
//       </Text>
//     </View>
//     <FastImage source={icon} style={{ height: 49, width: 49 }} />
//   </View>
// );

// const HomeScreen = () => {
//   const dispatch = useDispatch();
//   const insets = useSafeAreaInsets();
//   const { user } = useSelector((state) => state.userReducer);

//   const HEADER_HEIGHT = 60;
//   const totalHeaderHeight = insets.top + HEADER_HEIGHT;

//   const [bannerVisible, setBannerVisible] = useState(false);
//   const [bannerLoading, setBannerLoading] = useState(false);
//   const [locations, setLocations] = useState([]);
//   const [selectedLocation, setSelectedLocation] = useState(null);
//   const [isOpen, setIsOpen] = useState(false);

//   const isOn = useSharedValue(false);

//   const handlePress = async () => {
//     if (!selectedLocation && !isOn.value) {
//       Alert.alert("Please select a location");
//       return;
//     }

//     let temp_isOn = isOn.value;
//     let temp_isOpen = isOpen;

//     isOn.value = !temp_isOn;
//     setIsOpen(!temp_isOpen);

//     try {
//       const foodtruck_id = user?.foodTruck?._id;
//       const payload = {
//         currentLocation: !isOn.value ? selectedLocation : null,
//       };
//       const response = await updateFoodTruckProfile_API({
//         payload,
//         foodTruckId: foodtruck_id,
//       });
//       if (response?.success && response.data) {
//         console.log("response => ", response);
//         dispatch(updateFoodTruck(response.data.foodtruck));

//         dispatch(
//           showSnackbar({
//             message: "Currentlocation Status Updated!",
//             type: "success",
//           })
//         );
//       }
//     } catch (error) {
//       console.log("error => ", error);
//       isOn.value = temp_isOn;
//       setIsOpen(temp_isOpen);
//       dispatch(
//         showSnackbar({
//           message: "Something went wrong!",
//           type: "error",
//         })
//       );
//     } finally {
//     }
//   };

//   const getUserDataFromAPI = async () => {
//     setBannerLoading(true);
//     try {
//       const user_id = user._id;
//       const response = await getUserDetail_API(user_id);
//       if (response?.success && response.data) {
//         console.log("response => ", response);
//         dispatch(setUser(response.data.user));
//       }
//     } catch (error) {
//       console.log("error => ", error);
//     } finally {
//       setBannerLoading(false);
//     }
//   };

//   const handleLocationChange = (selected) => {
//     console.log("selected => ", selected);
//     setSelectedLocation(selected?._id);
//   };

//   useEffect(() => {
//     getUserDataFromAPI();
//   }, []);

//   useEffect(() => {
//     setBannerVisible(user?.requestStatus === "PENDING" ? true : false);
//   }, [user?.requestStatus]);

//   useEffect(() => {
//     setLocations(user?.foodTruck?.locations || []);
//     setSelectedLocation(user?.foodTruck?.currentLocation);
//     if (user?.foodTruck?.currentLocation) {
//       isOn.value = true;
//       setIsOpen(true);
//     } else {
//       isOn.value = false;
//       setIsOpen(false);
//     }
//   }, [user?.foodTruck?.locations]);

//   return (
//     <View style={styles.container}>
//       <StatusBarManager />

//       {/* Header */}
//       <View
//         style={{
//           height: totalHeaderHeight,
//           flexDirection: "row",
//           alignItems: "flex-end",
//           justifyContent: "space-between",
//           paddingTop: insets.top,
//           paddingBottom: 10,
//           backgroundColor: AppColor.white,
//           paddingHorizontal: 16,
//           borderBottomWidth: 1,
//           borderColor: "#E5E5EA",
//         }}
//       >
//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "center",
//             gap: 10,
//           }}
//         >
//           <FastImage
//             source={{ uri: user?.foodTruck?.logo }}
//             style={{ height: 44, width: 44, borderRadius: 22 }}
//           />
//           <Text
//             numberOfLines={1}
//             style={{
//               fontSize: 18,
//               fontFamily: Primary400,
//               color: AppColor.black,
//             }}
//           >
//             {user?.foodTruck?.name || ""}
//           </Text>
//         </View>
//         <TouchableOpacity
//           activeOpacity={0.7}
//           style={{
//             width: "10%",
//             alignItems: "flex-end",
//           }}
//         >
//           <MaterialCommunityIcons
//             name="bell-circle"
//             size={38}
//             color={AppColor.primary}
//           />
//         </TouchableOpacity>
//       </View>

//       {/* Banner for pending status */}
//       <CustomBanner
//         visible={bannerVisible}
//         initialOffsetY={totalHeaderHeight}
//         actions={[
//           {
//             label: "Refresh",
//             loading: bannerLoading,
//             onPress: getUserDataFromAPI,
//           },
//         ]}
//       >
//         {"Your vendor profile is under review."}
//       </CustomBanner>

//       <ScrollView
//         contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* Location and Switch */}
//         {!bannerVisible ? (
//           <View
//             style={{
//               gap: 10,
//               flexDirection: "row",
//               alignItems: "flex-start",
//               paddingHorizontal: 16,
//               paddingVertical: 16,
//               backgroundColor: AppColor.white,
//               shadowColor: AppColor.black,
//               shadowOffset: { width: 0, height: 1 },
//               shadowOpacity: 0.1,
//               shadowRadius: 1,
//               elevation: 2,
//             }}
//           >
//             <View style={{ flex: 1 }}>
//               <Dropdown
//                 data={locations}
//                 labelField="title"
//                 valueField="_id"
//                 value={selectedLocation}
//                 onChange={(selected) => handleLocationChange(selected)}
//                 placeholder="Select Location"
//                 style={styles.dropdown}
//                 placeholderStyle={{
//                   fontFamily: Secondary400,
//                   color: AppColor.textHighlighter,
//                 }}
//                 itemTextStyle={{ fontFamily: Secondary400 }}
//                 selectedTextStyle={{ fontFamily: Secondary400 }}
//                 disable={isOpen}
//               />
//               <Pressable
//                 onPress={() => {
//                   if (isOpen) {
//                     Alert.alert(
//                       "Cannot Change Location",
//                       "Please close the food truck first to change location"
//                     );
//                   }
//                 }}
//                 style={{
//                   flex: 1,
//                   position: "absolute",
//                   top: 0,
//                   left: 0,
//                   right: 0,
//                   bottom: 0,
//                   display: isOpen ? "flex" : "none",
//                 }}
//               />
//             </View>
//             <View style={{ alignItems: "center" }}>
//               <LabeledSwitch value={isOn} onPress={handlePress} />
//               <Text
//                 style={{
//                   fontFamily: Secondary400,
//                   fontSize: 12,
//                   color: AppColor.black,
//                   marginTop: 5,
//                 }}
//               >
//                 {isOpen ? "Open" : "Closed"}
//               </Text>
//             </View>
//           </View>
//         ) : null}

//         <View style={styles.content}>
//           {/* New Order */}
//           <View
//             style={{
//               backgroundColor: AppColor.white,
//               marginTop: 16,
//             }}
//           >
//             {/* title */}
//             <View
//               style={{
//                 padding: 16,
//               }}
//             >
//               <Text
//                 style={{
//                   fontFamily: Primary400,
//                   fontSize: 18,
//                   color: AppColor.black,
//                 }}
//               >
//                 {"new Order"}
//               </Text>
//             </View>
//             <Divider />
//             <View
//               style={{
//                 margin: 16,
//                 paddingHorizontal: 8,
//                 paddingVertical: 16,
//                 borderWidth: 1,
//                 borderRadius: 8,
//                 borderColor: AppColor.border,
//               }}
//             >
//               {/* Order ID Text */}
//               <Text
//                 style={{
//                   fontFamily: Secondary400,
//                   fontSize: 14,
//                   color: "#6F6F6F",
//                   marginHorizontal: 16,
//                 }}
//               >
//                 {"Order #126265"}
//               </Text>
//               <View
//                 style={{
//                   flexDirection: "row",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   marginVertical: 16,
//                   marginHorizontal: 8,
//                 }}
//               >
//                 <View
//                   style={{
//                     height: 50,
//                     width: 50,
//                     borderWidth: 1,
//                     borderRadius: 24.5,
//                     borderColor: AppColor.border,
//                   }}
//                 >
//                   <FastImage
//                     source={{ uri: user?.foodTruck?.logo }}
//                     style={{
//                       height: 48,
//                       width: 48,
//                       borderRadius: 24,
//                     }}
//                   />
//                 </View>
//                 <View style={{ flex: 1, marginHorizontal: 8 }}>
//                   <Text
//                     style={{
//                       fontFamily: Primary400,
//                       fontSize: 16,
//                       color: AppColor.black,
//                     }}
//                   >
//                     {"John Doe"}
//                   </Text>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 14,
//                       color: "#6F6F6F",
//                       paddingVertical: 5,
//                     }}
//                   >
//                     {"2 Items"}
//                   </Text>
//                 </View>
//                 <View>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 14,
//                       color: "#6F6F6F",
//                     }}
//                   >
//                     {moment().format("DD MMM, YYYY")}
//                   </Text>
//                   <View
//                     style={{
//                       flexDirection: "row",
//                       alignItems: "center",
//                       gap: 4,
//                       paddingVertical: 5,
//                     }}
//                   >
//                     <MaterialCommunityIcons
//                       name="clock-outline"
//                       size={16}
//                       color="#6F6F6F"
//                     />
//                     <Text
//                       style={{
//                         fontFamily: Secondary400,
//                         fontSize: 14,
//                         color: "#6F6F6F",
//                       }}
//                     >
//                       {moment().format("hh:mm A")}
//                     </Text>
//                   </View>
//                 </View>
//               </View>
//               <Divider style={{ marginHorizontal: 8 }} />
//               {/* Item Details */}
//               <View
//                 style={{
//                   flexDirection: "row",
//                   alignItems: "center",
//                   marginHorizontal: 8,
//                   marginVertical: 8,
//                 }}
//               >
//                 <View style={{ flex: 1, gap: 4 }}>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 14,
//                       color: AppColor.black,
//                     }}
//                   >
//                     {"1 x Taco Express"}
//                   </Text>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 14,
//                       color: AppColor.black,
//                     }}
//                   >
//                     {"Cor tortilla, beef, lettuce, cheese"}
//                   </Text>
//                 </View>
//                 <View>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 14,
//                       color: AppColor.black,
//                     }}
//                   >
//                     {"$9.49"}
//                   </Text>
//                 </View>
//               </View>
//               <View
//                 style={{
//                   flexDirection: "row",
//                   alignItems: "center",
//                   marginHorizontal: 8,
//                   marginVertical: 8,
//                 }}
//               >
//                 <View style={{ flex: 1, gap: 4 }}>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 14,
//                       color: AppColor.black,
//                     }}
//                   >
//                     {"1 x Burrito Bowl"}
//                   </Text>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 14,
//                       color: AppColor.black,
//                     }}
//                   >
//                     {"Cor tortilla, beef, lettuce, cheese"}
//                   </Text>
//                 </View>
//                 <View>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 14,
//                       color: AppColor.black,
//                     }}
//                   >
//                     {"$9.49"}
//                   </Text>
//                 </View>
//               </View>
//               <View
//                 style={{
//                   flexDirection: "row",
//                   alignItems: "center",
//                   marginHorizontal: 8,
//                   marginVertical: 8,
//                 }}
//               >
//                 <View
//                   style={{
//                     flex: 1,
//                     gap: 8,
//                     flexDirection: "row",
//                     alignItems: "center",
//                   }}
//                 >
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 14,
//                       color: AppColor.black,
//                     }}
//                   >
//                     {"1 x Dessert"}
//                   </Text>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 10,
//                       color: "#008B8B",
//                       backgroundColor: "#C2FFFF",
//                       paddingHorizontal: 8,
//                       paddingVertical: 4,
//                       borderRadius: 4,
//                       letterSpacing: 0.8,
//                     }}
//                   >
//                     {"Free"}
//                   </Text>
//                 </View>
//                 <View>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 14,
//                       color: AppColor.black,
//                     }}
//                   >
//                     {"$0.00"}
//                   </Text>
//                 </View>
//               </View>
//               <Divider style={{ marginHorizontal: 8 }} />
//               {/* Total */}
//               <View
//                 style={{
//                   flexDirection: "row",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   marginHorizontal: 8,
//                   marginTop: 16,
//                 }}
//               >
//                 <Text
//                   style={{
//                     fontFamily: Secondary400,
//                     fontSize: 20,
//                     color: AppColor.black,
//                   }}
//                 >
//                   {"$15.73"}
//                 </Text>
//                 <View
//                   style={{
//                     flexDirection: "row",
//                     alignItems: "center",
//                     gap: 16,
//                   }}
//                 >
//                   <TouchableOpacity
//                     style={styles.rejectOrderBtn}
//                     activeOpacity={0.7}
//                     // onPress={onCancelPress}
//                   >
//                     <Text
//                       style={[styles.orderBtnText, { color: AppColor.primary }]}
//                     >
//                       {"Reject"}
//                     </Text>
//                   </TouchableOpacity>

//                   <TouchableOpacity
//                     style={styles.acceptOrderBtn}
//                     activeOpacity={0.7}
//                     // onPress={onValidateBtnPress}
//                   >
//                     <Text style={styles.orderBtnText}>{"Accept & Print"}</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </View>
//           </View>

//           {/* Sales Overview */}
//           <View
//             style={{
//               backgroundColor: AppColor.white,
//               marginTop: 16,
//               paddingBottom: 8,
//             }}
//           >
//             <View
//               style={{
//                 padding: 16,
//               }}
//             >
//               <Text
//                 style={{
//                   fontFamily: Primary400,
//                   fontSize: 18,
//                   color: AppColor.black,
//                 }}
//               >
//                 {"Sales Overview"}
//               </Text>
//             </View>
//             <Divider />
//             <View
//               style={{
//                 gap: 16,
//                 padding: 16,
//                 flexDirection: "row",
//               }}
//             >
//               <View
//                 style={{
//                   flex: 1 / 2,
//                   borderRadius: 10,
//                   backgroundColor: AppColor.primary,
//                   padding: 16,
//                 }}
//               >
//                 <FastImage
//                   source={require("../assets/images/pieChartIcon.png")}
//                   style={{ height: 23.09, width: 24.42, alignSelf: "flex-end" }}
//                 />
//                 <View style={{ marginTop: 5, gap: 5 }}>
//                   <Text
//                     style={{
//                       fontFamily: Primary400,
//                       fontSize: 24.65,
//                       color: AppColor.white,
//                     }}
//                   >
//                     {"$2,500"}
//                   </Text>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 12.33,
//                       color: AppColor.white,
//                     }}
//                   >
//                     {"Today’s Sales "}
//                   </Text>
//                 </View>
//               </View>
//               <View
//                 style={{
//                   flex: 1 / 2,
//                   borderRadius: 10,
//                   backgroundColor: "#008B8B",
//                   padding: 16,
//                 }}
//               >
//                 <FastImage
//                   source={require("../assets/images/pieChartIcon.png")}
//                   style={{ height: 23.09, width: 24.42, alignSelf: "flex-end" }}
//                 />
//                 <View style={{ marginTop: 5, gap: 5 }}>
//                   <Text
//                     style={{
//                       fontFamily: Primary400,
//                       fontSize: 24.65,
//                       color: AppColor.white,
//                     }}
//                   >
//                     {"15"}
//                   </Text>
//                   <Text
//                     style={{
//                       fontFamily: Secondary400,
//                       fontSize: 12.33,
//                       color: AppColor.white,
//                     }}
//                   >
//                     {"Today’s Order"}
//                   </Text>
//                 </View>
//               </View>
//             </View>
//           </View>

//           {/* Quick Stats */}
//           <View
//             style={{
//               backgroundColor: AppColor.white,
//               marginTop: 16,
//             }}
//           >
//             <View
//               style={{
//                 padding: 16,
//               }}
//             >
//               <Text
//                 style={{
//                   fontFamily: Primary400,
//                   fontSize: 18,
//                   color: AppColor.black,
//                 }}
//               >
//                 {"Sales Overview"}
//               </Text>
//             </View>
//             <Divider />
//             <View
//               style={{
//                 paddingHorizontal: 16,
//                 paddingVertical: 8,
//               }}
//             >
//               <QuickStatsComponent
//                 title={"Monthly Earnings"}
//                 subTitle={"$350.00"}
//                 icon={require("../assets/images/monthlyEarningIcon.png")}
//               />
//               <QuickStatsComponent
//                 title={"Monthly Delivered Desserts"}
//                 subTitle={"50"}
//                 icon={require("../assets/images/monthlyDeliveredDessertIcon.png")}
//               />
//               <QuickStatsComponent
//                 title={"Active Customers"}
//                 subTitle={"35"}
//                 icon={require("../assets/images/activeCustomerIcon.png")}
//               />
//               <QuickStatsComponent
//                 title={"Trending Items"}
//                 subTitle={"Burger"}
//                 icon={require("../assets/images/trendingItemsIcon.png")}
//               />
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F9FAFB",
//   },
//   content: {
//     flex: 1,
//   },
//   dropdown: {
//     height: 50,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 6,
//     paddingHorizontal: 12,
//   },

//   acceptOrderBtn: {
//     height: 46,
//     borderRadius: 5,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: AppColor.primary,
//     paddingHorizontal: 16,
//     ...Platform.select({
//       ios: {
//         shadowColor: AppColor.black,
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.3,
//         shadowRadius: 4,
//       },
//       android: {
//         elevation: 4,
//       },
//     }),
//   },
//   rejectOrderBtn: {
//     height: 46,
//     borderWidth: 1,
//     borderRadius: 5,
//     borderColor: AppColor.primary,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingHorizontal: 16,
//   },
//   orderBtnText: {
//     color: AppColor.white,
//     fontFamily: Secondary400,
//     fontSize: 16,
//   },
// });

import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import FastImage from "@d11/react-native-fast-image";
import CustomBanner from "../components/CustomBanner";
import {
  getOrderList_API,
  getUserDetail_API,
  updateFoodTruckProfile_API,
  updateOrderStatusByID_API,
} from "../api/appAPI";
import { setUser, updateFoodTruck } from "../redux/slices/userSlice";
import LabeledSwitch from "../components/LabeledSwitch";
import { useSharedValue } from "react-native-reanimated";
import { Dropdown } from "react-native-element-dropdown";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { Divider } from "react-native-paper";
import moment from "moment";
import { useFocusEffect } from "@react-navigation/native";
import { orderStatusStrings, PROFILE_AVATAR } from "../utils/constants";
import { checkInstallationId } from "../helpers/notification.helper";
import { getMessaging } from "@react-native-firebase/messaging";
import { calculateTotalPreparationTime } from "../helpers/order.helper";
import CustomPrepTimeModal from "../components/CustomPrepTimeModal";

const QuickStatsComponent = ({ title, subTitle, icon }) => (
  <View style={styles.quickStatsContainer}>
    <View style={styles.quickStatsTextContainer}>
      <Text numberOfLines={1} style={styles.quickStatsTitle}>
        {title}
      </Text>
      <Text numberOfLines={1} style={styles.quickStatsSubTitle}>
        {subTitle}
      </Text>
    </View>
    <FastImage source={icon} style={styles.quickStatsIcon} />
  </View>
);

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state) => state.userReducer);

  const HEADER_HEIGHT = 60;
  const totalHeaderHeight = insets.top + HEADER_HEIGHT;

  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [newOrderLoading, setNewOrderLoading] = useState(false);
  const [newOrderData, setNewOrderData] = useState(null);
  const [timeModal, setTimeModal] = useState(null);
  const [prepTimeError, setPrepTimeError] = useState("");

  const isOn = useSharedValue(false);

  const handlePress = async () => {
    if (!selectedLocation && !isOn.value) {
      Alert.alert("Please select a location");
      return;
    }

    let temp_isOn = isOn.value;
    let temp_isOpen = isOpen;

    isOn.value = !temp_isOn;
    setIsOpen(!temp_isOpen);

    try {
      const foodtruck_id = user?.foodTruck?._id;
      const payload = {
        currentLocation: !isOn.value ? selectedLocation : null,
      };
      const response = await updateFoodTruckProfile_API({
        payload,
        foodTruckId: foodtruck_id,
      });
      if (response?.success && response.data) {
        console.log("response => ", response);
        dispatch(updateFoodTruck(response.data.foodtruck));

        dispatch(
          showSnackbar({
            message: "Currentlocation Status Updated!",
            type: "success",
          })
        );
      }
    } catch (error) {
      console.log("error => ", error);
      isOn.value = temp_isOn;
      setIsOpen(temp_isOpen);
      dispatch(
        showSnackbar({
          message: "Something went wrong!",
          type: "error",
        })
      );
    } finally {
    }
  };

  const getUserDataFromAPI = async () => {
    setBannerLoading(true);
    try {
      const user_id = user._id;
      const response = await getUserDetail_API(user_id);
      if (response?.success && response.data) {
        console.log("response => ", response);
        dispatch(setUser(response.data.user));
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setBannerLoading(false);
    }
  };

  const handleLocationChange = (selected) => {
    console.log("selected => ", selected);
    setSelectedLocation(selected?._id);
  };

  // Modal cancel press
  const onModalCancelPress = () => {
    setTimeModal(null);
  };

  // Handle "accept & print" press
  const handleAcceptAndPrintPress = (order) => {
    const estimatedPrepTime = calculateTotalPreparationTime(order);
    setTimeModal({
      orderData: order,
      isVisible: true,
      loading: false,
      prepTime: `${estimatedPrepTime}`,
    });
  };

  // handle prep time submit
  const handleSubmitPrepTime = async () => {
    const prepTime = timeModal?.prepTime;

    // Check if prepTime exists
    if (!prepTime) {
      setPrepTimeError("Preparation time is required");
      return;
    }

    // Check if prepTime contains only digits
    if (!/^\d+$/.test(prepTime)) {
      setPrepTimeError("Preparation time must contain only numbers");
      return;
    }

    // Convert to number for range validation
    const prepTimeNum = Number(prepTime);

    // Check if prepTime is within 0-120 range
    if (prepTimeNum < 0 || prepTimeNum > 120) {
      setPrepTimeError("Preparation time must be between 0 and 120 minutes");
      return;
    }

    // Clear error if all validations pass
    setPrepTimeError("");

    setTimeModal((prev) => ({
      ...prev,
      loading: true,
    }));
    try {
      const response = await updateOrderStatusByID_API({
        order_id: timeModal?.orderData?._id,
        payload: {
          orderStatus: "PREPARING",
          pickupTime: `${prepTimeNum}`,
        },
      });
      console.log("response => ", response);
      if (response.success && response.data) {
        dispatch(
          showSnackbar({
            type: "success",
            message: "Order status updated successfully",
          })
        );
        getOrderDataFromAPI(); // to checking for new order.
        setTimeModal(null);
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(
        showSnackbar({
          type: "error",
          message: "Something went wrong!",
        })
      );
      setTimeModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  // Handle "reject" press
  const handleRejectOrderPress = (order) => {
    Alert.alert(
      "Reject Order!",
      "Are you sure you want to reject this order?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await updateOrderStatusByID_API({
                order_id: order?._id,
                payload: {
                  orderStatus: "REJECTED",
                },
              });
              console.log("response => ", response);
              if (response.success && response.data) {
                dispatch(
                  showSnackbar({
                    type: "success",
                    message: "Order status updated successfully",
                  })
                );
                getOrderDataFromAPI(); // to checking for new order.
              }
            } catch (error) {
              console.log("error => ", error);
              dispatch(
                showSnackbar({
                  type: "error",
                  message: "Something went wrong!",
                })
              );
            } finally {
            }
          },
        },
      ]
    );
  };

  // new order data API
  const getOrderDataFromAPI = async () => {
    setNewOrderLoading(true);
    try {
      const response = await getOrderList_API({
        limit: 1,
        status: orderStatusStrings.placed,
      });
      console.log("reponse => ", response);
      if (
        response.success &&
        response.data &&
        response.data.orderList?.length &&
        response.data.orderList[0].orderStatus === orderStatusStrings.placed
      ) {
        setNewOrderData(response.data.orderList[0]);
      } else {
        setNewOrderData(null);
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(
        showSnackbar({
          type: "error",
          message: error.message,
        })
      );
    } finally {
      setNewOrderLoading(false);
    }
  };

  // Fetch new order data on focus
  useFocusEffect(
    useCallback(() => {
      getOrderDataFromAPI();
    }, [])
  );

  useEffect(() => {
    const unsubscribe = getMessaging().onTokenRefresh(async (newToken) => {
      console.log("FCM-Token Refreshed =>", newToken);

      const deviceId = await checkInstallationId();
      if (!deviceId) return;

      try {
        const payload = { token: newToken };
        const response = await updateDeviceToken_API({ deviceId, payload });
        console.log("response => ", response);
      } catch (error) {
        console.log("error => ", error);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    setBannerVisible(user?.requestStatus === "PENDING" ? true : false);
  }, [user?.requestStatus]);

  useEffect(() => {
    setLocations(user?.foodTruck?.locations || []);
    setSelectedLocation(user?.foodTruck?.currentLocation);
    if (user?.foodTruck?.currentLocation) {
      isOn.value = true;
      setIsOpen(true);
    } else {
      isOn.value = false;
      setIsOpen(false);
    }
  }, [user?.foodTruck?.locations]);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={[
          styles.headerContainer,
          { height: totalHeaderHeight, paddingTop: insets.top },
        ]}
      >
        <View style={styles.headerLeftContainer}>
          <FastImage
            source={{ uri: user?.foodTruck?.logo }}
            style={styles.headerLogo}
          />
          <Text numberOfLines={1} style={styles.headerTitle}>
            {user?.foodTruck?.name || ""}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerRightContainer}
        >
          <MaterialCommunityIcons
            name="bell-circle"
            size={38}
            color={AppColor.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Banner for pending status */}
      <CustomBanner
        visible={bannerVisible}
        initialOffsetY={totalHeaderHeight}
        actions={[
          {
            label: "Refresh",
            loading: bannerLoading,
            onPress: getUserDataFromAPI,
          },
        ]}
      >
        {"Your vendor profile is under review."}
      </CustomBanner>

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Location and Switch */}
        {!bannerVisible ? (
          <View style={styles.locationSwitchContainer}>
            <View style={styles.dropdownContainer}>
              <Dropdown
                data={locations}
                labelField="title"
                valueField="_id"
                value={selectedLocation}
                onChange={(selected) => handleLocationChange(selected)}
                placeholder="Select Location"
                style={styles.dropdown}
                placeholderStyle={styles.dropdownPlaceholder}
                itemTextStyle={styles.dropdownItemText}
                selectedTextStyle={styles.dropdownSelectedText}
                disable={isOpen}
              />
              <Pressable
                onPress={() => {
                  if (isOpen) {
                    Alert.alert(
                      "Cannot Change Location",
                      "Please close the food truck first to change location"
                    );
                  }
                }}
                style={[
                  styles.dropdownOverlay,
                  { display: isOpen ? "flex" : "none" },
                ]}
              />
            </View>
            <View style={styles.switchContainer}>
              <LabeledSwitch value={isOn} onPress={handlePress} />
              <Text style={styles.switchText}>
                {isOpen ? "Open" : "Closed"}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.content}>
          {/* New Order */}
          <View style={styles.newOrderContainer}>
            {/* title */}
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>{"new Order"}</Text>
            </View>
            <Divider />
            {newOrderData ? (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.orderDetailsContainer}
                onPress={() =>
                  navigation.navigate("orderDetailsScreen", {
                    orderId: newOrderData._id,
                  })
                }
              >
                {/* Order ID Text */}
                <Text style={styles.orderIdText}>
                  {"Order #" + newOrderData?._id}
                </Text>
                <View style={styles.orderHeader}>
                  <View style={styles.orderUserImageContainer}>
                    <FastImage
                      source={{
                        uri: newOrderData.user.profilePic || PROFILE_AVATAR,
                      }}
                      style={styles.orderUserImage}
                    />
                  </View>
                  <View style={styles.orderUserInfo}>
                    <Text
                      style={styles.orderUserName}
                    >{`${newOrderData.user.firstName} ${newOrderData.user.lastName}`}</Text>
                    <Text
                      style={styles.orderItemCount}
                    >{`${newOrderData.items.length} Items`}</Text>
                  </View>
                  <View>
                    <Text style={styles.orderDate}>
                      {moment(newOrderData.createdAt).format("DD MMM, YYYY")}
                    </Text>
                    <View style={styles.orderTimeContainer}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={16}
                        color="#6F6F6F"
                      />
                      <Text style={styles.orderTime}>
                        {moment(newOrderData.createdAt).format("hh:mm A")}
                      </Text>
                    </View>
                  </View>
                </View>
                <Divider style={styles.orderDivider} />
                {/* Item Details */}
                {newOrderData.items.map((item, index) => (
                  <View style={styles.orderItemContainer} key={index}>
                    <View style={styles.orderItemDetails}>
                      <Text
                        style={styles.orderItemName}
                      >{`${item.qty} x ${item.menuItem.name}`}</Text>
                      <Text style={styles.orderItemDescription}>
                        {item.menuItem.description}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={styles.orderItemPrice}
                      >{`$${item.menuItem.price}`}</Text>
                    </View>
                  </View>
                ))}
                {/* for dessert */}
                {/* <View style={styles.orderItemContainer}>
                  <View style={styles.freeItemContainer}>
                    <Text style={styles.orderItemName}>{"1 x Dessert"}</Text>
                    <Text style={styles.freeItemBadge}>{"Free"}</Text>
                  </View>
                  <View>
                    <Text style={styles.orderItemPrice}>{"$0.00"}</Text>
                  </View>
                </View> */}
                <Divider style={styles.orderDivider} />
                {/* Total */}
                <View style={styles.orderTotalContainer}>
                  <Text
                    style={styles.orderTotalText}
                  >{`$${newOrderData.subTotal.toFixed(2)}`}</Text>
                  <View style={styles.orderActionButtons}>
                    <TouchableOpacity
                      style={styles.rejectOrderBtn}
                      activeOpacity={0.7}
                      onPress={() => handleRejectOrderPress(newOrderData)}
                    >
                      <Text
                        style={[
                          styles.orderBtnText,
                          { color: AppColor.primary },
                        ]}
                      >
                        {"Reject"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.acceptOrderBtn}
                      activeOpacity={0.7}
                      onPress={() => handleAcceptAndPrintPress(newOrderData)}
                    >
                      <Text style={styles.orderBtnText}>
                        {"Accept & Print"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <Pressable
                style={{
                  height: 80,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => navigation.navigate("orderScreen")}
              >
                <Text
                  style={{
                    fontFamily: Secondary400,
                    fontSize: 16,
                    color: AppColor.black,
                  }}
                >
                  {"Check current order?"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Sales Overview */}
          <View style={styles.salesOverviewContainer}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>{"Sales Overview"}</Text>
            </View>
            <Divider />
            <View style={styles.salesOverviewCards}>
              <View style={styles.salesCard}>
                <FastImage
                  source={require("../assets/images/pieChartIcon.png")}
                  style={styles.pieChartIcon}
                />
                <View style={styles.salesCardTextContainer}>
                  <Text style={styles.salesCardAmount}>{"$2,500"}</Text>
                  <Text style={styles.salesCardLabel}>{"Today's Sales "}</Text>
                </View>
              </View>
              <View style={[styles.salesCard, { backgroundColor: "#008B8B" }]}>
                <FastImage
                  source={require("../assets/images/pieChartIcon.png")}
                  style={styles.pieChartIcon}
                />
                <View style={styles.salesCardTextContainer}>
                  <Text style={styles.salesCardAmount}>{"15"}</Text>
                  <Text style={styles.salesCardLabel}>{"Today's Order"}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStatsSection}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>{"Quick Stats"}</Text>
            </View>
            <Divider />
            <View style={styles.quickStatsItemsContainer}>
              <QuickStatsComponent
                title={"Monthly Earnings"}
                subTitle={"$350.00"}
                icon={require("../assets/images/monthlyEarningIcon.png")}
              />
              <QuickStatsComponent
                title={"Monthly Delivered Desserts"}
                subTitle={"50"}
                icon={require("../assets/images/monthlyDeliveredDessertIcon.png")}
              />
              <QuickStatsComponent
                title={"Active Customers"}
                subTitle={"35"}
                icon={require("../assets/images/activeCustomerIcon.png")}
              />
              <QuickStatsComponent
                title={"Trending Items"}
                subTitle={"Burger"}
                icon={require("../assets/images/trendingItemsIcon.png")}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Preparation Time Modal */}
      <CustomPrepTimeModal
        timeModal={timeModal}
        setTimeModal={setTimeModal}
        prepTimeError={prepTimeError}
        setPrepTimeError={setPrepTimeError}
        handleSubmitPrepTime={handleSubmitPrepTime}
        onModalCancelPress={onModalCancelPress}
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  acceptOrderBtn: {
    height: 46,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    paddingHorizontal: 16,
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
  rejectOrderBtn: {
    height: 46,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  orderBtnText: {
    color: AppColor.white,
    fontFamily: Secondary400,
    fontSize: 16,
  },
  // New styles
  headerContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 10,
    backgroundColor: AppColor.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
  },
  headerLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    height: 44,
    width: 44,
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Primary400,
    color: AppColor.black,
  },
  headerRightContainer: {
    width: "10%",
    alignItems: "flex-end",
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  locationSwitchContainer: {
    gap: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: AppColor.white,
    shadowColor: AppColor.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  dropdownContainer: {
    flex: 1,
  },
  dropdownPlaceholder: {
    fontFamily: Secondary400,
    color: AppColor.textHighlighter,
  },
  dropdownItemText: {
    fontFamily: Secondary400,
  },
  dropdownSelectedText: {
    fontFamily: Secondary400,
  },
  dropdownOverlay: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  switchContainer: {
    alignItems: "center",
  },
  switchText: {
    fontFamily: Secondary400,
    fontSize: 12,
    color: AppColor.black,
    marginTop: 5,
  },
  newOrderContainer: {
    backgroundColor: AppColor.white,
    marginTop: 16,
  },
  sectionTitleContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontFamily: Primary400,
    fontSize: 18,
    color: AppColor.black,
  },
  orderDetailsContainer: {
    margin: 16,
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: AppColor.border,
  },
  orderIdText: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: "#6F6F6F",
    marginHorizontal: 16,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
    marginHorizontal: 8,
  },
  orderUserImageContainer: {
    height: 50,
    width: 50,
    borderWidth: 1,
    borderRadius: 24.5,
    borderColor: AppColor.border,
  },
  orderUserImage: {
    height: 48,
    width: 48,
    borderRadius: 24,
  },
  orderUserInfo: {
    flex: 1,
    marginHorizontal: 8,
  },
  orderUserName: {
    fontFamily: Primary400,
    fontSize: 16,
    color: AppColor.black,
  },
  orderItemCount: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: "#6F6F6F",
    paddingVertical: 5,
  },
  orderDate: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: "#6F6F6F",
  },
  orderTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
  },
  orderTime: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: "#6F6F6F",
  },
  orderDivider: {
    marginHorizontal: 8,
  },
  orderItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    marginVertical: 8,
  },
  orderItemDetails: {
    flex: 1,
    gap: 4,
  },
  orderItemName: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: AppColor.black,
  },
  orderItemDescription: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: AppColor.black,
  },
  orderItemPrice: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: AppColor.black,
  },
  freeItemContainer: {
    flex: 1,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  freeItemBadge: {
    fontFamily: Secondary400,
    fontSize: 10,
    color: "#008B8B",
    backgroundColor: "#C2FFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    letterSpacing: 0.8,
  },
  orderTotalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 8,
    marginTop: 16,
  },
  orderTotalText: {
    fontFamily: Secondary400,
    fontSize: 20,
    color: AppColor.black,
  },
  orderActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  salesOverviewContainer: {
    backgroundColor: AppColor.white,
    marginTop: 16,
    paddingBottom: 8,
  },
  salesOverviewCards: {
    gap: 16,
    padding: 16,
    flexDirection: "row",
  },
  salesCard: {
    flex: 1 / 2,
    borderRadius: 10,
    backgroundColor: AppColor.primary,
    padding: 16,
  },
  pieChartIcon: {
    height: 23.09,
    width: 24.42,
    alignSelf: "flex-end",
  },
  salesCardTextContainer: {
    marginTop: 5,
    gap: 5,
  },
  salesCardAmount: {
    fontFamily: Primary400,
    fontSize: 24.65,
    color: AppColor.white,
  },
  salesCardLabel: {
    fontFamily: Secondary400,
    fontSize: 12.33,
    color: AppColor.white,
  },
  quickStatsSection: {
    backgroundColor: AppColor.white,
    marginTop: 16,
  },
  quickStatsItemsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickStatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  quickStatsTextContainer: {
    flex: 1,
    gap: 4,
  },
  quickStatsTitle: {
    fontFamily: Secondary400,
    fontSize: 14,
    color: "#6F6F6F",
  },
  quickStatsSubTitle: {
    fontFamily: Secondary400,
    fontSize: 16.7,
    color: AppColor.black,
  },
  quickStatsIcon: {
    height: 49,
    width: 49,
  },
});
