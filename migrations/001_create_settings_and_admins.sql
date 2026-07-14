-- Migration: create settings and admins tables, enable RLS and policies

-- Create tables
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_username text,
  whatsapp_number text,
  show_telegram boolean DEFAULT true,
  show_whatsapp boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable row level security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies
DROP POLICY IF EXISTS public_read ON public.settings;
DROP POLICY IF EXISTS admin_update ON public.settings;
DROP POLICY IF EXISTS admin_insert ON public.settings;
DROP POLICY IF EXISTS admin_delete ON public.settings;

-- Allow public reads
CREATE POLICY public_read ON public.settings
  FOR SELECT USING (true);

-- Allow updates only for admins
CREATE POLICY admin_update ON public.settings
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Allow inserts only for admins (WITH CHECK required for INSERT)
CREATE POLICY admin_insert ON public.settings
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Allow deletes only for admins
CREATE POLICY admin_delete ON public.settings
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid()));

-- Optional: insert initial settings row (comment out if you prefer to create via UI)
INSERT INTO public.settings (telegram_username, whatsapp_number, show_telegram, show_whatsapp)
SELECT '@rocketmanmuskt02', '+1234567890', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.settings);
