import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AppColor } from "../utils/theme";

const CustomSwitch = ({
  value,
  onPress,
  duration = 300,
  trackColors = { on: AppColor.primary, off: "#DEDEDE" },
}) => {
  const height = 30;
  const width = 50;
  const borderRadius = height / 2;

  const trackAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        interpolateColor(
          value.value,
          [0, 1],
          [trackColors.off, trackColors.on]
        ),
        { duration }
      ),
    };
  });

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withTiming(value.value ? width - height : 0, {
            duration,
          }),
        },
      ],
    };
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.track,
          {
            width,
            height,
            borderRadius,
          },
          trackAnimatedStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              width: height - 4,
              height: height - 4,
              borderRadius: (height - 4) / 2,
            },
            thumbAnimatedStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    justifyContent: "center",
    padding: 2,
  },
  thumb: {
    backgroundColor: "#fff",
  },
});

export default CustomSwitch;
