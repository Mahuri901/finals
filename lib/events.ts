import { supabase } from './supabase';

export type EventStatus = 'open' | 'closed';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
  venue?: string;
  description?: string;
  status?: EventStatus;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  description: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
};

export async function getEventByCode(eventCode: string): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', eventCode)
    .maybeSingle();

  if (error || !data) return null;
  return data as CloudEvent;
}

export async function getEventById(eventId: string): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error || !data) return null;
  return data as CloudEvent;
}

export async function getEventsByTeacher(teacherId: string): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as CloudEvent[];
}

export async function getAllEvents(): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as CloudEvent[];
}

export async function createEvent(event: Event): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Not logged in' };
  }

  const { error } = await supabase
    .from('events')
    .upsert(
      {
        event_code: event.eventId,
        title: event.title,
        start_time: event.start,
        end_time: event.end,
        venue: event.venue ?? null,
        description: event.description ?? null,
        status: event.status ?? 'open',
        created_by: user.id,
      },
      { onConflict: 'event_code' }
    );

  return { error: error?.message ?? null };
}

export async function updateEvent(
  eventId: string,
  updates: Partial<Pick<Event, 'title' | 'start' | 'end' | 'venue' | 'description' | 'status'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({
      title: updates.title,
      start_time: updates.start,
      end_time: updates.end,
      venue: updates.venue,
      description: updates.description,
      status: updates.status,
    })
    .eq('id', eventId);

  return { error: error?.message ?? null };
}

export async function closeEvent(eventId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({ status: 'closed' })
    .eq('id', eventId);

  return { error: error?.message ?? null };
}

export async function reopenEvent(eventId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({ status: 'open' })
    .eq('id', eventId);

  return { error: error?.message ?? null };
}

export async function deleteEvent(eventId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  return { error: error?.message ?? null };
}
