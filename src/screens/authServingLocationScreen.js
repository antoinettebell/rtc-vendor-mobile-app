import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  HelperText,
  IconButton,
  Menu,
  TextInput,
} from "react-native-paper";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import SimpleLineIcons from "react-native-vector-icons/SimpleLineIcons";
import AntDesign from "react-native-vector-icons/AntDesign";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedLocations } from "../redux/slices/foodTruckProfileSlice";
import StatusBarManager from "../components/StatusBarManager";
import Modal from "react-native-modal";

const RenameLocationModal = ({
  data,
  isModalVisible,
  onUpdatePress,
  onCancelPress,
}) => {
  const [title, setTitle] = useState(data?.title || "");
  const [titleError, setTitleError] = useState("");
  const [address, setAddress] = useState(data?.address || "");
  const [addressError, setAddressError] = useState("");
  const [zipCode, setZipCode] = useState(data?.zipcode || "");
  const [zipCodeError, setZipCodeError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) {
      setTitle(data.title || "");
      setAddress(data.address || "");
      setZipCode(data.zipcode || "");
    }
  }, [data]);

  const resetStates = () => {
    setTitle("");
    setTitleError("");
    setAddress("");
    setAddressError("");
    setZipCode("");
    setZipCodeError("");
  };

  const validateText = (text) => {
    return text?.trim()?.length > 0;
  };

  const onValidateBtnPress = async () => {
    const titleErr = validateText(title) ? "" : "Title is required";
    const addressErr = validateText(address) ? "" : "Address is required";
    const zipCodeErr = validateText(zipCode) ? "" : "Zip Code is required";

    setTitleError(titleErr);
    setAddressError(addressErr);
    setZipCodeError(zipCodeErr);

    if (!!titleErr || !!addressErr || !!zipCodeErr) return;

    onUpdatePress({
      payload: {
        initialData: data,
        title,
        address,
        zipcode: zipCode,
      },
      setLoading,
    });
  };

  useEffect(() => {
    if (!isModalVisible) {
      setTimeout(() => {
        resetStates();
      }, 500);
    }
  }, [isModalVisible]);

  return (
    <Modal
      isVisible={isModalVisible}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropTransitionOutTiming={0.5}
    >
      <View style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingVertical: 36,
              paddingHorizontal: 33,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Modal Title */}
            <Text style={styles.modalTitle}>{"Rename Location"}</Text>

            {/* Title Input */}
            <View>
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Title *"}
              </Text>
              <TextInput
                dense
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (validateText(text)) {
                    setTitleError("");
                  }
                }}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Title"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                autoCapitalize="sentences"
                error={!!titleError}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!titleError ? (
                <HelperText
                  type="error"
                  visible={!!titleError}
                  style={styles.helper}
                >
                  {titleError}
                </HelperText>
              ) : null}
            </View>

            {/* Address Input */}
            <View>
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Address *"}
              </Text>
              <TextInput
                dense
                value={address}
                onChangeText={(text) => {
                  setAddress(text);
                  if (validateText(text)) {
                    setAddressError("");
                  }
                }}
                style={styles.input}
                contentStyle={[
                  styles.inputText,
                  { minHeight: 120, maxHeight: 200 },
                ]}
                placeholder="Enter Address"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                autoCapitalize="sentences"
                multiline={true}
                error={!!addressError}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!addressError ? (
                <HelperText
                  type="error"
                  visible={!!addressError}
                  style={styles.helper}
                >
                  {addressError}
                </HelperText>
              ) : null}
            </View>

            {/* Zip Code Input */}
            <View>
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>
                {"Zip Code *"}
              </Text>
              <TextInput
                dense
                value={zipCode}
                onChangeText={(text) => {
                  setZipCode(text);
                  if (validateText(text)) {
                    setZipCodeError("");
                  }
                }}
                style={styles.input}
                contentStyle={styles.inputText}
                placeholder="Enter Zip Code"
                placeholderTextColor={AppColor.placeholderTextColor}
                mode="outlined"
                autoCapitalize="sentences"
                maxLength={6}
                error={!!zipCodeError}
                outlineColor={AppColor.border}
                activeOutlineColor={AppColor.primary}
                outlineStyle={{ borderRadius: 8 }}
                theme={{ colors: { onSurfaceVariant: "#777" } }}
              />
              {!!zipCodeError ? (
                <HelperText
                  type="error"
                  visible={!!zipCodeError}
                  style={styles.helper}
                >
                  {zipCodeError}
                </HelperText>
              ) : null}
            </View>

            {/* Button Update */}
            <TouchableOpacity
              style={[styles.locationModalBtnUpdate, { marginTop: 16 }]}
              activeOpacity={0.7}
              onPress={onValidateBtnPress}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={AppColor.white} />
              ) : (
                <Text style={styles.locationModalBtnText}>{"Update"}</Text>
              )}
            </TouchableOpacity>

            {/* Button Cancel */}
            <TouchableOpacity
              style={styles.locationModalBtnCancel}
              activeOpacity={0.7}
              onPress={onCancelPress}
              disabled={loading}
            >
              <Text
                style={[
                  styles.locationModalBtnText,
                  { color: AppColor.primary },
                ]}
              >
                {"Cancel"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const AuthServingLocationScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedLocations } = useSelector(
    (state) => state.foodTruckProfileReducer
  );

  const [locationsData, setlocationsData] = useState([]);
  const [menuVisible, setMenuVisible] = useState(null);
  const [renameLocationData, setRenameLocationData] = useState(null);

  const onRemoveLocationPress = (index) => {
    const tempFilter = locationsData.filter((_, i) => i !== index);
    dispatch(setSelectedLocations(tempFilter));
  };

  const handleLocationUpdatePress = async ({ payload, setLoading }) => {
    console.log("payload => ", payload);
    try {
      setLoading(true);

      const locationIndex = payload?.initialData?.locationIndex;
      const updatedLocations = locationsData.map((item, index) =>
        index === locationIndex
          ? {
              ...item,
              title: payload?.title,
              address: payload?.address,
              zipcode: payload?.zipcode,
            }
          : item
      );
      dispatch(setSelectedLocations(updatedLocations));

      setRenameLocationData(null);
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallBackOfLocation = (newLocation) => {
    // show rename location modal
    setRenameLocationData({
      ...newLocation,
      locationIndex: locationsData.length,
      modalVisible: true,
    });
    dispatch(setSelectedLocations([...(selectedLocations || []), newLocation]));
  };

  useEffect(() => {
    setlocationsData(selectedLocations);
  }, [selectedLocations]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBarManager />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{"Serving Location"}</Text>
        <View style={styles.headerIconContainer}>
          {locationsData.length > 0 && (
            <TouchableOpacity
              hitSlop={10}
              onPress={() =>
                navigation.navigate("authMapScreen", {
                  onGoBack: handleCallBackOfLocation,
                })
              }
              activeOpacity={0.7}
            >
              <AntDesign
                name="plussquareo"
                size={20}
                color={AppColor.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1, marginBottom: 0 }}>
        <View style={styles.contentContainer}>
          <FlatList
            data={locationsData}
            extraData={locationsData}
            keyExtractor={(item) => item.lat.toString()}
            contentContainerStyle={[
              styles.flatListContent,
              {
                borderWidth: locationsData.length > 0 ? 0.5 : 0,
              },
              !locationsData ||
                (locationsData?.length === 0 && { flexGrow: 1 }),
            ]}
            renderItem={({ item, index }) => (
              <View style={styles.locationItem} key={index}>
                <SimpleLineIcons
                  name="location-pin"
                  size={27}
                  color={AppColor.primary}
                />

                <View style={{ flex: 1, paddingHorizontal: 12, gap: 2 }}>
                  <Text style={styles.locationTitle}>{item.title}</Text>
                  <Text style={styles.locationAddress}>{item.address}</Text>
                  <Text
                    style={styles.locationZipCode}
                  >{`ZipCode: ${item.zipcode || "N/A"}`}</Text>
                  {!item.zipcode ? (
                    <HelperText
                      type="error"
                      visible={!item.zipcode}
                      style={styles.helper}
                    >
                      {"Note: Zip Code is required"}
                    </HelperText>
                  ) : null}
                </View>

                <Menu
                  mode="flat"
                  visible={menuVisible === index}
                  onDismiss={() => setMenuVisible(null)}
                  anchor={
                    <TouchableOpacity
                      onPress={() => setMenuVisible(index)}
                      style={{
                        height: 24,
                        width: 24,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons
                        name="more-vert"
                        size={24}
                        color={AppColor.black}
                      />
                    </TouchableOpacity>
                  }
                  contentStyle={{
                    backgroundColor: AppColor.white,
                    borderWidth: 1,
                    borderColor: AppColor.border,
                    elevation: 1,
                    shadowColor: AppColor.black,
                    shadowOffset: {
                      width: 0,
                      height: 1,
                    },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                  }}
                >
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(null);
                      setRenameLocationData({
                        ...item,
                        locationIndex: index,
                        modalVisible: true,
                      });
                    }}
                    title="Rename"
                    leadingIcon={"pencil"}
                  />
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(null);
                      onRemoveLocationPress(index);
                    }}
                    title="Remove"
                    leadingIcon={"trash-can"}
                  />
                </Menu>

                {/* <TouchableOpacity onPress={() => onRemoveLocationPress(index)}>
                  <Ionicons
                    name="trash-outline"
                    size={24}
                    color={AppColor.black}
                  />
                </TouchableOpacity> */}
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyListContainer}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("authMapScreen", {
                      onGoBack: handleCallBackOfLocation,
                    })
                  }
                  activeOpacity={0.8}
                  style={styles.emptyListButton}
                >
                  <AntDesign
                    name="pluscircle"
                    size={38}
                    color={AppColor.primary}
                  />
                  <Text style={styles.emptyListText}>
                    {"Add Your Serving\nLocations"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>

        {/* Continue Button */}
        {locationsData.length > 0 && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.continueButton}
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.continueButtonText}>{"Continue"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Rename Location Modal */}
      <RenameLocationModal
        data={renameLocationData}
        isModalVisible={renameLocationData?.modalVisible || false}
        onUpdatePress={handleLocationUpdatePress}
        onCancelPress={() => setRenameLocationData(null)}
      />
    </View>
  );
};

