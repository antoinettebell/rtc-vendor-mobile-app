import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator as NativeIndicator,
} from "react-native";
import {
  Divider,
  Snackbar,
  TextInput,
  HelperText,
  ActivityIndicator,
  Menu,
} from "react-native-paper";
import Modal from "react-native-modal";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import {
  addCategory_API,
  getAllCategory_API,
  removeCategory_API,
  updateCategory_API,
} from "../api/appAPI";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedFoodCategory } from "../redux/slices/foodTruckProfileSlice";
import { showSnackbar } from "../redux/slices/snackbarSlice";

const MenuScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedFoodCategory } = useSelector(
    (state) => state.foodTruckProfileReducer
  );

  const [category, setCategory] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeIndex, setRemoveIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(null);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [menuVisible, setMenuVisible] = useState(null);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "default",
  });

  const validateCategory = (value) => {
    if (!value.trim()) return "Category name is required";
    return "";
  };

  const onCancelPress = () => {
    setModalVisible(false);
    setUpdateModalVisible(null);
    setNewCatName("");
    setCatError("");
  };

  const handleAddCategory = async () => {
    const categoryErr = validateCategory(newCatName);

    if (categoryErr) {
      setCatError(categoryErr);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: newCatName,
      };
      const response = await addCategory_API(payload);
      if (response.success && response.data) {
        console.log("response => ", response);
        const tempCatList = [
          ...selectedFoodCategory,
          { ...response.data.category, menuCount: 0 },
        ];
        dispatch(setSelectedFoodCategory(tempCatList));

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

  const handleUpdateCategory = async () => {
    const categoryErr = validateCategory(newCatName);

    if (categoryErr) {
      setCatError(categoryErr);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: newCatName,
      };
      const category_id = updateModalVisible?.data?._id;
      const response = await updateCategory_API({ payload, category_id });
      if (response.success && response.data) {
        console.log("response => ", response);
        const updatedCategory = response.data.category;
        const tempCatList = selectedFoodCategory.map((item) =>
          item?._id === category_id ? { ...item, ...updatedCategory } : item
        );
        dispatch(setSelectedFoodCategory(tempCatList));

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
      if (response.success && response.data) {
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
    } finally {
      setRemoveLoading(false);
      setRemoveIndex(null);
    }
  };

  const getDataFromAPI = async () => {
    setDataLoading(true);
    try {
      const response = await getAllCategory_API();
      if (response.success && response.data) {
        console.log("response => ", response);
        dispatch(setSelectedFoodCategory(response.data.categoryList || []));
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    getDataFromAPI();
  }, []);

  useEffect(() => {
    console.log("selectedFoodCategory => ", selectedFoodCategory);
    setCategory(selectedFoodCategory);
  }, [selectedFoodCategory]);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          backgroundColor: AppColor.white,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderColor: "#E5E5EA",
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 18,
            fontFamily: Primary400,
            color: AppColor.black,
            textAlign: "center",
          }}
        >
          {"Menu"}
        </Text>
      </View>

      {dataLoading ? (
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
                        fontFamily: Primary400,
                        fontSize: 14,
                        color: AppColor.text,
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Secondary400,
                        fontSize: 12,
                        color: AppColor.textHighlighter,
                        marginTop: 5,
                      }}
                    >{`${item.menuCount} Items`}</Text>
                  </View>
                  {removeLoading && removeIndex === index ? (
                    <ActivityIndicator color={AppColor.primary} />
                  ) : (
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
                          setUpdateModalVisible({
                            isVisible: true,
                            data: item,
                          });
                          setNewCatName(item.name);
                        }}
                        title="Rename"
                        leadingIcon={"pencil"}
                      />
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(null);
                          handleRemoveCategory(item, index);
                        }}
                        title="Remove"
                        leadingIcon={"trash-can"}
                      />
                    </Menu>
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
                    onPress={() => setModalVisible(true)}
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
                    onPress={() => setModalVisible(true)}
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
                        fontFamily: Secondary400,
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
      )}

      {/* New Category Modal */}
      <Modal
        isVisible={modalVisible}
        backdropOpacity={0.5}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropTransitionOutTiming={0.5}
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

          {/* Category name */}
          <View>
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
          </View>

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

      {/* Update Category Modal */}
      <Modal
        isVisible={updateModalVisible?.isVisible || false}
        backdropOpacity={0.5}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropTransitionOutTiming={0.5}
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

          <Text style={styles.modalTitle}>{"Update Category"}</Text>
          <Text style={styles.modalSubtitle}>{"Rename menu category"}</Text>

          <Divider />

          {/* Category name */}
          <View>
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
          </View>

          <TouchableOpacity
            style={[styles.modalBtnAdd, { marginTop: 30 }]}
            activeOpacity={0.7}
            onPress={handleUpdateCategory}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={AppColor.white} />
            ) : (
              <Text style={styles.modalBtnText}>{"Update"}</Text>
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
    fontFamily: Secondary400,
    textAlign: "center",
    color: AppColor.text,
    marginTop: 10,
  },

  modalContainer: {
    backgroundColor: AppColor.white,
    marginHorizontal: "5%",
    paddingVertical: 36,
    borderRadius: 9,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Primary400,
    color: AppColor.text,
    textAlign: "left",
    marginHorizontal: 26,
  },
  modalSubtitle: {
    marginTop: 5,
    marginBottom: 20,
    fontSize: 16,
    fontFamily: Secondary400,
    color: AppColor.textHighlighter,
    textAlign: "left",
    marginHorizontal: 26,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
    fontSize: 16,
  },

  helper: {
    marginBottom: 8,
    paddingLeft: 0,
    paddingTop: 0,
    marginHorizontal: 26,
  },
});
