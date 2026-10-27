import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  deleteAttendance,
  getAllEventAttendance,
  setAttendanceStatus,
  type AttendanceStatus,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import {
  closeEvent,
  deleteEvent,
  getAllEvents,
  reopenEvent,
  type CloudEvent,
} from '@/lib/events';
import {
  getProfile,
  listProfiles,
  setUserRole,
  type Profile,
  type Role,
} from '@/lib/profiles';

type Section = 'users' | 'events' | 'attendance';

const ROLES: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
];

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
];

export default function AdminScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [section, setSection] = useState<Section>('users');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [attendance, setAttendance] = useState<TeacherEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [profilesData, eventsData, attendanceData] = await Promise.all([
      listProfiles(),
      getAllEvents(),
      getAllEventAttendance(),
    ]);
    setProfiles(profilesData);
    setEvents(eventsData);
    setAttendance(attendanceData);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user?.id) {
        setRole(null);
        setRoleLoading(false);
        setLoading(false);
        return () => {
          active = false;
        };
      }

      setRoleLoading(true);
      getProfile(user.id).then((profile) => {
        if (!active) return;
        const currentRole = profile?.role ?? null;
        setRole(currentRole);
        setRoleLoading(false);

        if (currentRole === 'admin') {
          loadAll();
        }
      });

      return () => {
        active = false;
      };
    }, [user?.id, loadAll])
  );

  const handleSetRole = async (profile: Profile, nextRole: Role) => {
    if (nextRole === profile.role) return;

    if (profile.id === user?.id && nextRole !== 'admin') {
      setMessage('You cannot remove your own admin role.');
      return;
    }

    setBusyId(profile.id);
    setMessage(null);

    const { error } = await setUserRole(profile.id, nextRole);

    if (error) {
      setMessage(error);
    } else {
      setMessage(`${profile.email} is now ${nextRole}.`);
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, role: nextRole } : p))
      );
    }

    setBusyId(null);
  };

  const handleToggleEvent = async (event: CloudEvent) => {
    const closing = event.status === 'open';

    setBusyId(event.id);
    setMessage(null);

    const { error } = closing
      ? await closeEvent(event.id)
      : await reopenEvent(event.id);

    if (error) {
      setMessage(error);
    } else {
      setMessage(`Event ${closing ? 'closed' : 'reopened'}.`);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? { ...e, status: closing ? 'closed' : 'open' }
            : e
        )
      );
    }

    setBusyId(null);
  };

  const handleDeleteEvent = async (event: CloudEvent) => {
    setBusyId(event.id);
    setMessage(null);

    const { error } = await deleteEvent(event.id);

    if (error) {
      setMessage(error);
    } else {
      setMessage('Event deleted.');
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    }

    setBusyId(null);
  };

  const handleSetAttendeeStatus = async (
    attendanceId: string,
    status: AttendanceStatus
  ) => {
    setBusyId(attendanceId);
    setMessage(null);

    const { error } = await setAttendanceStatus(attendanceId, status);

    if (error) {
      setMessage(error);
    } else {
      setAttendance((prev) =>
        prev.map((ev) => ({
          ...ev,
          attendees: ev.attendees.map((a) =>
            a.id === attendanceId ? { ...a, status } : a
          ),
        }))
      );
    }

    setBusyId(null);
  };

  const handleDeleteAttendee = async (attendanceId: string) => {
    setBusyId(attendanceId);
    setMessage(null);

    const { error } = await deleteAttendance(attendanceId);

    if (error) {
      setMessage(error);
    } else {
      setAttendance((prev) =>
        prev.map((ev) => ({
          ...ev,
          attendeeCount: Math.max(0, ev.attendeeCount - 1),
          attendees: ev.attendees.filter((a) => a.id !== attendanceId),
        }))
      );
    }

    setBusyId(null);
  };

  const filteredProfiles = profiles.filter((p) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      p.email.toLowerCase().includes(term) ||
      (p.full_name ?? '').toLowerCase().includes(term)
    );
  });

  if (roleLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.accessTitle}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== 'admin') {
    return (
      <View style={styles.center}>
        <View style={styles.accessIcon}>
          <Ionicons name="shield-checkmark-outline" size={36} color={COLORS.primary} />
        </View>
        <Text style={styles.accessTitle}>Admins Only</Text>
        <Text style={styles.accessText}>
          Only administrator accounts can manage users, events, and attendance.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin</Text>
      <Text style={styles.subtitle}>Manage users, events, and attendance.</Text>

      <View style={styles.segmentRow}>
        {(['users', 'events', 'attendance'] as Section[]).map((s) => (
          <Pressable
            key={s}
            style={[styles.segment, section === s && styles.segmentActive]}
            onPress={() => setSection(s)}
          >
            <Text
              style={[
                styles.segmentText,
                section === s && styles.segmentTextActive,
              ]}
            >
              {s === 'users' ? 'Users' : s === 'events' ? 'Events' : 'Attendance'}
            </Text>
          </Pressable>
        ))}
      </View>

      {message && <Text style={styles.message}>{message}</Text>}

      {section === 'users' && (
        <>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by email or name"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
            />
          </View>

          {loading ? (
            <View style={styles.state}>
              <Ionicons name="hourglass-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.stateText}>Loading users...</Text>
            </View>
          ) : filteredProfiles.length === 0 ? (
            <View style={styles.state}>
              <Ionicons name="people-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.stateText}>
                {search ? 'No users match your search.' : 'No users found.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProfiles}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.userIcon}>
                      <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.full_name || 'No name'}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                    <View style={[styles.roleBadge, roleBadgeStyle(item.role)]}>
                      <Text style={styles.roleBadgeText}>{item.role}</Text>
                    </View>
                  </View>

                  <View style={styles.roleRow}>
                    {ROLES.map((option) => {
                      const isActive = item.role === option.value;
                      const isBusy = busyId === item.id;
                      return (
                        <Pressable
                          key={option.value}
                          disabled={isActive || isBusy}
                          onPress={() => handleSetRole(item, option.value)}
                          style={[
                            styles.roleChip,
                            isActive && styles.roleChipActive,
                            isBusy && styles.roleChipBusy,
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleChipText,
                              isActive && styles.roleChipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            />
          )}
        </>
      )}

      {section === 'events' &&
        (loading ? (
          <View style={styles.state}>
            <Ionicons name="hourglass-outline" size={40} color={COLORS.textSecondary} />
            <Text style={styles.stateText}>Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.state}>
            <Ionicons name="calendar-outline" size={40} color={COLORS.textSecondary} />
            <Text style={styles.stateText}>No events found.</Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.userIcon}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.title}</Text>
                    <Text style={styles.userEmail}>{item.event_code}</Text>
                  </View>
                  <View style={[styles.roleBadge, item.status === 'open' ? styles.badgeStudent : styles.badgeClosed]}>
                    <Text style={styles.roleBadgeText}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    disabled={busyId === item.id}
                    style={[styles.actionChip, busyId === item.id && styles.roleChipBusy]}
                    onPress={() => handleToggleEvent(item)}
                  >
                    <Ionicons
                      name={item.status === 'open' ? 'lock-closed-outline' : 'lock-open-outline'}
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.actionChipText}>
                      {item.status === 'open' ? 'Close' : 'Reopen'}
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={busyId === item.id}
                    style={[styles.actionChip, styles.actionChipDanger, busyId === item.id && styles.roleChipBusy]}
                    onPress={() => handleDeleteEvent(item)}
                  >
                    <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                    <Text style={[styles.actionChipText, styles.actionChipTextDanger]}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        ))}

      {section === 'attendance' &&
        (loading ? (
          <View style={styles.state}>
            <Ionicons name="hourglass-outline" size={40} color={COLORS.textSecondary} />
            <Text style={styles.stateText}>Loading attendance...</Text>
          </View>
        ) : attendance.length === 0 ? (
          <View style={styles.state}>
            <Ionicons name="clipboard-outline" size={40} color={COLORS.textSecondary} />
            <Text style={styles.stateText}>No attendance records found.</Text>
          </View>
        ) : (
          <FlatList
            data={attendance}
            keyExtractor={(item) => item.eventId}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.userIcon}>
                    <Ionicons name="clipboard-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.title}</Text>
                    <Text style={styles.userEmail}>
                      {item.eventCode} · {item.attendeeCount} attendee
                      {item.attendeeCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>

                {item.attendees.length === 0 ? (
                  <Text style={styles.emptyAttendees}>No attendees yet.</Text>
                ) : (
                  item.attendees.map((attendee) => (
                    <View key={attendee.id} style={styles.attendeeRow}>
                      <View style={styles.attendeeLeft}>
                        <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.attendeeId}>{shortId(attendee.studentId)}</Text>
                      </View>

                      <View style={styles.statusRow}>
                        {STATUSES.map((option) => {
                          const isActive = attendee.status === option.value;
                          return (
                            <Pressable
                              key={option.value}
                              disabled={busyId === attendee.id}
                              onPress={() => handleSetAttendeeStatus(attendee.id, option.value)}
                              style={[
                                styles.statusChip,
                                isActive && styles.statusChipActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusChipText,
                                  isActive && styles.statusChipTextActive,
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}

                        <Pressable
                          disabled={busyId === attendee.id}
                          onPress={() => handleDeleteAttendee(attendee.id)}
                          style={styles.deleteIcon}
                        >
                          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          />
        ))}
    </View>
  );
}

function roleBadgeStyle(role: Role) {
  if (role === 'admin') return styles.badgeAdmin;
  if (role === 'teacher') return styles.badgeTeacher;
  return styles.badgeStudent;
}

function shortId(id: string) {
  return id ? `...${id.slice(-8)}` : 'unknown';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: COLORS.background,
  },
  accessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 18,
    textAlign: 'center',
  },
  accessText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.textOnPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: 8,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  badgeStudent: {
    backgroundColor: '#E3F0E9',
  },
  badgeTeacher: {
    backgroundColor: '#FFF4E5',
  },
  badgeAdmin: {
    backgroundColor: '#FDECEC',
  },
  badgeClosed: {
    backgroundColor: '#EDEDED',
  },
  roleRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  roleChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  roleChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleChipBusy: {
    opacity: 0.5,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  roleChipTextActive: {
    color: COLORS.textOnPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  actionChipDanger: {
    backgroundColor: '#FDECEC',
    borderColor: '#F3C6C4',
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 6,
  },
  actionChipTextDanger: {
    color: COLORS.danger,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 10,
    paddingTop: 10,
  },
  attendeeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendeeId: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  statusChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  statusChipTextActive: {
    color: COLORS.textOnPrimary,
  },
  deleteIcon: {
    padding: 4,
    marginLeft: 2,
  },
  emptyAttendees: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 12,
  },
});
