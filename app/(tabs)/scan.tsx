import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';

import AppButton from '../../components/AppButton';
import { COLORS } from '../../constants/colors';

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Camera permission is still loading
  if (!permission) {
    return <View style={styles.container} />;
  }

  // Camera permission was not granted
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionIcon}>
          <Ionicons name="camera-outline" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Camera Permission Needed</Text>

        <Text style={styles.subtitle}>
          We need access to your camera to scan QR codes.
        </Text>

        <View style={styles.permissionButton}>
          <AppButton
            theme="primary"
            title="Grant Permission"
            icon="camera"
            onPress={requestPermission}
          />
        </View>
      </View>
    );
  }

  // QR code scanned
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setLastData(data);
    setMessage(null);

    registerAttendance(data, user?.id ?? 'unknown').then((result) => {
      setMessage(result.message);
      setSuccess(result.success);
    });
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.frame} pointerEvents="none">
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          {scanned
            ? 'QR Code detected!'
            : 'Point your camera at a QR code'}
        </Text>

        {/* Show scanned QR data */}
        {scanned && lastData && (
          <Text style={styles.scanResult}>
            {lastData}
          </Text>
        )}

        {/* Show attendance result */}
        {scanned && message && (
          <Text
            style={[
              styles.scanResult,
              success ? styles.success : styles.error,
            ]}
          >
            {message}
          </Text>
        )}

        {/* Scan again button */}
        {scanned && (
          <AppButton
            theme="primary"
            title="Scan Again"
            icon="refresh"
            onPress={() => {
              setScanned(false);
              setMessage(null);
              setLastData(null);
              setSuccess(false);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  camera: {
    ...StyleSheet.absoluteFillObject,
  },

  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  permissionButton: {
    width: '100%',
    marginTop: 24,
  },

  frame: {
    position: 'absolute',
    alignSelf: 'center',
    width: 260,
    height: 260,
  },

  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: COLORS.primary,
  },

  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },

  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },

  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },

  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },

  overlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 48,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },

  overlayText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },

  scanResult: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },

  success: {
    color: COLORS.success,
    fontWeight: '700',
  },

  error: {
    color: COLORS.danger,
    fontWeight: '700',
  },
});