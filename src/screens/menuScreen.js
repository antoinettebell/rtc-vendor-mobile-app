import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator as NativeIndicator,
  Alert,
} from "react-native";
import {
  Divider,
  Snackbar,
  TextInput,
  HelperText,
  ActivityIndicator,
  IconButton,
} from "react-native-paper";
import Modal from "react-native-modal";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Mulish700, Mulish400, Mulish600 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import {
  addCategory_API,
  getAllCategory_API,
  getBankDetail_API,
  getDefaultCategories_API,
  removeCategory_API,
} from "../api/appAPI";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedFoodCategory } from "../redux/slices/foodTruckProfileSlice";
import { showSnackbar } from "../redux/slices/snackbarSlice";
import { vendorProfileStatus } from "../utils/constants";
import { Dropdown } from "react-native-element-dropdown";
import { setBankStatus } from "../redux/slices/userSlice";
import { useFocusEffect } from "@react-navigation/native";

const MenuScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedFoodCategory } = useSelector(
    (state) => state.foodTruckProfileReducer
  );
  const { profileStatus, bankStatus } = useSelector(
    (state) => state.userReducer
  );

  const [category, setCategory] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeIndex, setRemoveIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [catList, setCatList] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "default",
  });
  const [isRefreshing, setIsRefreshing] = useState(false); // New state for pull-to-refresh

  const validateCategory = (value) => {
    if (!value.trim()) return "Category is required";
    return "";
  };

  const onCancelPress = () => {
    setModalVisible(false);
    setNewCatName("");
    setCatError("");
    setSelectedCategoryId("");
  };

  const handleAddCategory = async () => {
    const categoryErr = validateCategory(selectedCategoryId);

    if (categoryErr) {
      setCatError(categoryErr);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        categoriesId: selectedCategoryId,
      };
      const response = await addCategory_API(payload);
      if (response?.success && response?.data) {
        console.log("response => ", response);
        getDataFromAPI(true); // Refresh the data after adding a category
        onCancelPress(); // to close modal with reset states
      }
    } catch (error) {
      console.log("error => ", error);
      setSnackbar({
        visible: true,
        message: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCategory = async (item, index) => {
    setRemoveLoading(true);
    setRemoveIndex(index);
    try {
      const category_id = item?._id;
      const response = await removeCategory_API(category_id);
      if (response?.success && response?.data) {
        const tempCatList = selectedFoodCategory.filter(
          (cat) => cat?._id !== category_id
        );
        dispatch(setSelectedFoodCategory(tempCatList));
        dispatch(
          showSnackbar({
            visible: true,
            message: "Category removed successfully",
            type: "success",
          })
        );
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(
        showSnackbar({
          visible: true,
          message: error.message,
          type: "error",
        })
      );
    } finally {
      setRemoveLoading(false);
      setRemoveIndex(null);
    }
  };

  const getDataFromAPI = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setDataLoading(true);
    }
    try {
      const response = await getAllCategory_API();
      if (response?.success && response?.data) {
        dispatch(setSelectedFoodCategory(response.data.categoryList || []));
      }

      const defaultCategoriesResponse = await getDefaultCategories_API();
      if (
        defaultCategoriesResponse?.success &&
        defaultCategoriesResponse?.data
      ) {
        setCatList(defaultCategoriesResponse.data.categoriesList || []);
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setDataLoading(false);
      }
    }
  };

  const checkBankStatus = async () => {
    if (!bankStatus && profileStatus === vendorProfileStatus.approved) {
      try {
        const response = await getBankDetail_API();
        if (response?.success) {
          if (response?.data?.bankDetail) {
            dispatch(setBankStatus(true));
          } else {
            dispatch(setBankStatus(false));
          }
        }
      } catch (error) {
        console.log("bank data fetch error => ", error);
      }
    }
  };

  const checkBankStatusAndOpenModel = () => {
    if (!bankStatus) {
      Alert.alert(
        "Payment Details Required",
        "We'd love to make sure you get paid on time. Please add your Cash App, Zelle, PayPal, Venmo, Direct Deposit, ACH, Check, E-check, or Wire payment details.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Update",
            style: "destructive",
            onPress: () => navigation.navigate("editBankDetailScreen"),
          },
        ]
      );
    } else {
      setModalVisible(true);
    }
  };

  useEffect(() => {
    getDataFromAPI(false); // Initial load, not a refresh
  }, []);

  useEffect(() => {
    setCategory(selectedFoodCategory);
  }, [selectedFoodCategory]);

  useFocusEffect(
    useCallback(() => {
      checkBankStatus();
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 10,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderColor: AppColor.border,
          backgroundColor: AppColor.white,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 19.78,
            fontFamily: Mulish700,
            color: AppColor.black,
          }}
        >
          {"Menu"}
        </Text>
      </View>

      {profileStatus === vendorProfileStatus.approved ? (
        dataLoading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <NativeIndicator color={AppColor.primary} size="large" />
          </View>
        ) : (
          <KeyboardAvoidingView
            enabled={Platform.OS === "ios"}
            behavior="padding"
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.contentContainer}>
              <FlatList
                data={category}
                extraData={category}
                keyExtractor={(_, index) => index.toString()}
                refreshing={isRefreshing} // Add this
                onRefresh={() => getDataFromAPI(true)} // Add this
                contentContainerStyle={[
                  styles.flatListContent,
                  !category?.length && {
                    flexGrow: 1,
                    padding: 16,
                    margin: 0,
                    borderRadius: 0,
                  },
                ]}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("menuDishListScreen", {
                        category: item,
                      })
                    }
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginHorizontal: 16,
                      paddingVertical: 8,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        height: 53,
                        width: 53,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons
                        name="dining"
                        size={40}
                        color={AppColor.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: Mulish700,
                          fontSize: 14,
                          color: AppColor.text,
                        }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: Mulish400,
                          fontSize: 12,
                          color: AppColor.textHighlighter,
                          marginTop: 5,
                        }}
                      >{`${item.menuCount} Items`}</Text>
                    </View>
                    {removeLoading && removeIndex === index ? (
                      <ActivityIndicator
                        color={AppColor.primary}
                        style={{ marginRight: 8 }}
                      />
                    ) : (
                      <IconButton
                        icon="trash-can"
                        iconColor="#FF0000"
                        style={{
                          backgroundColor: "#FFECEC",
                          borderRadius: 8,
                          margin: 0,
                        }}
                        onPress={() => handleRemoveCategory(item, index)}
                      />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={() => (
                  <View
                    style={[
                      styles.emptyListContainer,
                      { paddingBottom: insets.bottom },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={checkBankStatusAndOpenModel}
                      activeOpacity={0.8}
                      style={styles.emptyListButton}
                    >
                      <AntDesign
                        name="pluscircle"
                        size={38}
                        color={AppColor.primary}
                      />
                      <Text style={styles.emptyListText}>
                        {"Add your first menu\ncategory"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListFooterComponent={() =>
                  category?.length ? (
                    <TouchableOpacity
                      onPress={checkBankStatusAndOpenModel}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 16,
                        paddingHorizontal: 24,
                        borderTopWidth: 1,
                        borderColor: "#E5E5EA",
                        gap: 10,
                      }}
                    >
                      <AntDesign
                        name="pluscircle"
                        size={20}
                        color={AppColor.primary}
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: Mulish600,
                          color: AppColor.text,
                        }}
                      >
                        {"New Category"}
                      </Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
            </View>
          </KeyboardAvoidingView>
        )
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: Mulish400,
              color: AppColor.black,
              textAlign: "center",
            }}
          >
            {
              "This feature will become available once your\nprofile is approved."
            }
          </Text>
        </View>
      )}

      {/* New Category Modal */}
      <Modal
        isVisible={modalVisible}
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

          <Text style={styles.modalTitle}>{"New Category"}</Text>
          <Text style={styles.modalSubtitle}>{"Add new menu category"}</Text>

          <Divider />

          <Dropdown
            data={catList}
            labelField="name"
            valueField="_id"
            value={selectedCategoryId}
            onChange={(selected) => {
              setSelectedCategoryId(selected._id);
              setCatError("");
            }}
            placeholder="Select Category"
            style={styles.dropdown}
            placeholderStyle={{
              fontFamily: Mulish400,
              color: AppColor.textHighlighter,
            }}
            itemTextStyle={{ fontFamily: Mulish400 }}
            selectedTextStyle={{ fontFamily: Mulish400 }}
          />
          {!!catError && (
            <HelperText type="error" visible={!!catError} style={styles.helper}>
              {catError}
            </HelperText>
          )}

          {/* Category name */}
          {/* <View>
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>
              {"Category name"}
            </Text>
            <TextInput
              dense
              value={newCatName}
              onChangeText={(text) => {
                setNewCatName(text);
                if (!validateCategory(text)) {
                  setCatError("");
                }
              }}
              style={styles.input}
              contentStyle={styles.inputText}
              placeholder=""
              placeholderTextColor={AppColor.placeholderTextColor}
              mode="outlined"
              autoCapitalize="sentences"
              error={!!catError}
              outlineColor={AppColor.border}
              activeOutlineColor={AppColor.primary}
              outlineStyle={{ borderRadius: 8 }}
              theme={{ colors: { onSurfaceVariant: "#777" } }}
            />
            {!!catError ? (
              <HelperText
                type="error"
                visible={!!catError}
                style={styles.helper}
              >
                {catError}
              </HelperText>
            ) : null}
          </View> */}

          <TouchableOpacity
            style={[styles.modalBtnAdd, { marginTop: 30 }]}
            activeOpacity={0.7}
            onPress={handleAddCategory}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={AppColor.white} />
            ) : (
              <Text style={styles.modalBtnText}>{"Add"}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalBtnCancel}
            activeOpacity={0.7}
            onPress={onCancelPress}
            disabled={loading}
          >
            <Text style={[styles.modalBtnText, { color: AppColor.primary }]}>
              {"Cancel"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SnackBar */}
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
          duration={4000}
          style={{
            backgroundColor:
              snackbar.type === "success"
                ? AppColor.snackbarSuccess
                : snackbar.type === "error"
                  ? AppColor.snackbarError
                  : AppColor.snackbarDefault,
          }}
        >
          {snackbar.message}
        </Snackbar>
      </Modal>
    </View>
  );
};

