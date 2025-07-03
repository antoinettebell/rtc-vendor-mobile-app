import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  // Animated,
  StyleSheet,
  // Easing,
} from "react-native";
import { AppColor, Mulish400 } from "../utils/theme";
import { ActivityIndicator } from "react-native-paper";

const CustomBanner = ({
  visible,
  children,
  actions = [],
  style,
  contentStyle,
  elevation = 0,
  initialOffsetY = 0,
}) => {
  // const [animation] = useState(new Animated.Value(1));
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      // Animated.timing(animation, {
      //   toValue: 1,
      //   duration: 250,
      //   easing: Easing.out(Easing.ease),
      //   useNativeDriver: true,
      // }).start();
    } else {
      // Animated.timing(animation, {
      //   toValue: 0,
      //   duration: 200,
      //   easing: Easing.in(Easing.ease),
      //   useNativeDriver: true,
      // }).start(() => setIsVisible(false));
      setIsVisible(false);
    }
  }, [visible]);

  // const translateY = animation.interpolate({
  //   inputRange: [0, 1],
  //   outputRange: [-50, 0],
  // });

  // const opacity = animation.interpolate({
  //   inputRange: [0, 1],
  //   outputRange: [0, 1],
  // });

  if (!isVisible) return null;

  return (
    // <Animated.View
    <View
      style={[
        styles.container,
        style,
        // {
        //   opacity,
        //   transform: [{ translateY }],
        //   elevation,
        //   shadowOpacity: elevation ? 0.2 : 0,
        // },
        {
          elevation,
          shadowOpacity: elevation ? 0.2 : 0,
        },
      ]}
    >
      <View style={[styles.content, contentStyle]}>
        <Text style={styles.text}>{children}</Text>
        {actions.map((action, index) =>
          action.loading ? (
            <View key={index} style={styles.actionButton}>
              <ActivityIndicator size="small" color={AppColor.primary} />
            </View>
          ) : (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              style={styles.actionButton}
              disabled={action.disabled}
            >
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          )
        )}
      </View>
      {/* </Animated.View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColor.white,
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
    minHeight: 48,
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  text: {
    fontSize: 14,
    fontFamily: Mulish400,
    color: AppColor.black,
    flex: 1,
    marginRight: 8,
  },
  actionsContainer: {
    flexDirection: "row",
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    color: AppColor.primary,
    fontFamily: Mulish400,
    fontSize: 14,
    fontWeight: "500",
  },
});

export default CustomBanner;
