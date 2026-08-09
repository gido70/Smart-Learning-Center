-- Smart Learning Center 3.1.0 — بوابة المحاضرات الشخصية
-- يُشغّل مرة واحدة في Supabase SQL Editor الخاص بهذه المنصة.

create table if not exists public.slc_lectures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.slc_courses(id) on delete cascade,
  title text not null,
  source_url text not null,
  source_type text not null default 'external'
    check (source_type in ('youtube','external','video','audio','pdf')),
  open_mode text not null default 'auto'
    check (open_mode in ('auto','internal','external')),
  module_name text,
  lecture_order integer check (lecture_order is null or lecture_order > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  status text not null default 'not_started'
    check (status in ('not_started','watching','completed','summarized','review')),
  notes text,
  transcript_text text,
  last_position_seconds integer not null default 0 check (last_position_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.slc_lectures enable row level security;

drop policy if exists "slc_lectures_select_own" on public.slc_lectures;
drop policy if exists "slc_lectures_insert_own" on public.slc_lectures;
drop policy if exists "slc_lectures_update_own" on public.slc_lectures;
drop policy if exists "slc_lectures_delete_own" on public.slc_lectures;

create policy "slc_lectures_select_own" on public.slc_lectures
  for select using (auth.uid() = owner_id);
create policy "slc_lectures_insert_own" on public.slc_lectures
  for insert with check (auth.uid() = owner_id);
create policy "slc_lectures_update_own" on public.slc_lectures
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "slc_lectures_delete_own" on public.slc_lectures
  for delete using (auth.uid() = owner_id);

create index if not exists slc_lectures_owner_idx on public.slc_lectures(owner_id);
create index if not exists slc_lectures_course_idx on public.slc_lectures(course_id);
create index if not exists slc_lectures_search_idx on public.slc_lectures
  using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(module_name,'') || ' ' || coalesce(notes,'')));

-- توسيع جدول الخلاصات الموجود كي ترتبط الخلاصة بمحاضرة محددة.
alter table public.slc_summaries add column if not exists lecture_id uuid references public.slc_lectures(id) on delete cascade;
alter table public.slc_summaries add column if not exists summary_key text;
create unique index if not exists slc_summaries_summary_key_uidx on public.slc_summaries(summary_key);
create index if not exists slc_summaries_lecture_idx on public.slc_summaries(lecture_id);

-- تعبئة مفتاح ثابت للخلاصات القديمة المرتبطة بالكورسات.
update public.slc_summaries
set summary_key = 'course:' || course_id::text
where summary_key is null and course_id is not null;
