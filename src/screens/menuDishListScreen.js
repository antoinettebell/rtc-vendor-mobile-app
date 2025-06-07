import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator as NativeIndicator,
} from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import { useDispatch, useSelector } from "react-redux";
import { IconButton, Switch } from "react-native-paper";
import {
  getAllFoodItemsByCatID_API,
  updateFooditemByID_API,
} from "../api/appAPI";
import {
  setSelectedFoodCategory,
  setSelectedFoodItems,
} from "../redux/slices/foodTruckProfileSlice";
import FastImage from "@d11/react-native-fast-image";

const MenuDishListScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { selectedFoodItems, selectedFoodCategory } = useSelector(
    (state) => state.foodTruckProfileReducer
  );

  const Params = route.params;

  const [category, setCategory] = useState();
  const [dishList, setDishList] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSwitch = async (value, menuId) => {
    try {
      const temp = selectedFoodItems.map((item) =>
        item._id === menuId ? { ...item, available: value } : item
      );
      setDishList(temp);

      console.log("Value => ", value);
      console.log("Menu ID => ", menuId);

      const response = await updateFooditemByID_API({
        payload: { available: value },
        fooditem_id: menuId,
      });
      if (response.success && response.data) {
        dispatch(setSelectedFoodItems(temp));
      }
    } catch (error) {
      console.log("error => ", error);
      dispatch(setSelectedFoodItems(selectedFoodItems));
    } finally {
    }
  };

  const getDataFromAPI = async (category_id) => {
    setDataLoading(true);
    try {
      const response = await getAllFoodItemsByCatID_API(category_id);
      if (response.success && response.data) {
        console.log("response => ", response);
        // set all food items of a category
        dispatch(setSelectedFoodItems(response.data.menuList || []));

        // Set menucount for a ctaegory
        const temp = selectedFoodCategory.map((item) =>
          item._id === category_id
            ? { ...item, menuCount: response.data.total }
            : item
        );
        dispatch(setSelectedFoodCategory(temp));
      }
    } catch (error) {
      console.log("error => ", error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (Params?.category) {
      setCategory(Params.category);
      getDataFromAPI(Params.category._id);
    }
  }, [Params?.category]);

  useEffect(() => {
    setDishList(selectedFoodItems);
  }, [selectedFoodItems]);

  return (
    <View style={styles.container}>
      <StatusBarManager />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.black}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{category?.name || ""}</Text>
        <View style={styles.headerIconContainer}>
          {dishList.length > 0 && (
            <TouchableOpacity
              hitSlop={10}
              onPress={() =>
                navigation.navigate("menuAddDishItemScreen", {
                  category,
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

      {dataLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: insets.bottom,
          }}
        >
          <NativeIndicator color={AppColor.primary} size="large" />
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            data={dishList}
            extraData={dishList}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={[
              styles.flatListContent,
              !dishList?.length && {
                flexGrow: 1,
                padding: 16,
                margin: 0,
                borderRadius: 0,
              },
            ]}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate("menuEditDishItemScreen", {
                    category,
                    foodItem: item,
                  })
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  gap: 10,
                }}
              >
                <FastImage
                  source={{ uri: item.imgUrls[0] }}
                  style={{
                    height: 83,
                    width: 83,
                    borderRadius: 10,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: Primary400,
                      fontSize: 16,
                      color: AppColor.black,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: Secondary400,
                      fontSize: 14,
                      color: AppColor.text,
                      marginTop: 5,
                    }}
                  >
                    {item.description}
                  </Text>
                  <Text
                    style={{
                      fontFamily: Secondary400,
                      fontSize: 12,
                      color: AppColor.text,
                      marginTop: 5,
                    }}
                  >{`$ ${item.price || 0}`}</Text>
                </View>
                <View>
                  <Switch
                    color={AppColor.primary}
                    value={item.available}
                    onValueChange={(value) => handleSwitch(value, item._id)}
                  />
                </View>
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
                  onPress={() =>
                    navigation.navigate("menuAddDishItemScreen", {
                      category,
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
                    {"Add New Food Item"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
};

export default MenuDishListScreen;

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

  // List
  contentContainer: { flex: 1 },
  flatListContent: {
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: AppColor.white,
  },
  separator: {
    height: 1.5,
    backgroundColor: "#E5E5EA",
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
});
