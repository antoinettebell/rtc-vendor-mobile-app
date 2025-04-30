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
import SimpleLineIcons from "react-native-vector-icons/SimpleLineIcons";
import AntDesign from "react-native-vector-icons/AntDesign";

const locationsData = [
  { id: 1, label: "New York" },
  { id: 2, label: "Los Angeles" },
  { id: 3, label: "Chicago" },
  { id: 4, label: "Houston" },
  { id: 5, label: "Phoenix" },
  { id: 6, label: "Philadelphia" },
  { id: 7, label: "San Antonio" },
  { id: 8, label: "San Diego" },
  { id: 9, label: "Dallas" },
  { id: 10, label: "San Jose" },
];

const AuthServingLocationScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [selectedLocations, setSelectedLocations] = useState([]);

  const handleAddLocation = (item) => {
    if (!selectedLocations.some((location) => location.id === item.id)) {
      setSelectedLocations([...selectedLocations, item]);
    }
  };

  const handleRemoveLocation = (item) => {
    setSelectedLocations(
      selectedLocations.filter((location) => location.id !== item.id)
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar backgroundColor={AppColor.primary} barStyle="light-content" />

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
              onPress={() => navigation.navigate("authMapScreen")}
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
      <KeyboardAvoidingView
        enabled={Platform.OS === "ios"}
        behavior="padding"
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.contentContainer}>
          <FlatList
            data={locationsData}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={[
              styles.flatListContent,
              {
                borderWidth: locationsData.length > 0 ? 0.5 : 0,
              },
            ]}
            renderItem={({ item }) => {
              const isSelected = selectedLocations.some(
                (location) => location.id === item.id
              );

              return (
                <TouchableOpacity
                  onPress={() => handleAddLocation(item)}
                  disabled={isSelected}
                  style={styles.locationItem}
                >
                  <SimpleLineIcons
                    name="location-pin"
                    size={27}
                    color={AppColor.primary}
                  />

                  <Text style={styles.locationText}>{item.label}</Text>

                  <Ionicons
                    name="trash-outline"
                    size={24}
                    color={AppColor.black}
                  />
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyListContainer}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("authMapScreen")}
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
      </KeyboardAvoidingView>
    </View>
  );
};

export default AuthServingLocationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
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
  headerIconContainer: {
    width: 48,
    alignItems: "center",
  },
  keyboardAvoidingView: {
    flex: 1,
    marginBottom: 0,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  flatListContent: {
    flex: 1,
    borderRadius: 8,
    borderColor: "#F0F1F2",
  },
  locationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: AppColor.black,
    fontFamily: Secondary400,
    paddingHorizontal: 12,
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
});
