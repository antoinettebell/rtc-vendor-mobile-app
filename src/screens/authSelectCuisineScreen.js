import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, Portal, Snackbar, TextInput } from "react-native-paper";
import { AppColor, Mulish700, Mulish400 } from "../utils/theme";
import Ionicons from "react-native-vector-icons/Ionicons";
import AntDesign from "react-native-vector-icons/AntDesign";
import { cuisineList_API } from "../api/appAPI";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedCuisine } from "../redux/slices/foodTruckProfileSlice";
import StatusBarManager from "../components/StatusBarManager";

const AuthSelectCuisineScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { selectedCuisine } = useSelector(
    (state) => state.foodTruckProfileReducer
  );

  const [cuisineData, setCuisineData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState(
    selectedCuisine || []
  );
  const [refreshing, setRefreshing] = useState(true);
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const handleAddCuisine = (item) => {
    if (!selectedCuisines.some((cuisine) => cuisine._id === item._id)) {
      setSelectedCuisines([...selectedCuisines, item]);
    }
  };

  const handleRemoveCuisine = (item) => {
    setSelectedCuisines(
      selectedCuisines.filter((cuisine) => cuisine._id !== item._id)
    );
  };

  const filteredCuisines = cuisineData.filter((cuisine) =>
    cuisine.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getCuisineList = async (page = 0) => {
    try {
      if (totalPage > page) {
        const response = await cuisineList_API({ page: page + 1 });
        console.log("response => ", response);
        if (response?.success && response?.data) {
          if (Number(response.data.page) === 1) {
            setCuisineData(response.data.cuisineList || []);
          } else {
            setCuisineData((prev) => [
              ...prev,
              ...(response.data.cuisineList || []),
            ]);
          }

          setCurrentPage(Number(response.data.page));
          setTotalPage(Number(response.data.totalPages));
        }
      }
    } catch (error) {
      console.log("error =>", error);
      setSnackbar({
        visible: true,
        message: error.message,
        type: "error",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleContinuePress = () => {
    dispatch(setSelectedCuisine(selectedCuisines));
    navigation.goBack();
  };

  useEffect(() => {
    getCuisineList();
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBarManager />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            borderBottomWidth: 1,
            borderColor: "#E5E5EA",
          },
        ]}
      >
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{"Select Cuisine"}</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        enabled={Platform.OS === "ios"}
        behavior="padding"
        style={{ flex: 1, marginBottom: -insets.bottom }}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}>
          {/* Search Bar */}
          <TextInput
            dense
            mode="outlined"
            placeholder="Search cuisine"
            placeholderTextColor="#C5C5C7"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
            contentStyle={{ fontFamily: Mulish400 }}
            outlineColor="transparent"
            autoCapitalize="sentences"
            activeOutlineColor={AppColor.primary}
            left={<TextInput.Icon icon="magnify" color="#C5C5C7" />}
            theme={{
              roundness: 8,
              colors: {
                background: AppColor.white,
                text: AppColor.black,
              },
            }}
          />

          {/* Selected Cuisines (Horizontal List) */}
          {selectedCuisines.length > 0 && (
            <View>
              <FlatList
                data={selectedCuisines}
                extraData={selectedCuisines}
                horizontal
                keyExtractor={(item) => item._id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ marginBottom: 10 }}
                renderItem={({ item }) => (
                  <View style={styles.selectedItem}>
                    <Text style={styles.selectedText}>{item.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveCuisine(item)}
                      hitSlop={5}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        color={AppColor.white}
                        size={20}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          )}

          {/* Available Cuisines (Vertical List) */}
          <FlatList
            data={filteredCuisines}
            extraData={filteredCuisines}
            keyExtractor={(item) => item._id}
            refreshing={refreshing && !searchText}
            onEndReached={() =>
              filteredCuisines?.length > 0 ? getCuisineList(currentPage) : null
            }
            onEndReachedThreshold={0.1}
            onRefresh={!searchText ? getCuisineList : null}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              backgroundColor: AppColor.white,
              borderRadius: 8,
              marginBottom: 10,
              paddingVertical: 10,
            }}
            renderItem={({ item }) => {
              const isSelected = selectedCuisines.some(
                (cuisine) => cuisine._id === item._id
              );

              return (
                <TouchableOpacity
                  onPress={() =>
                    isSelected
                      ? handleRemoveCuisine(item)
                      : handleAddCuisine(item)
                  }
                  style={[
                    styles.cuisineItem,
                    isSelected && { backgroundColor: AppColor.primary + "10" },
                  ]}
                >
                  <Text
                    style={[
                      styles.cuisineText,
                      { color: isSelected ? AppColor.primary : AppColor.black },
                    ]}
                  >
                    {item.name}
                  </Text>

                  <AntDesign
                    name={isSelected ? "minuscircleo" : "pluscircleo"}
                    size={18}
                    color={AppColor.primary}
                  />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View
                style={{
                  paddingVertical: 50,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {refreshing ? (
                  <ActivityIndicator color={AppColor.primary} />
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: Mulish400,
                      color: AppColor.black,
                    }}
                  >
                    {"No Cuisine Found"}
                  </Text>
                )}
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            activeOpacity={0.7}
            onPress={handleContinuePress}
          >
            <Text style={styles.continueButtonText}>{"Continue"}</Text>
          </TouchableOpacity>
        </View>

        <Portal>
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
        </Portal>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AuthSelectCuisineScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.white,
    paddingHorizontal: 8,
    paddingBottom: 5,
  },
  headerTitle: {
    color: AppColor.black,
    fontSize: 20,
    fontFamily: Mulish700,
  },
  searchInput: {
    marginTop: 8,
    backgroundColor: AppColor.white,
    marginBottom: 10,
  },
  selectedItem: {
    height: 37,
    flexDirection: "row",
    backgroundColor: AppColor.primary,
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 5,
    marginRight: 8,
  },
  selectedText: {
    color: AppColor.white,
    fontSize: 14,
    marginRight: 6,
    fontFamily: Mulish400,
  },
  removeIcon: {
    color: AppColor.white,
    fontSize: 16,
  },
  cuisineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  cuisineText: {
    fontSize: 16,
    color: AppColor.black,
    fontFamily: Mulish400,
  },
  addIcon: {
    color: AppColor.primary,
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginHorizontal: 12,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
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
    fontFamily: Mulish700,
    fontSize: 16,
    color: AppColor.white,
  },
});
