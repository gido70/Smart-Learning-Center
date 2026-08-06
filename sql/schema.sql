-- ============================================================
-- Course Hub — Schema أساسي مع RLS (Multi-tenant من البداية)
-- شغّله في Supabase SQL Editor
-- ============================================================

-- تفعيل امتداد UUID
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. المشاريع (Projects) — أكاديمية الفلاح، الترجمة، ...إلخ
-- ---------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 2. الدورات (Courses)
-- ---------------------------------------------------------
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  instructor text,
  platform text, -- youtube / udemy / اسم منصة الاشتراك ...
  domain text,   -- github / supabase / n8n / ترجمة / ai ...
  importance smallint default 3 check (importance between 1 and 5),
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 3. المحاضرات (Lectures) — القلب الأساسي للنظام
-- ---------------------------------------------------------
create table lectures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  project_id uuid references projects(id) on delete set null,

  title text,
  source_url text not null,
  video_id text,              -- معرف يوتيوب المستخرج من الرابط
  duration_seconds int,

  -- المحتوى الخام
  transcript_raw text,        -- النص الكامل قبل التلخيص
  transcript_chunks jsonb,    -- تقسيم النص لأجزاء زمنية (لمحاضرات > 20 دقيقة)

  -- المستويات الهرمية من التلخيص (المستوى 0-2)
  summary_quick jsonb,        -- 5-10 نقاط سريعة
  summary_detailed jsonb,     -- ملخص مقسّم بفصول زمنية
  summary_actionable jsonb,   -- ماذا أستفيد / خطوات / أكواد / أخطاء محتملة

  -- حالة المحاضرة
  status text default 'not_started'
    check (status in ('not_started','summary_only','watching_full','applied','needs_review')),

  processing_status text default 'pending'
    check (processing_status in ('pending','extracting','summarizing','done','failed')),
  processing_error text,

  personal_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 4. بنك المعرفة — عناصر مستقلة قابلة للبحث (كود / أمر / مفهوم)
-- ---------------------------------------------------------
create table knowledge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lecture_id uuid not null references lectures(id) on delete cascade,

  item_type text check (item_type in
    ('code','command','concept','tool','link','error_solution','prompt','other')),
  title text not null,
  content text not null,
  timestamp_seconds int, -- مكان ورودها في الفيديو

  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 5. المهام العملية الناتجة عن المحاضرات
-- ---------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lecture_id uuid references lectures(id) on delete set null,
  project_id uuid references projects(id) on delete set null,

  description text not null,
  status text default 'not_started'
    check (status in ('not_started','in_progress','done','blocked')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 6. جدولة المراجعة (بسيطة، ليست Spaced Repetition معقد بعد)
-- ---------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lecture_id uuid not null references lectures(id) on delete cascade,

  scheduled_for date not null,
  completed boolean default false,
  understanding_level text
    check (understanding_level in ('not_understood','partial','good','can_apply')),

  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security — كل مستخدم يرى بياناته فقط (أساس المشاركة الآمنة)
-- ============================================================
alter table projects enable row level security;
alter table courses enable row level security;
alter table lectures enable row level security;
alter table knowledge_items enable row level security;
alter table tasks enable row level security;
alter table reviews enable row level security;

-- سياسة موحدة: كل جدول - المستخدم يرى ويعدل بياناته فقط
create policy "own_projects" on projects for all using (auth.uid() = user_id);
create policy "own_courses" on courses for all using (auth.uid() = user_id);
create policy "own_lectures" on lectures for all using (auth.uid() = user_id);
create policy "own_knowledge" on knowledge_items for all using (auth.uid() = user_id);
create policy "own_tasks" on tasks for all using (auth.uid() = user_id);
create policy "own_reviews" on reviews for all using (auth.uid() = user_id);

-- ============================================================
-- فهارس للبحث السريع
-- ============================================================
create index idx_lectures_user on lectures(user_id);
create index idx_lectures_course on lectures(course_id);
create index idx_lectures_status on lectures(status);
create index idx_knowledge_lecture on knowledge_items(lecture_id);
create index idx_knowledge_type on knowledge_items(item_type);

-- بحث نصي بسيط (كافٍ للمرحلة الأولى، قبل pgvector)
create index idx_lectures_search on lectures
  using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(transcript_raw,'')));
