-- Photo upload system: user_photo_uploads table with daily limits

-- Create user_photo_uploads table
CREATE TABLE IF NOT EXISTS public.user_photo_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  room_name text,
  building_id text,
  floor_id text,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_photo_uploads_user ON public.user_photo_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_date ON public.user_photo_uploads(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_location ON public.user_photo_uploads(latitude, longitude);

-- Enable RLS
ALTER TABLE public.user_photo_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own uploads
CREATE POLICY "Users can view own photo uploads"
  ON public.user_photo_uploads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own uploads (rate limiting done in app)
CREATE POLICY "Users can insert own photo uploads"
  ON public.user_photo_uploads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all uploads
CREATE POLICY "Admins can view all photo uploads"
  ON public.user_photo_uploads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND level >= 99
    )
  );

-- Policy: Users can update their own uploads (e.g., add metadata)
CREATE POLICY "Users can update own photo uploads"
  ON public.user_photo_uploads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete own photo uploads"
  ON public.user_photo_uploads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE public.user_photo_uploads IS 'Stores user-submitted photos with location data for indoor mapping contribution';
