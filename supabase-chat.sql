-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id text PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Insert demo group
INSERT INTO public.groups (id, name)
VALUES ('demo-group-1', 'Demo Group')
ON CONFLICT (id) DO NOTHING;

-- Group Messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id text NOT NULL REFERENCES public.groups(id),
    sender_id uuid NOT NULL REFERENCES auth.users(id),
    content text NOT NULL,
    type text DEFAULT 'text',
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read groups"
ON public.groups FOR SELECT
USING (true);

CREATE POLICY "Anyone can read group messages"
ON public.group_messages FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert group messages"
ON public.group_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);
