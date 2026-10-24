-- Run in the Supabase SQL Editor to enable maternal health without the MySQL API.

ALTER TABLE public.maternal_records
    ADD COLUMN IF NOT EXISTS lmp DATE,
    ADD COLUMN IF NOT EXISTS philhealth TEXT,
    ADD COLUMN IF NOT EXISTS civil_status TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS public.maternal_anc_visits (
    id BIGSERIAL PRIMARY KEY,
    maternal_id BIGINT NOT NULL REFERENCES public.maternal_records(id) ON DELETE CASCADE,
    visit_no TEXT NOT NULL,
    visit_date DATE NOT NULL,
    gestational_age TEXT,
    weight TEXT,
    bp TEXT,
    fetal_age TEXT,
    next_visit DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.maternal_anc_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Maternal ANC visits access" ON public.maternal_anc_visits;
CREATE POLICY "Maternal ANC visits access"
    ON public.maternal_anc_visits
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.maternal_appointments (
    id BIGSERIAL PRIMARY KEY,
    maternal_id BIGINT NOT NULL REFERENCES public.maternal_records(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_type TEXT NOT NULL DEFAULT 'ANC Visit',
    status TEXT NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.maternal_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Maternal appointments access" ON public.maternal_appointments;
CREATE POLICY "Maternal appointments access"
    ON public.maternal_appointments
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.maternal_pnc_records (
    id BIGSERIAL PRIMARY KEY,
    maternal_id BIGINT NOT NULL REFERENCES public.maternal_records(id) ON DELETE CASCADE,
    pnc_number TEXT,
    weeks_postpartum INT,
    last_visit DATE,
    next_visit DATE,
    risk_level TEXT DEFAULT 'Low Risk',
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.maternal_pnc_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Maternal PNC records access" ON public.maternal_pnc_records;
CREATE POLICY "Maternal PNC records access"
    ON public.maternal_pnc_records
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
