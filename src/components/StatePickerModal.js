import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import { AppColor, Mulish400, Mulish600, Mulish700 } from "../utils/theme";
import { getStateLabel, usStates } from "../utils/usStates";

const StatePickerModal = ({
  error,
  label = "State *",
  onChange,
  value,
}) => {
  const [visible, setVisible] = React.useState(false);

  const handleSelect = (state) => {
    onChange(state.value);
    setVisible(false);
  };

  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setVisible(true)}
        style={[styles.pickerButton, error && styles.errorBorder]}
      >
        <Text
          style={[
            styles.pickerText,
            !value && { color: AppColor.placeholderTextColor },
          ]}
        >
          {value ? getStateLabel(value) : "Select State"}
        </Text>
        <AntDesign
          name="caretdown"
          color={AppColor.textHighlighter}
          size={14}
        />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setVisible(false)}
        />
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select State</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <AntDesign name="close" size={22} color={AppColor.black} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={usStates}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelect(item)}
                style={styles.stateRow}
              >
                <Text style={styles.stateText}>{item.label}</Text>
                <Text style={styles.stateCode}>{item.value}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  inputLabel: {
    fontFamily: Mulish400,
    fontSize: 15,
    color: AppColor.text,
    marginBottom: 8,
  },
  pickerButton: {
    height: 48,
    backgroundColor: AppColor.white,
    borderWidth: 1,
    borderColor: AppColor.border,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  pickerText: {
    color: AppColor.text,
    fontSize: 15,
    fontFamily: Mulish400,
  },
  errorBorder: {
    borderColor: "#b3261e",
    borderWidth: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  modal: {
    maxHeight: "70%",
    backgroundColor: AppColor.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: AppColor.border,
  },
  modalTitle: {
    fontFamily: Mulish700,
    fontSize: 18,
    color: AppColor.black,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#F1F1F1",
  },
  stateText: {
    fontFamily: Mulish600,
    fontSize: 15,
    color: AppColor.text,
  },
  stateCode: {
    fontFamily: Mulish400,
    fontSize: 14,
    color: AppColor.textHighlighter,
  },
});

export default StatePickerModal;
