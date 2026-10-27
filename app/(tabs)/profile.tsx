import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signOut, useAuth } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name?.trim() || email?.trim() || '?');
  return source.slice(0, 2).toUpperCase();
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setProfile(null);
        return;
      }

      getProfile(user.id).then((nextProfile) => {
        setProfile(nextProfile);
        setDraftName(nextProfile?.full_name ?? '');
      });
    }, [user?.id])
  );

  const handleSaveName = async () => {
    if (!user?.id) return;

    setSaving(true);
    const { error } = await updateProfile(user.id, {
      full_name: draftName.trim(),
    });
    setSaving(false);

    if (error) {
      Alert.alert('Unable to save name', error);
      return;
    }

    setProfile((current) =>
      current ? { ...current, full_name: draftName.trim() } : current
    );
    setEditing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {initials(profile?.full_name, user?.email)}
            </Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.avatarName}>
              {profile?.full_name || 'Add your name'}
            </Text>
            <View
              style={[
                styles.roleBadge,
                profile?.role === 'teacher' ? styles.teacherBadge : styles.studentBadge,
              ]}
            >
              <Text style={styles.roleBadgeText}>
                {profile?.role === 'teacher' ? 'Teacher' : 'Student'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>Name</Text>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.nameInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your name"
              editable={!saving}
            />
            <Pressable style={styles.saveButton} onPress={handleSaveName} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.nameRow} onPress={() => setEditing(true)}>
            <Text style={styles.value}>{profile?.full_name || 'Tap to add your name'}</Text>
            <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
          </Pressable>
        )}

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email || 'Not available'}</Text>

        <Text style={styles.label}>User ID</Text>
        <Text style={styles.value}>{user?.id || 'Not available'}</Text>
      </View>

      <AppButton
        theme="primary"
        title="Sign Out"
        icon="log-out-outline"
        onPress={handleSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: COLORS.textOnPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  avatarInfo: {
    flex: 1,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  teacherBadge: {
    backgroundColor: COLORS.primarySoft,
  },
  studentBadge: {
    backgroundColor: COLORS.surface,
  },
  roleBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
