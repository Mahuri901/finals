import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'scan-outline', text: 'Scan a QR code to check in' },
  { icon: 'time-outline', text: 'Track your attendance history' },
  { icon: 'school-outline', text: 'Teachers create events instantly' },
];

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Header title="QR Attendance" />
      </View>

      <View style={styles.hero}>
        <Text style={styles.mainTitle}>School Event Attendance</Text>
        <Text style={styles.subtitle}>
          Scan QR codes to record attendance during school activities.
        </Text>

        <View style={styles.featureList}>
          {FEATURES.map((feature) => (
            <View key={feature.text} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footerContainer}>
        <AppButton
          theme="primary"
          title="Scan QR Code"
          icon="qr-code-outline"
          onPress={() => router.push('/scan')}
        />
        <AppButton
          title="Attendance History"
          icon="time-outline"
          onPress={() => router.push('/history')}
        />
        <AppButton
          title="Profile"
          icon="person-outline"
          onPress={() => router.push('/profile')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: { flex: 1, justifyContent: 'center' },
  hero: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mainTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 21 },
  featureList: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
    gap: 10,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  footerContainer: { paddingHorizontal: 24, width: '100%', paddingBottom: 12 },
});
