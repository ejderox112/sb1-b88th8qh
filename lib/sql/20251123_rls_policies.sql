-- supporters tablosu için RLS
alter table supporters enable row level security;
create policy "User can view own support records" on supporters
  for select using (user_id = auth.uid());
create policy "User can insert own support records" on supporters
  for insert with check (user_id = auth.uid());

-- supporter_badges tablosu için RLS
alter table supporter_badges enable row level security;
create policy "User can view own badges" on supporter_badges
  for select using (user_id = auth.uid());

-- supporter_likes tablosu için RLS
alter table supporter_likes enable row level security;
create policy "User can like/dislike" on supporter_likes
  for select using (from_user_id = auth.uid() or target_user_id = auth.uid());
create policy "User can insert like" on supporter_likes
  for insert with check (from_user_id = auth.uid());

-- supporter_dislikes tablosu için RLS
alter table supporter_dislikes enable row level security;
create policy "User can like/dislike" on supporter_dislikes
  for select using (from_user_id = auth.uid() or target_user_id = auth.uid());
create policy "User can insert dislike" on supporter_dislikes
  for insert with check (from_user_id = auth.uid());

-- user_reports tablosu için RLS
alter table user_reports enable row level security;
create policy "User can view own reports" on user_reports
  for select using (reporter_user_id = auth.uid() or reviewed_by = auth.uid());
create policy "User can insert report" on user_reports
  for insert with check (reporter_user_id = auth.uid());

-- moderation_actions tablosu için RLS
alter table moderation_actions enable row level security;
create policy "Moderator can view actions" on moderation_actions
  for select using (moderator_id = auth.uid());
create policy "Moderator can insert action" on moderation_actions
  for insert with check (moderator_id = auth.uid());
