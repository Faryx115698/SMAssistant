-- Run in the Supabase SQL Editor to enable the Patient Registration health profile tab.

CREATE TABLE IF NOT EXISTS public.health_profiles (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT REFERENCES public.patients(id) ON DELETE CASCADE,
    blood_type TEXT DEFAULT 'O+',
    height TEXT,
    weight TEXT,
    allergies TEXT DEFAULT 'None known',
    medical_conditions TEXT DEFAULT 'None',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Health profiles access" ON public.health_profiles;
CREATE POLICY "Health profiles access"
    ON public.health_profiles
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_profiles TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.health_profiles_id_seq TO authenticated;

NOTIFY pgrst, 'reload schema';