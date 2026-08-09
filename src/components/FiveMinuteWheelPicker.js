import React, { useEffect, useRef } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppColor, Mulish400, Mulish700 } from "../utils/theme";
import { getBreakMinuteOptions } from "../helpers/shiftHistoryEdit.helper";

const ITEM_HEIGHT = 44;

const FiveMinuteWheelPicker = ({ visible, value, onChange, onClose }) => {
  const listRef = useRef(null);
  const options = getBreakMinuteOptions(value);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === String(value || 0)),
  );

  useEffect(() => {
    if (!visible) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
    });
  }, [selectedIndex, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Break Minutes</Text>
          <View style={styles.wheelFrame}>
            <FlatList
              ref={listRef}
              data={options}
              keyExtractor={(item) => item.value}
              getItemLayout={(_, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
              initialScrollIndex={selectedIndex}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.wheelContent}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.y / ITEM_HEIGHT,
                );
                onChange(options[Math.max(0, Math.min(index, options.length - 1))].value);
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === String(value || 0) && styles.optionSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <View pointerEvents="none" style={styles.selectionFrame} />
          </View>
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: AppColor.white,
    borderRadius: 14,
    padding: 18,
    width: "100%",
  },
  title: { color: AppColor.black, fontFamily: Mulish700, fontSize: 18 },
  wheelFrame: { height: ITEM_HEIGHT * 5, marginVertical: 12, overflow: "hidden" },
  wheelContent: { paddingVertical: ITEM_HEIGHT * 2 },
  option: { alignItems: "center", height: ITEM_HEIGHT, justifyContent: "center" },
  optionText: { color: AppColor.textHighlighter, fontFamily: Mulish400, fontSize: 18 },
  optionSelected: { color: AppColor.primary, fontFamily: Mulish700 },
  selectionFrame: {
    borderBottomColor: AppColor.border,
    borderBottomWidth: 1,
    borderTopColor: AppColor.border,
    borderTopWidth: 1,
    height: ITEM_HEIGHT,
    left: 0,
    position: "absolute",
    right: 0,
    top: ITEM_HEIGHT * 2,
  },
  doneButton: { alignItems: "center", paddingVertical: 10 },
  doneText: { color: AppColor.primary, fontFamily: Mulish700, fontSize: 16 },
});

export default FiveMinuteWheelPicker;
