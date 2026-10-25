-- Run in the Supabase SQL Editor to enable TB-DOTS without the MySQL API.

CREATE TABLE IF NOT EXISTS public.tb_cases (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT REFERENCES public.patients(id) ON DELETE SET NULL,
    tb_code TEXT UNIQUE NOT NULL,
    patient_name TEXT NOT NULL,
    age INT,
    sex TEXT CHECK (sex IN ('Male', 'Female')),
    category TEXT NOT NULL DEFAULT 'Category I (New Case)',
    phase TEXT NOT NULL DEFAULT 'Intensive',
    treatment_start DATE,
    weight TEXT,
    bhw TEXT,
    contact TEXT,
    address TEXT,
    progress_month INT NOT NULL DEFAULT 1,
    total_months INT NOT NULL DEFAULT 6,
    progress_percent INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tb_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TB cases access" ON public.tb_cases;
CREATE POLICY "TB cases access"
    ON public.tb_cases
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.tb_intakes (
    id BIGSERIAL PRIMARY KEY,
    tb_case_id BIGINT NOT NULL REFERENCES public.tb_cases(id) ON DELETE CASCADE,
    intake_date DATE NOT NULL,
    intake_time TIME,
    regimen TEXT NOT NULL,
    dose TEXT,
    observed_by TEXT,
    adverse_event TEXT DEFAULT 'None',
    status TEXT NOT NULL DEFAULT 'Taken',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tb_intakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TB intakes access" ON public.tb_intakes;
CREATE POLICY "TB intakes access"
    ON public.tb_intakes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.tb_lab_results (
    id BIGSERIAL PRIMARY KEY,
    tb_case_id BIGINT REFERENCES public.tb_cases(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    test_type TEXT NOT NULL,
    timing TEXT,
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    smear_result TEXT,
    genexpert TEXT,
    rif_resistance TEXT,
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tb_lab_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TB lab results access" ON public.tb_lab_results;
CREATE POLICY "TB lab results access"
    ON public.tb_lab_results
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.tb_contacts (
    id BIGSERIAL PRIMARY KEY,
    tb_case_id BIGINT REFERENCES public.tb_cases(id) ON DELETE SET NULL,
    index_patient_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    relation TEXT,
    age INT,
    symptoms TEXT,
    xray_tst TEXT,
    tpt_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tb_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TB contacts access" ON public.tb_contacts;
CREATE POLICY "TB contacts access"
    ON public.tb_contacts
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tb_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tb_intakes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tb_lab_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tb_contacts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tb_cases_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tb_intakes_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tb_lab_results_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tb_contacts_id_seq TO authenticated;

NOTIFY pgrst, 'reload schema';