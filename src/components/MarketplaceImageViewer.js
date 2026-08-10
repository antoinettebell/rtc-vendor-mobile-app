import React, { useEffect, useRef, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MarketplaceImageViewer({ images = [], initialIndex = 0, visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const zoomRef = useRef(null);
  useEffect(() => {
    if (visible) setIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
  }, [images.length, initialIndex, visible]);
  const move = (direction) => {
    zoomRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
    setIndex((current) => Math.min(Math.max(current + direction, 0), images.length - 1));
  };
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent>
      <View style={[s.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <TouchableOpacity accessibilityLabel="Close image viewer" style={s.close} onPress={onClose}>
          <Text style={s.closeText}>Close</Text>
        </TouchableOpacity>
        <ScrollView
          key={index}
          ref={zoomRef}
          style={s.zoom}
          contentContainerStyle={s.zoomContent}
          minimumZoomScale={1}
          maximumZoomScale={4}
          bouncesZoom
          centerContent
        >
          {images[index] ? (
            <Image
              source={{ uri: images[index].image_url }}
              style={{ width, height: Math.max(240, height - insets.top - insets.bottom - 120) }}
              resizeMode="contain"
            />
          ) : null}
        </ScrollView>
        <View style={s.navigation}>
          <TouchableOpacity disabled={index === 0} onPress={() => move(-1)}>
            <Text style={[s.navText, index === 0 && s.disabled]}>Previous</Text>
          </TouchableOpacity>
          <Text style={s.count}>{images.length ? `${index + 1} / ${images.length}` : "0 / 0"}</Text>
          <TouchableOpacity disabled={index >= images.length - 1} onPress={() => move(1)}>
            <Text style={[s.navText, index >= images.length - 1 && s.disabled]}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000" },
  close: { alignSelf: "flex-end", padding: 16, zIndex: 2 },
  closeText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  zoom: { flex: 1 },
  zoomContent: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  navigation: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18 },
  navText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  count: { color: "#fff" },
  disabled: { opacity: 0.35 },
});
