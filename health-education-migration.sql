-- Run in the Supabase SQL Editor to enable Health Education & Seminars without the legacy API.

CREATE TABLE IF NOT EXISTS public.health_education_activities (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    activity_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    venue TEXT NOT NULL,
    speaker TEXT,
    target_group TEXT,
    status TEXT NOT NULL DEFAULT 'Upcoming'
        CHECK (status IN ('Upcoming', 'Ongoing', 'Completed', 'Cancelled')),
    max_attendees INT CHECK (max_attendees IS NULL OR max_attendees >= 0),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.health_education_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Health education activities access" ON public.health_education_activities;
CREATE POLICY "Health education activities access"
    ON public.health_education_activities
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.health_education_participants (
    id BIGSERIAL PRIMARY KEY,
    activity_id BIGINT NOT NULL REFERENCES public.health_education_activities(id) ON DELETE CASCADE,
    attendee_name TEXT NOT NULL,
    purok TEXT,
    age INT CHECK (age IS NULL OR (age >= 0 AND age <= 150)),
    sex TEXT CHECK (sex IS NULL OR sex IN ('Male', 'Female', 'Other')),
    contact_number TEXT,
    attended BOOLEAN NOT NULL DEFAULT FALSE,
    rating NUMERIC(2,1) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    notes TEXT,
    registered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.health_education_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Health education participants access" ON public.health_education_participants;
CREATE POLICY "Health education participants access"
    ON public.health_education_participants
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.health_education_materials (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    material_type TEXT,
    file_url TEXT,
    file_name TEXT,
    language TEXT NOT NULL DEFAULT 'Tagalog / English',
    target_group TEXT,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    copies_distributed INT NOT NULL DEFAULT 0 CHECK (copies_distributed >= 0),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.health_education_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Health education materials access" ON public.health_education_materials;
CREATE POLICY "Health education materials access"
    ON public.health_education_materials
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_education_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_education_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_education_materials TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.health_education_activities_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.health_education_participants_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.health_education_materials_id_seq TO authenticated;

CREATE INDEX IF NOT EXISTS idx_health_education_activities_date
    ON public.health_education_activities (activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_education_participants_activity
    ON public.health_education_participants (activity_id);
CREATE INDEX IF NOT EXISTS idx_health_education_materials_category
    ON public.health_education_materials (category);

NOTIFY pgrst, 'reload schema';


