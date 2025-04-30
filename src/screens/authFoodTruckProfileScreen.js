import React from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from "react-native";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";
import { IconButton } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";

const AuthFoodTruckProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar backgroundColor={AppColor.primary} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.white}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{"Food Truck Profile"}</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        enabled={Platform.OS === "ios"}
        behavior="padding"
        style={{
          flex: 1,
          marginBottom: -insets.bottom,
        }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1 }}>
            {/* Step Container */}
            <View style={styles.stepContainer}>
              {/* Step 1 - filled circle with checkmark */}
              <View style={styles.stepSubContainer}>
                <View style={styles.filledCircle}>
                  <FontAwesome6 name="check" color={AppColor.white} size={18} />
                </View>
              </View>

              {/* Line connecting steps */}
              <View style={styles.line} />

              {/* Step 2 - empty circle */}
              <View style={styles.stepContainer}>
                <View style={styles.emptyCircle} />
              </View>
            </View>

            {/* Content */}
            <View
              style={[styles.content, { paddingBottom: insets.bottom + 20 }]}
            >
              {/* [Part 1] */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{"Food truck info"}</Text>
                <Text style={styles.sectionSubtitle}>
                  {"Tell your customer about your food truck!!"}
                </Text>
              </View>

              {/* HR */}
              <View
                style={{
                  height: 1,
                  backgroundColor: "#E5E5EA",
                  width: "100%",
                }}
              />

              {/* [Part 2] */}
              <View style={styles.section}>
                <Text style={styles.label}>{"Select Logo"}</Text>
                <View style={styles.logoContainer}>
                  {/* Logo Image */}
                  <View style={styles.logoImageWrapper}>
                    {/* Example uploaded logo */}
                    <Image
                      source={{ uri: "https://picsum.photos/id/1/200/300" }}
                      style={styles.logoImage}
                    />
                  </View>

                  {/* Upload Button */}
                  <TouchableOpacity style={styles.uploadButton}>
                    <FontAwesome6
                      name="upload"
                      color={AppColor.black}
                      size={20}
                    />
                    <Text style={styles.uploadButtonText}>Upload Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* [Part 3] */}
              <View style={styles.section}>
                <Text style={styles.label}>{"Select Food Truck Photos"}</Text>

                <TouchableOpacity style={styles.photoUploadContainer}>
                  <FontAwesome6
                    name="upload"
                    color={AppColor.black}
                    size={20}
                  />
                  <Text style={styles.uploadButtonText}>Upload Photos</Text>
                </TouchableOpacity>

                {/* Already Uploaded Thumbnails */}
                <View style={styles.thumbnailContainer}>
                  {/* Thumbnail 1 */}
                  <Image
                    source={{ uri: "https://picsum.photos/id/1/200/300" }}
                    style={styles.thumbnail}
                  />
                  {/* Thumbnail 2 */}
                  <Image
                    source={{ uri: "https://picsum.photos/id/1/200/300" }}
                    style={styles.thumbnail}
                  />
                </View>
              </View>

              {/* [Part 4] */}
              <View style={styles.radioContainer}>
                <TouchableOpacity style={styles.radioButton}>
                  <View style={styles.radioOuterCircle}>
                    <View style={styles.radioInnerCircle} />
                  </View>
                  <Text style={styles.radioLabel}>{"Food Truck"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.radioButton}>
                  <View style={styles.radioOuterCircle}>
                    {/* Empty for unselected */}
                  </View>
                  <Text style={styles.radioLabel}>{"Food Caterer"}</Text>
                </TouchableOpacity>
              </View>

              {/* [Part 5] */}
              <View style={styles.section}>
                <Text style={styles.label}>{"Serving Cuisine"}</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => navigation.navigate("authSelectCuisineScreen")}
                >
                  <Text style={styles.dropdownText}>{"Select Cuisine"}</Text>
                  <FontAwesome6
                    name="angle-right"
                    color={AppColor.black}
                    size={18}
                  />
                </TouchableOpacity>

                <Text style={[styles.label, { marginTop: 20 }]}>
                  {"Serving Location"}
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() =>
                    navigation.navigate("authServingLocationScreen")
                  }
                >
                  <Text style={styles.dropdownText}>{"Select Locations"}</Text>
                  <FontAwesome6
                    name="angle-right"
                    color={AppColor.black}
                    size={18}
                  />
                </TouchableOpacity>
              </View>

              {/* [Part 6] */}
              <TouchableOpacity
                onPress={() => navigation.navigate("authAvailabilityScreen")}
                activeOpacity={0.7}
                style={styles.continueButton}
              >
                <Text style={styles.continueButtonText}>{"Continue"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AuthFoodTruckProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColor.primary,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    color: AppColor.white,
    fontSize: 20,
    fontFamily: Primary400,
  },

  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
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
  emptyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AppColor.primary,
    backgroundColor: "transparent",
  },
  line: {
    width: "25%",
    height: 2,
    backgroundColor: AppColor.primary,
  },

  content: {
    flex: 1,
    backgroundColor: AppColor.white,
  },
  section: {
    marginVertical: 16,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Primary400,
    color: AppColor.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Secondary400,
    color: AppColor.textHighlighter,
    marginTop: 4,
  },
  label: {
    fontSize: 18,
    fontFamily: Secondary400,
    color: AppColor.black,
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
  },
  logoImageWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginTop: 10,
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColor.black,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: AppColor.black,
    fontFamily: Secondary400,
  },
  photoUploadContainer: {
    height: 104,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: AppColor.gray,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  thumbnailContainer: {
    flexDirection: "row",
    // marginTop: 8,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 8,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 24,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  radioOuterCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AppColor.black,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColor.black,
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 15,
    fontFamily: Secondary400,
    color: AppColor.black,
  },
  dropdown: {
    width: "100%",
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: {
    color: AppColor.placeholderTextColor,
  },
  continueButton: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginVertical: 20,
    marginHorizontal: 24,
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
