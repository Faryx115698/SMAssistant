-- Run in the Supabase SQL Editor to enable the Announcements tab without the legacy API.

CREATE TABLE IF NOT EXISTS public.announcements (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General News',
    priority TEXT NOT NULL DEFAULT 'Medium'
        CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Draft', 'Scheduled', 'Active', 'Expired', 'Archived')),
    posted_by TEXT NOT NULL DEFAULT 'Admin',
    date_posted DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.announcements
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General News',
    ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active',
    ADD COLUMN IF NOT EXISTS posted_by TEXT NOT NULL DEFAULT 'Admin',
    ADD COLUMN IF NOT EXISTS expiry_date DATE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.announcements
SET category = COALESCE(NULLIF(category, ''), 'General News'),
    priority = COALESCE(NULLIF(priority, ''), 'Medium'),
    status = COALESCE(NULLIF(status, ''), 'Active'),
    posted_by = COALESCE(NULLIF(posted_by, ''), 'Admin'),
    updated_at = COALESCE(updated_at, NOW())
WHERE category IS NULL
   OR priority IS NULL
   OR status IS NULL
   OR posted_by IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Announcements viewable by all" ON public.announcements;
DROP POLICY IF EXISTS "Announcements insertable by auth users" ON public.announcements;
DROP POLICY IF EXISTS "Announcements manageable by auth users" ON public.announcements;

CREATE POLICY "Announcements viewable by all"
    ON public.announcements
    FOR SELECT
    USING (true);

CREATE POLICY "Announcements manageable by auth users"
    ON public.announcements
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.announcements_id_seq TO authenticated;

CREATE INDEX IF NOT EXISTS idx_announcements_category
    ON public.announcements (category);
CREATE INDEX IF NOT EXISTS idx_announcements_status
    ON public.announcements (status);
CREATE INDEX IF NOT EXISTS idx_announcements_date_posted
    ON public.announcements (date_posted DESC);

NOTIFY pgrst, 'reload schema';
