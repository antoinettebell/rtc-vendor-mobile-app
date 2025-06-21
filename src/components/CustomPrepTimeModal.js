import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Modal from "react-native-modal";
import {
  ActivityIndicator,
  Divider,
  HelperText,
  TextInput,
} from "react-native-paper";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AppColor, Primary400, Secondary400 } from "../utils/theme";

// validate prep time
const validatePrepTime = (value) => {
  if (!value.trim()) return "Preparation time is required";
  return "";
};

const CustomPrepTimeModal = ({
  timeModal,
  setTimeModal,
  prepTimeError,
  setPrepTimeError,
  handleSubmitPrepTime,
  onModalCancelPress,
}) => {
  return (
    <Modal
      isVisible={timeModal?.isVisible || false}
      backdropOpacity={0.5}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropTransitionOutTiming={0.5}
    >
      <View style={styles.modalContainer}>
        {/* Title & Subtitle */}
        <Text style={styles.modalTitle}>{"Preparation Time"}</Text>
        <Text style={styles.modalSubtitle}>
          {"Add preparation time for this order"}
        </Text>

        <Divider
          style={{
            marginHorizontal: -24,
            marginVertical: 16,
          }}
        />

        {/* Prep Time Input */}
        <View>
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>
            {"Enter Time in Mins"}
          </Text>
          <TextInput
            dense
            value={timeModal?.prepTime}
            onChangeText={(text) => {
              setTimeModal((prev) => ({
                ...prev,
                prepTime: text,
              }));
              if (!validatePrepTime(text)) {
                setPrepTimeError("");
              }
            }}
            style={styles.input}
            contentStyle={styles.inputText}
            placeholder=""
            placeholderTextColor={AppColor.placeholderTextColor}
            mode="outlined"
            keyboardType="numeric"
            returnKeyLabel="done"
            returnKeyType="done"
            error={!!prepTimeError}
            outlineColor={AppColor.border}
            activeOutlineColor={AppColor.primary}
            outlineStyle={{ borderRadius: 8 }}
            theme={{ colors: { onSurfaceVariant: "#777" } }}
            right={
              <TextInput.Icon icon="clock-outline" color={AppColor.gray} />
            }
          />
          {!!prepTimeError ? (
            <HelperText
              type="error"
              visible={!!prepTimeError}
              style={styles.helper}
            >
              {prepTimeError}
            </HelperText>
          ) : null}
        </View>

        {/* Save Btn */}
        <TouchableOpacity
          style={[styles.modalBtnAdd, { marginTop: 30 }]}
          activeOpacity={0.7}
          onPress={handleSubmitPrepTime}
          disabled={timeModal?.loading || false}
        >
          {timeModal?.loading ? (
            <ActivityIndicator color={AppColor.white} />
          ) : (
            <Text style={styles.modalBtnText}>{"Submit"}</Text>
          )}
        </TouchableOpacity>

        {/* Close Btn */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={{ position: "absolute", top: 10, right: 10 }}
          hitSlop={10}
          onPress={onModalCancelPress}
          disabled={timeModal?.loading || false}
        >
          <Ionicons
            name="close-circle-sharp"
            size={32}
            color={AppColor.primary}
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default CustomPrepTimeModal;

const styles = StyleSheet.create({
  // Preparation modal
  modalContainer: {
    padding: 24,
    borderRadius: 9,
    marginHorizontal: "5%",
    backgroundColor: AppColor.white,
  },
  modalTitle: {
    marginBottom: 4,
    fontSize: 20,
    fontFamily: Primary400,
    color: AppColor.text,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: Secondary400,
    color: AppColor.textHighlighter,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: Secondary400,
    color: AppColor.text,
    marginBottom: 8,
  },
  input: {
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
  modalBtnText: {
    color: AppColor.white,
    fontFamily: Secondary400,
    fontSize: 16,
  },

  helper: {
    marginBottom: 8,
    paddingLeft: 0,
    paddingTop: 0,
  },
});
