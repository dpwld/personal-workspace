-- Personal Workspace 스키마 v2 (Supabase SQL Editor에 붙여넣어 실행)
-- 서버(service key)에서만 접근하므로 RLS는 잠가둔다.

create table if not exists checkins (
  date text primary key,
  first_task text not null default '',
  first_task_done boolean not null default false,
  gratitude jsonb not null default '["","",""]',
  learned text not null default '',
  mood text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists work_logs (
  id uuid primary key default gen_random_uuid(),
  date text not null,
  minutes integer not null,
  project text not null default '기타',
  note text not null default ''
);

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  time text not null,
  color text not null default 'blue',
  "desc" text not null default '',
  sort integer not null default 0,
  active boolean not null default true
);

create table if not exists routine_checks (
  date text not null,
  routine_id uuid not null references routines(id) on delete cascade,
  done boolean not null default false,
  primary key (date, routine_id)
);

-- 할일/스크랩/노트/문화/여행/콘텐츠/학업/분기목표 항목 공용
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists items_kind_idx on items (kind, created_at desc);

-- 목표판 및 루틴 설정 문서
create table if not exists docs (
  id text primary key,
  data jsonb not null
);

alter table checkins enable row level security;
alter table work_logs enable row level security;
alter table routines enable row level security;
alter table routine_checks enable row level security;
alter table items enable row level security;
alter table docs enable row level security;
