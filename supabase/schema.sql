-- QR Attendance schema for Supabase Postgres.
-- Run this once in the Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  start_time timestamptz,
  end_time timestamptz,
  venue text,
  description text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint events_valid_time check (
    start_time is null or end_time is null or end_time > start_time
  )
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'present' check (status in ('present', 'absent', 'late')),
  scanned_at timestamptz not null default now(),
  unique (student_id, event_id)
);

create index if not exists events_created_by_idx on public.events(created_by);
create index if not exists attendance_student_id_idx on public.attendance(student_id);
create index if not exists attendance_event_id_idx on public.attendance(event_id);

-- Idempotent upgrades for databases created with an earlier version of this schema.
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));

alter table public.events
  add column if not exists venue text;
alter table public.events
  add column if not exists description text;
alter table public.events
  add column if not exists status text not null default 'open';
alter table public.events
  drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check check (status in ('open', 'closed'));

alter table public.attendance
  add column if not exists status text not null default 'present';
alter table public.attendance
  drop constraint if exists attendance_status_check;
alter table public.attendance
  add constraint attendance_status_check check (status in ('present', 'absent', 'late'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher'
      else 'student'
    end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role = excluded.role,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Note: the 'admin' role is intentionally NOT derived from sign-up metadata
-- (otherwise anyone could self-register as admin). Provision admins manually in
-- the SQL editor, e.g.:
--   update public.profiles set role = 'admin' where email = 'admin@school.edu';

-- Prevent non-admins from changing the role column (blocks self role escalation).
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Only administrators can change user roles';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_change on public.profiles;
create trigger prevent_role_change
before update on public.profiles
for each row execute procedure public.prevent_role_change();

-- Validate attendance inserts at the database level (closed/ended events rejected).
create or replace function public.validate_attendance_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.events
    where id = new.event_id
      and status = 'open'
      and (end_time is null or end_time > now())
  ) then
    raise exception 'Attendance is not allowed for this event';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_attendance_insert on public.attendance;
create trigger validate_attendance_insert
before insert on public.attendance
for each row execute procedure public.validate_attendance_insert();

-- Helper functions used by RLS policies. SECURITY DEFINER runs them as the
-- table owner, so the profiles lookup bypasses RLS and avoids recursion.
create or replace function public.user_role()
returns text
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.user_role() = 'admin';
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read events" on public.events;
create policy "Authenticated users can read events"
on public.events for select
to authenticated
using (true);

drop policy if exists "Teachers can create events" on public.events;
drop policy if exists "Authenticated users can create events" on public.events;
create policy "Teachers can create events"
on public.events for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.user_role() in ('teacher', 'admin')
);

drop policy if exists "Teachers can update their events" on public.events;
create policy "Teachers can update their events"
on public.events for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "Admins can manage events" on public.events;
create policy "Admins can update any event"
on public.events for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
on public.events for delete
to authenticated
using (public.is_admin());

drop policy if exists "Students can read their attendance" on public.attendance;
create policy "Students can read their attendance"
on public.attendance for select
to authenticated
using (student_id = auth.uid());

drop policy if exists "Students can record their attendance" on public.attendance;
create policy "Students can record their attendance"
on public.attendance for insert
to authenticated
with check (
  (student_id = auth.uid() and public.user_role() = 'student')
  or public.is_admin()
);

drop policy if exists "Teachers can view attendance for their events" on public.attendance;
create policy "Teachers can view attendance for their events"
on public.attendance for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = attendance.event_id
      and events.created_by = auth.uid()
  )
);

drop policy if exists "Admins can manage attendance" on public.attendance;
create policy "Admins can view all attendance"
on public.attendance for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update attendance" on public.attendance;
create policy "Admins can update attendance"
on public.attendance for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete attendance" on public.attendance;
create policy "Admins can delete attendance"
on public.attendance for delete
to authenticated
using (public.is_admin());

drop policy if exists "Teachers can view attendee profiles" on public.profiles;
create policy "Teachers can view attendee profiles"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    join public.attendance a on a.event_id = e.id
    where e.created_by = auth.uid()
      and a.student_id = profiles.id
  )
);
