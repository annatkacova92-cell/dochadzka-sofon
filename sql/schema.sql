-- Dochádzka Sofon Lab — databázová schéma pre Supabase (Postgres)
-- Spusti celý tento súbor v Supabase dashboard -> SQL Editor -> New query -> Run

-- 1) Tabuľka profilov (meno, rola). Vytvorí sa automaticky pri registrácii.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

-- 2) Tabuľka záznamov dochádzky
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  hours numeric(4,2) not null check (hours > 0 and hours <= 24),
  activity_type text not null check (
    activity_type in ('Sofon Meeting', 'Práca v Jarvisovi', 'Research', 'Iné')
  ),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists attendance_user_date_idx on public.attendance (user_id, date);

-- 3) Automatické vytvorenie profilu pri registrácii nového používateľa
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4) Pomocná funkcia na zistenie, či je prihlásený používateľ admin
--    (security definer = obchádza RLS len vo vnútri tejto funkcie,
--    aby politika na profiles nespôsobila nekonečnú rekurziu)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 5) Zapnutie Row Level Security — toto je to, čo skutočne oddeľuje dáta
alter table public.profiles enable row level security;
alter table public.attendance enable row level security;

-- 6) Politiky pre profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 7) Politiky pre attendance
drop policy if exists "attendance_select_own" on public.attendance;
create policy "attendance_select_own" on public.attendance
  for select using (auth.uid() = user_id);

drop policy if exists "attendance_select_admin" on public.attendance;
create policy "attendance_select_admin" on public.attendance
  for select using (public.is_admin());

drop policy if exists "attendance_insert_own" on public.attendance;
create policy "attendance_insert_own" on public.attendance
  for insert with check (auth.uid() = user_id);

drop policy if exists "attendance_update_own" on public.attendance;
create policy "attendance_update_own" on public.attendance
  for update using (auth.uid() = user_id);

drop policy if exists "attendance_delete_own" on public.attendance;
create policy "attendance_delete_own" on public.attendance
  for delete using (auth.uid() = user_id);

-- 8) Po tom, čo sa Anna zaregistruje cez appku, spusti (s jej skutočným emailom),
--    aby videla dochádzku všetkých:
-- update public.profiles set role = 'admin' where email = 'anna.tkacova@dius.ai';
