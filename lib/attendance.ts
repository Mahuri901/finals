import { Platform } from 'react-native';

import { getEventByCode } from './events';
import { parseQRPayload } from './qr';
import { hasSupabaseConfig, supabase } from './supabase';

const SQLite =
  Platform.OS === 'web'
    ? null
    : (require('expo-sqlite') as typeof import('expo-sqlite'));

const memoryEvents = new Map<string, { title: string; start: string; end: string }>();
const memoryAttendance = new Map<string, Set<string>>();

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
  status?: AttendanceStatus;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

let db: any = null;

async function getDb() {
  if (Platform.OS === 'web' || !SQLite) return null;

  if (!db) {
    db = await SQLite.openDatabaseAsync('qr-attendance.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS events (
        eventId TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId TEXT NOT NULL,
        eventId TEXT NOT NULL,
        scannedAt TEXT NOT NULL,
        UNIQUE (studentId, eventId)
      );
    `);
  }

  return db;
}

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  status: string | null;
  attendeeCount: number;
  attendees: {
    id: string;
    studentId: string;
    scannedAt: string;
    status: AttendanceStatus | null;
  }[];
};

export type TeacherEventSummary = Pick<
  TeacherEventAttendance,
  'eventId' | 'eventCode' | 'title' | 'attendeeCount'
>;

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) return { success: false, message: parsed.message };

  const payload = parsed.payload;
  const now = Date.now();
  const start = payload.start ? new Date(payload.start).getTime() : null;
  const end = payload.end ? new Date(payload.end).getTime() : null;

  if (start && now < start) {
    return { success: false, message: 'Event has not started yet.' };
  }
  if (end && now > end) {
    return { success: false, message: 'Event has already ended.' };
  }

  const title = payload.title ?? payload.event;

  if (hasSupabaseConfig()) {
    const event = await getEventByCode(payload.event);
    if (!event) {
      return {
        success: false,
        message: 'Event not found. Ask the teacher to create it first.',
        eventTitle: title,
      };
    }

    const { error } = await supabase.from('attendance').insert({
      student_id: studentId,
      event_id: event.id,
      scanned_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          message: 'Already registered for this event.',
          eventTitle: event.title,
        };
      }
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: 'Attendance recorded!',
      eventTitle: event.title,
    };
  }

  if (Platform.OS === 'web') {
    const event = memoryEvents.get(payload.event);
    if (!event) {
      memoryEvents.set(payload.event, {
        title,
        start: payload.start ?? new Date().toISOString(),
        end: payload.end ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    }

    const existing = memoryAttendance.get(studentId) ?? new Set<string>();
    if (existing.has(payload.event)) {
      return { success: false, message: 'Already registered for this event.', eventTitle: title };
    }

    existing.add(payload.event);
    memoryAttendance.set(studentId, existing);
    return { success: true, message: 'Attendance recorded!', eventTitle: title };
  }

  const database = await getDb();
  await database.runAsync(
    'INSERT OR IGNORE INTO events (eventId, title, start, end) VALUES (?, ?, ?, ?)',
    payload.event,
    title,
    payload.start ?? '',
    payload.end ?? ''
  );

  const result = await database.runAsync(
    'INSERT OR IGNORE INTO attendance (studentId, eventId, scannedAt) VALUES (?, ?, ?)',
    studentId,
    payload.event,
    new Date().toISOString()
  );

  if (result.changes === 0) {
    return { success: false, message: 'Already registered for this event.', eventTitle: title };
  }

  return { success: true, message: 'Attendance recorded!', eventTitle: title };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  if (hasSupabaseConfig()) {
    const { data, error } = await supabase
      .from('attendance')
      .select('id, scanned_at, events(event_code, title)')
      .eq('student_id', studentId)
      .order('scanned_at', { ascending: false });

    if (!error && data) {
      return data.map((row: any) => ({
        id: String(row.id),
        eventId: row.events?.event_code ?? '',
        eventTitle: row.events?.title ?? '',
        scannedAt: row.scanned_at,
      }));
    }
    return [];
  }

  if (Platform.OS === 'web') {
    const seen = memoryAttendance.get(studentId) ?? new Set<string>();
    return Array.from(seen).map((eventId) => ({
      id: `${eventId}-${Date.now()}`,
      eventId,
      eventTitle: memoryEvents.get(eventId)?.title ?? eventId,
      scannedAt: new Date().toISOString(),
    }));
  }

  const database = await getDb();
  const rows = await database.getAllAsync(
    `SELECT a.id, a.eventId, e.title AS eventTitle, a.scannedAt
     FROM attendance a
     JOIN events e ON e.eventId = a.eventId
     WHERE a.studentId = ?
     ORDER BY a.scannedAt DESC`,
    studentId
  );
  return (rows as any[]).map((row) => ({
    id: String(row.id),
    eventId: row.eventId,
    eventTitle: row.eventTitle,
    scannedAt: row.scannedAt,
  }));
}

async function fetchEventAttendance(
  teacherId?: string
): Promise<TeacherEventAttendance[]> {
  let query = supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time, status, created_at');

  if (teacherId) {
    query = query.eq('created_by', teacherId);
  }

  const { data: events, error: eventError } = await query.order('created_at', {
    ascending: false,
  });

  if (eventError || !events) {
    return [];
  }

  const eventIds = events.map((event) => event.id);
  if (eventIds.length === 0) {
    return [];
  }

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('id, student_id, scanned_at, status, event_id')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attendanceError || !attendance) {
    return events.map((event) => ({
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      status: event.status,
      attendeeCount: 0,
      attendees: [],
    }));
  }

  return events.map((event) => {
    const rows = attendance.filter((row) => row.event_id === event.id);

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      status: event.status,
      attendeeCount: rows.length,
      attendees: rows.map((row) => ({
        id: row.id,
        studentId: row.student_id,
        scannedAt: row.scanned_at,
        status: row.status,
      })),
    };
  });
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  return fetchEventAttendance(teacherId);
}

export async function getAllEventAttendance(): Promise<TeacherEventAttendance[]> {
  return fetchEventAttendance();
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, created_at')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = events.map((event) => event.id);
  if (eventIds.length === 0) return [];

  const { data: attendanceRows, error: attendanceError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attendanceError || !attendanceRows) return [];

  const counts: Record<string, number> = {};
  attendanceRows.forEach((row) => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  });

  return events.map((event) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}

export async function setAttendanceStatus(
  attendanceId: string,
  status: AttendanceStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('attendance')
    .update({ status })
    .eq('id', attendanceId);

  return { error: error?.message ?? null };
}

export async function deleteAttendance(
  attendanceId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', attendanceId);

  return { error: error?.message ?? null };
}
