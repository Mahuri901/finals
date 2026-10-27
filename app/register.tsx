import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setMessage('Name, email, and password are required.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const { data, error } = await signUp(email.trim(), password, {
      full_name: fullName.trim(),
      role,
    });

    if (error) {
      setMessage(error.message || 'Unable to create account.');
      setLoading(false);
      return;
    }

    if (!data.session) {
      router.replace({
        pathname: '/login',
        params: { message: 'Account created. Check your email to confirm it, then sign in.' },
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Ionicons name="person-add-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join QR Attendance in seconds</Text>
        </View>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Jane Doe"
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          {(['student', 'teacher'] as const).map((option) => (
            <Pressable
              key={option}
              style={[styles.roleChip, role === option && styles.roleChipActive]}
              onPress={() => setRole(option)}
            >
              <Text style={[styles.roleChipText, role === option && styles.roleChipTextActive]}>
                {option === 'student' ? 'Student' : 'Teacher'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="student@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          secureTextEntry
        />

        {message && <Text style={styles.message}>{message}</Text>}

        <AppButton
          theme="primary"
          title={loading ? 'Creating account...' : 'Register'}
          icon="person-add-outline"
          onPress={handleRegister}
        />

        <AppButton
          title="Back to login"
          icon="arrow-back-outline"
          onPress={() => router.replace('/login')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    paddingVertical: 14,
  },
  roleChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  roleChipText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    color: COLORS.danger,
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'left',
  },
});
