import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, TextInput } from "react-native-paper";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import Ionicons from "react-native-vector-icons/Ionicons";
import AntDesign from "react-native-vector-icons/AntDesign";

const cuisinesData = [
  { id: 1, label: "Cuisine 1" },
  { id: 2, label: "Cuisine 2" },
  { id: 3, label: "Cuisine 3" },
  { id: 4, label: "Cuisine 4" },
  { id: 5, label: "Cuisine 5" },
  { id: 6, label: "Cuisine 6" },
  { id: 7, label: "Cuisine 7" },
  { id: 8, label: "Cuisine 8" },
  { id: 9, label: "Cuisine 9" },
  { id: 10, label: "Cuisine 10" },
];

const AuthSelectCuisineScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState([]);

  const handleAddCuisine = (item) => {
    if (!selectedCuisines.some((cuisine) => cuisine.id === item.id)) {
      setSelectedCuisines([...selectedCuisines, item]);
    }
  };

  const handleRemoveCuisine = (item) => {
    setSelectedCuisines(
      selectedCuisines.filter((cuisine) => cuisine.id !== item.id)
    );
  };

  const filteredCuisines = cuisinesData.filter((cuisine) =>
    cuisine.label.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar backgroundColor={AppColor.white} barStyle="light-content" />

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
            contentStyle={{ fontFamily: Secondary400 }}
            outlineColor="transparent"
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
                horizontal
                keyExtractor={(item) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ marginTop: 10 }}
                renderItem={({ item }) => (
                  <View style={styles.selectedItem}>
                    <Text style={styles.selectedText}>{item.label}</Text>
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
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{
              backgroundColor: AppColor.white,
              borderRadius: 8,
              marginVertical: 10,
              paddingVertical: 10,
            }}
            renderItem={({ item }) => {
              const isSelected = selectedCuisines.some(
                (cuisine) => cuisine.id === item.id
              );

              return (
                <TouchableOpacity
                  onPress={() => handleAddCuisine(item)}
                  disabled={isSelected}
                  style={[
                    styles.cuisineItem,
                    isSelected && { backgroundColor: AppColor.primary + "10" },
                  ]}
                >
                  <Text
                    style={[
                      styles.cuisineText,
                      isSelected && { color: AppColor.primary },
                    ]}
                  >
                    {item.label}
                  </Text>

                  <AntDesign
                    name="pluscircleo"
                    size={18}
                    color={AppColor.primary}
                  />
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.continueButtonText}>{"Continue"}</Text>
          </TouchableOpacity>
        </View>
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
    fontFamily: Primary400,
  },
  searchInput: {
    marginTop: 8,
    backgroundColor: AppColor.white,
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
    fontFamily: Secondary400,
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
    fontFamily: Secondary400,
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
    paddingHorizontal: 16,
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
    fontFamily: Secondary400,
    fontSize: 16,
    color: AppColor.white,
  },
});
