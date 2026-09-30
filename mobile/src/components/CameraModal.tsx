import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme/colors";

type CameraModalProps = {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
};

/** Full-screen camera capture with a photo-library fallback. */
export function CameraModal({ visible, onClose, onCapture }: CameraModalProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const askedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      askedRef.current = false;
      return;
    }
    if (askedRef.current) return;
    if (permission && !permission.granted && permission.canAskAgain) {
      askedRef.current = true;
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const takePhoto = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) {
        onCapture(photo.uri);
        onClose();
      }
    } catch {
      // Keep the camera open so the user can retry.
    } finally {
      setBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      onCapture(result.assets[0].uri);
      onClose();
    }
  };

  const granted = permission?.granted ?? false;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        ) : (
          <View style={styles.permission}>
            <Icon name="camera" size={40} color="#ffffff" />
            <Text style={styles.permissionText}>
              Camera access is needed to photograph a hazard.
            </Text>
          </View>
        )}

        <Pressable
          onPress={onClose}
          style={[styles.close, { top: insets.top + 12 }]}
          accessibilityRole="button"
          accessibilityLabel="Close camera"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            onPress={pickFromLibrary}
            style={styles.secondary}
            accessibilityRole="button"
            accessibilityLabel="Choose from photo library"
          >
            <Text style={styles.secondaryText}>Library</Text>
          </Pressable>

          {granted ? (
            <Pressable
              onPress={takePhoto}
              style={styles.shutter}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            >
              <View style={styles.shutterInner} />
            </Pressable>
          ) : (
            <Pressable
              onPress={requestPermission}
              style={styles.grant}
              accessibilityRole="button"
              accessibilityLabel="Allow camera access"
            >
              <Text style={styles.grantText}>Allow camera</Text>
            </Pressable>
          )}

          <View style={styles.spacer} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f0d",
  },
  permission: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  permissionText: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  close: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  closeText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  secondary: {
    width: 64,
    alignItems: "center",
    paddingVertical: 10,
  },
  secondaryText: {
    color: "#ffffff",
    fontSize: 11,
  },
  spacer: {
    width: 64,
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffffff",
  },
  grant: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: colors.orange,
  },
  grantText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
