import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import Modal from "react-native-modal";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";

const MediaPickerDialog = ({
  isVisible,
  onCameraPress,
  onGalleryPress,
  onClosePress,
}) => {
  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.5}
      animationIn="zoomIn"
      animationOut="zoomOut"
    >
      <View style={styles.modalContainer}>
        <View style={styles.optionsRow}>
          <MediaOption
            iconName="photo-camera"
            label="Camera"
            onPress={onCameraPress}
          />
          <MediaOption
            iconName="photo"
            label="Gallery"
            onPress={onGalleryPress}
          />
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          activeOpacity={0.7}
          onPress={onClosePress}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const MediaOption = ({ iconName, label, onPress }) => (
  <View style={styles.optionContainer}>
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.iconButton}
    >
      <MaterialIcons name={iconName} size={35} color={AppColor.white} />
    </TouchableOpacity>
    <Text style={styles.optionLabel}>{label}</Text>
  </View>
);

export default MediaPickerDialog;

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: AppColor.white,
    marginHorizontal: "10%",
    paddingVertical: 36,
    paddingHorizontal: 33,
    borderRadius: 24,
    alignItems: "center",
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 40,
  },
  optionContainer: {
    alignItems: "center",
  },
  iconButton: {
    height: 70,
    width: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColor.primary,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: Secondary400,
    color: AppColor.text,
    marginTop: 10,
  },
  closeButton: {
    width: "100%",
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColor.primary,
    marginTop: 20,
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
  closeButtonText: {
    color: AppColor.white,
    fontFamily: Secondary400,
    fontSize: 16,
  },
});
