-- Destekçi ve bağış tabloları
create table if not exists supporters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  amount numeric not null,
  date timestamptz not null,
  project_id text,
  unique(user_id, project_id, date)
);

create table if not exists supporter_badges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  badge text not null,
  project_id text,
  awarded_at timestamptz default now()
);

create table if not exists supporter_likes (
  id uuid default gen_random_uuid() primary key,
  target_user_id uuid references profiles(id),
  from_user_id uuid references profiles(id),
  liked_at timestamptz default now(),
  unique(target_user_id, from_user_id)
);

create table if not exists supporter_dislikes (
  id uuid default gen_random_uuid() primary key,
  target_user_id uuid references profiles(id),
  from_user_id uuid references profiles(id),
  disliked_at timestamptz default now(),
  unique(target_user_id, from_user_id)
);

-- Kullanıcı raporlama ve moderasyon tablosu
create table if not exists user_reports (
  id uuid default gen_random_uuid() primary key,
  reported_user_id uuid references profiles(id),
  reporter_user_id uuid references profiles(id),
  reason text not null,
  details text,
  status text default 'pending', -- pending, reviewed, rejected
  created_at timestamptz default now(),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz
);

create table if not exists moderation_actions (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references user_reports(id),
  moderator_id uuid references profiles(id),
  action text not null, -- e.g. 'approve', 'reject', 'ban', 'warn'
  notes text,
  created_at timestamptz default now()
);