export default MenuScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardAvoidingView: {
    flex: 1,
    marginBottom: 0,
  },
  contentContainer: { flex: 1 },
  flatListContent: {
    margin: 16,
    borderWidth: 0.4,
    borderRadius: 8,
    borderColor: "#E5E5EA",
    backgroundColor: AppColor.white,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
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
    fontFamily: Mulish400,
    textAlign: "center",
    color: AppColor.text,
    marginTop: 10,
  },

  // dropdown
  dropdown: {
    marginTop: 14,
    marginHorizontal: 26,
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

  modalContainer: {
    backgroundColor: AppColor.white,
    marginHorizontal: "5%",
    paddingVertical: 36,
    borderRadius: 9,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Mulish700,
    color: AppColor.text,
    textAlign: "left",
    marginHorizontal: 26,
  },
  modalSubtitle: {
    marginTop: 5,
    marginBottom: 20,
    fontSize: 16,
    fontFamily: Mulish400,
    color: AppColor.textHighlighter,
    textAlign: "left",
    marginHorizontal: 26,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: Mulish400,
    color: AppColor.text,
    marginBottom: 8,
    marginHorizontal: 26,
  },
  input: {
    marginHorizontal: 26,
    backgroundColor: AppColor.white,
  },
  inputText: {
    fontSize: 15,
    fontFamily: Mulish400,
  },
  modalBtnAdd: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginTop: 15,
    marginHorizontal: 26,
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
  modalBtnCancel: {
    height: 48,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: AppColor.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    marginHorizontal: 26,
  },
  modalBtnText: {
    color: AppColor.white,
    fontFamily: Mulish700,
    fontSize: 16,
  },

  helper: {
    marginBottom: 8,
    paddingLeft: 0,
    paddingTop: 0,
    marginHorizontal: 26,
    fontFamily: Mulish400,
  },
});