export default AuthServingLocationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
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
    borderColor: "#E5E5EA",
  },
  headerTitle: {
    color: AppColor.black,
    fontSize: 20,
    fontFamily: Primary400,
  },
  headerIconContainer: {
    width: 48,
    alignItems: "center",
  },

  // Content
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },

  // FlatList
  flatListContent: {
    borderRadius: 8,
    borderColor: "#F0F1F2",
  },

  // Location Item
  locationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  locationTitle: {
    fontSize: 16,
    color: AppColor.black,
    fontFamily: Secondary400,
  },
  locationAddress: {
    fontSize: 14,
    color: AppColor.gray,
    fontFamily: Secondary400,
  },
  locationZipCode: {
    fontSize: 14,
    color: AppColor.text,
    fontFamily: Secondary400,
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginHorizontal: 12,
  },
  emptyListContainer: {
    flex: 1,
    backgroundColor: AppColor.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
  },
  emptyListButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyListText: {
    fontSize: 16,
    fontFamily: Secondary400,
    textAlign: "center",
    color: AppColor.text,
    marginTop: 10,
  },

  // Button Container
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  continueButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginBottom: 20,
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

  // Modal
  modalContainer: {
    backgroundColor: AppColor.white,
    borderRadius: 24,
  },
  modalTitle: {
    marginBottom: 20,
    fontSize: 22,
    fontFamily: Primary400,
    color: AppColor.text,
    textAlign: "center",
  },
  modalSubtitle: {
    marginBottom: 20,
    fontSize: 16,
    fontFamily: Secondary400,
    color: AppColor.textHighlighter,
    textAlign: "center",
  },
  locationModalBtnUpdate: {
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
  locationModalBtnCancel: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  locationModalBtnText: {
    color: AppColor.white,
    fontFamily: Secondary400,
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: Secondary400,
    color: AppColor.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColor.white,
  },
  inputText: {
    fontSize: 15,
    fontFamily: Secondary400,
  },
  helper: {
    // marginBottom: 8,
    paddingLeft: 0,
    // paddingTop: 0,
  },
});
