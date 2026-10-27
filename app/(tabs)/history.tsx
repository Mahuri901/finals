import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getAllEventAttendance,
  getTeacherEventAttendance,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getAttendanceHistory, type AttendanceRecord } from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profiles';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [allEvents, setAllEvents] = useState<TeacherEventAttendance[]>([]);
  const [role, setRole] = useState<Role>('student');
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(() => {
    if (!user?.id) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getProfile(user.id).then(async (profile) => {
      const currentRole = profile?.role ?? 'student';
      setRole(currentRole);

      if (currentRole === 'teacher') {
        setTeacherEvents(await getTeacherEventAttendance(user.id));
        setAllEvents([]);
        setRecords([]);
      } else if (currentRole === 'admin') {
        setAllEvents(await getAllEventAttendance());
        setTeacherEvents([]);
        setRecords([]);
      } else {
        setRecords(await getAttendanceHistory(user.id));
        setTeacherEvents([]);
        setAllEvents([]);
      }

      setLoading(false);
    });
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const isStaff = role === 'teacher' || role === 'admin';
  const staffEvents = role === 'admin' ? allEvents : teacherEvents;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>

      {loading ? (
        <View style={styles.state}>
          <Ionicons name="hourglass-outline" size={40} color={COLORS.textSecondary} />
          <Text style={styles.stateText}>Loading records...</Text>
        </View>
      ) : isStaff ? (
        staffEvents.length === 0 ? (
          <View style={styles.state}>
            <Ionicons name="clipboard-outline" size={40} color={COLORS.textSecondary} />
            <Text style={styles.stateText}>
              {role === 'admin'
                ? 'No events yet.'
                : 'No events yet. Create an event from the Teacher tab.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={staffEvents}
            keyExtractor={(item) => item.eventId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.eventIcon}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.eventHeaderText}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventMeta}>{item.eventCode}</Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.attendeeCount}</Text>
                  </View>
                </View>

                {item.startTime && (
                  <Text style={styles.eventMeta}>
                    Starts {formatDate(item.startTime)}
                  </Text>
                )}

                {item.attendees.length === 0 ? (
                  <Text style={styles.emptyAttendees}>No attendees yet.</Text>
                ) : (
                  item.attendees.map((attendee) => (
                    <View
                      key={`${item.eventId}-${attendee.studentId}-${attendee.scannedAt}`}
                      style={styles.attendeeRow}
                    >
                      <View style={styles.attendeeLeft}>
                        <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.attendeeId}>{shortId(attendee.studentId)}</Text>
                      </View>
                      <Text style={styles.eventMeta}>{formatDate(attendee.scannedAt)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          />
        )
      ) : records.length === 0 ? (
        <View style={styles.state}>
          <Ionicons name="qr-code-outline" size={40} color={COLORS.textSecondary} />
          <Text style={styles.stateText}>
            No records yet. Scan a QR code to register your attendance.
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.eventIcon}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                </View>
                <View style={styles.eventHeaderText}>
                  <Text style={styles.eventTitle}>{item.eventTitle}</Text>
                  <Text style={styles.eventMeta}>{item.eventId}</Text>
                </View>
              </View>
              <Text style={styles.eventMeta}>{formatDate(item.scannedAt)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
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
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventHeaderText: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  countBadge: {
    minWidth: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  countText: {
    color: COLORS.primaryDark,
    fontWeight: '800',
    fontSize: 13,
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
  emptyAttendees: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 12,
  },
  eventMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

