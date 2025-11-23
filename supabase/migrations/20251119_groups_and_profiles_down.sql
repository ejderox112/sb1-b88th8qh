-- Down migration

REVOKE EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.current_auth_uid() FROM authenticated;

ALTER TABLE IF EXISTS public.group_routes DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.group_routes CASCADE;

ALTER TABLE IF EXISTS public.live_locations DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.live_locations CASCADE;

ALTER TABLE IF EXISTS public.friend_requests DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.friend_requests CASCADE;

ALTER TABLE IF EXISTS public.group_invites DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.group_invites CASCADE;

ALTER TABLE IF EXISTS public.group_messages DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.group_messages CASCADE;

ALTER TABLE IF EXISTS public.group_members DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.group_members CASCADE;

ALTER TABLE IF EXISTS public.groups DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.groups CASCADE;

ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TABLE IF EXISTS public.locations CASCADE;

DROP FUNCTION IF EXISTS public.is_group_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_group_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.current_auth_uid();
