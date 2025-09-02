import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  FlatList,
  Alert,
  Pressable,
} from "react-native";
import { IconButton } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";
import StatusBarManager from "../components/StatusBarManager";
import FastImage from "@d11/react-native-fast-image";
import AppImage from "../components/AppImage";
import { removeUser } from "../redux/slices/userInfoSlice";

const OneTapSignInScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { allSigninUsers } = useSelector((state) => state.userInfoReducer);

  const [loading, setLoading] = useState(false);

  const handleRemoveUserAccounrPress = ({ emailid }) => {
    Alert.alert(
      "Remove User",
      "Are you sure you want to remove this user from your device?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => dispatch(removeUser({ emailid })),
        },
      ]
    );
  };

  const renderUserComponent = ({ item }) => (
    <Pressable
      style={styles.userItemContainer}
      onPress={() => navigation.navigate("signin", { savedUser: item })}
    >
      <AppImage uri={item?.imageUrl} containerStyle={styles.userImage} />
      <View style={styles.userInfoContainer}>
        <Text style={styles.userNameText} numberOfLines={1}>
          {item?.username}
        </Text>
        <Text style={styles.userEmailText} numberOfLines={1}>
          {item?.emailid}
        </Text>
      </View>
      <IconButton
        icon="trash-can"
        iconColor={AppColor.red}
        size={24}
        onPress={() => handleRemoveUserAccounrPress(item)}
        style={{ margin: 0 }}
      />
      <IconButton
        icon="chevron-right"
        iconColor={AppColor.primary}
        size={24}
        onPress={() => navigation.navigate("signin", { savedUser: item })}
        style={{ margin: 0 }}
      />
    </Pressable>
  );

  const renderItemSeparatorComponent = () => (
    <View style={styles.itemSeparateContainer} />
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{"No saved user found!"}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBarManager barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton
          icon="arrow-left"
          iconColor={AppColor.white}
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>{"Saved Users"}</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Content Container */}
      <View
        style={[
          styles.contentContainer,
          { paddingBottom: insets.bottom || 20 },
        ]}
      >
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          <FastImage
            source={require("../assets/images/AppLogo.png")}
            style={styles.logoImage}
          />
          <Text style={styles.logoText}>{"Round The Corner"}</Text>
        </View>

        {/* User List Container */}
        <View style={styles.userListContainer}>
          {/* User List Title Container */}
          <View style={styles.userListTitleContainer}>
            <Text style={styles.userListTitleText}>{"Welcome Back!"}</Text>
            <Text style={styles.userListSubTitleText}>
              {"continue with your account"}
            </Text>
          </View>

          {/* User List */}
          <View style={{ flex: 1 }}>
            <FlatList
              data={allSigninUsers}
              extraData={allSigninUsers}
              keyExtractor={(item) => item?.emailid}
              contentContainerStyle={styles.userListFlatlistConatiner}
              renderItem={renderUserComponent}
              ItemSeparatorComponent={renderItemSeparatorComponent}
              ListEmptyComponent={renderEmptyComponent}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Other account btn container */}
          <TouchableOpacity
            onPress={() => navigation.navigate("signin")}
            activeOpacity={0.7}
            style={styles.useAnotherBtn}
          >
            <Text style={styles.useAnotherBtnText}>
              {"Use another account"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* New account btn */}
        <TouchableOpacity
          onPress={() => navigation.navigate("signup")}
          activeOpacity={0.7}
          style={styles.newAccountBtn}
        >
          <Ionicons
            name="add-circle-outline"
            color={AppColor.white}
            size={20}
          />
          <Text style={styles.newAccountBtnText}>{"New Account"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColor.white,
  },
  // header
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
    fontFamily: Mulish700,
  },

  // content container
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // logo container
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  logoImage: { height: 104, width: 104 },
  logoText: {
    fontSize: 14,
    fontFamily: Mulish700,
    color: AppColor.text,
  },

  // user list container
  userListContainer: {
    flex: 1,
  },

  // user list title container
  userListTitleContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  userListTitleText: {
    fontSize: 22,
    fontFamily: Mulish600,
    color: AppColor.text,
  },
  userListSubTitleText: {
    fontSize: 12,
    fontFamily: Mulish400,
    color: AppColor.text,
  },

  // Flatlist container
  userListFlatlistConatiner: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  userItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColor.border,
    backgroundColor: AppColor.white,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfoContainer: {
    flex: 1,
    gap: 5,
    paddingHorizontal: 8,
  },
  userNameText: {
    fontSize: 14,
    fontFamily: Mulish700,
    color: AppColor.text,
  },
  userEmailText: {
    fontSize: 12,
    fontFamily: Mulish400,
    color: AppColor.text,
  },
  itemSeparateContainer: {
    height: 8,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Mulish600,
    color: AppColor.text,
  },

  // use another btn
  useAnotherBtn: {
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: AppColor.primary,
    backgroundColor: AppColor.white,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  useAnotherBtnText: {
    fontSize: 14,
    fontFamily: Mulish700,
    color: AppColor.primary,
  },

  // new account btn
  newAccountBtn: {
    height: 48,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    backgroundColor: AppColor.primary,
    ...Platform.select({
      ios: {
        shadowColor: AppColor.black,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  newAccountBtnText: {
    fontSize: 14,
    fontFamily: Mulish700,
    color: AppColor.white,
  },
});

export default OneTapSignInScreen;
