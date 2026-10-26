-- Additive child-health workflow for existing Supabase projects.
-- Run once in the intended project's SQL Editor; safe to rerun.

ALTER TABLE public.child_records
    ADD COLUMN IF NOT EXISTS patient_id BIGINT,
    ADD COLUMN IF NOT EXISTS birth_weight_kg NUMERIC(5,2);

ALTER TABLE public.child_records
    DROP CONSTRAINT IF EXISTS child_records_patient_id_fkey;
ALTER TABLE public.child_records
    ADD CONSTRAINT child_records_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
ALTER TABLE public.child_records
    DROP CONSTRAINT IF EXISTS child_records_patient_link_required;
ALTER TABLE public.child_records
    ADD CONSTRAINT child_records_patient_link_required
    CHECK (patient_id IS NOT NULL) NOT VALID;
ALTER TABLE public.child_records
    DROP CONSTRAINT IF EXISTS child_records_birth_weight_range_check;
ALTER TABLE public.child_records
    ADD CONSTRAINT child_records_birth_weight_range_check
    CHECK (birth_weight_kg IS NULL OR birth_weight_kg BETWEEN 0.3 AND 8);
CREATE UNIQUE INDEX IF NOT EXISTS child_records_patient_id_unique_idx
    ON public.child_records (patient_id) WHERE patient_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.child_visits (
    id BIGSERIAL PRIMARY KEY,
    child_id BIGINT NOT NULL REFERENCES public.child_records(id) ON DELETE RESTRICT,
    visit_date DATE NOT NULL,
    visit_type TEXT NOT NULL,
    bp TEXT,
    weight_kg NUMERIC(6,2) CHECK (weight_kg IS NULL OR weight_kg BETWEEN 0.3 AND 250),
    height_cm NUMERIC(6,1) CHECK (height_cm IS NULL OR height_cm BETWEEN 20 AND 250),
    head_circumference_cm NUMERIC(5,1) CHECK (head_circumference_cm IS NULL OR head_circumference_cm BETWEEN 20 AND 80),
    next_visit DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.child_visits
    ADD COLUMN IF NOT EXISTS head_circumference_cm NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS next_visit DATE,
    ADD COLUMN IF NOT EXISTS follow_up_status TEXT NOT NULL DEFAULT 'Scheduled',
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.child_visits
    DROP CONSTRAINT IF EXISTS child_visits_follow_up_status_check;
ALTER TABLE public.child_visits
    ADD CONSTRAINT child_visits_follow_up_status_check
    CHECK (follow_up_status IN ('Scheduled', 'Completed', 'Cancelled'));
ALTER TABLE public.child_visits
    DROP CONSTRAINT IF EXISTS child_visits_next_visit_check;
ALTER TABLE public.child_visits
    ADD CONSTRAINT child_visits_next_visit_check
    CHECK (next_visit IS NULL OR next_visit >= visit_date);
CREATE INDEX IF NOT EXISTS child_visits_child_date_idx
    ON public.child_visits (child_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS child_visits_next_visit_idx
    ON public.child_visits (next_visit) WHERE next_visit IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.child_nutrition_assessments (
    id BIGSERIAL PRIMARY KEY,
    child_id BIGINT NOT NULL REFERENCES public.child_records(id) ON DELETE RESTRICT,
    assessment_date DATE NOT NULL,
    program_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
    program_name TEXT,
    follow_up_date DATE,
    follow_up_status TEXT NOT NULL DEFAULT 'Scheduled',
    assessment TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.child_nutrition_assessments
    ADD COLUMN IF NOT EXISTS follow_up_status TEXT NOT NULL DEFAULT 'Scheduled',
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.child_nutrition_assessments
    DROP CONSTRAINT IF EXISTS child_nutrition_follow_up_status_check;
ALTER TABLE public.child_nutrition_assessments
    ADD CONSTRAINT child_nutrition_follow_up_status_check
    CHECK (follow_up_status IN ('Scheduled', 'Completed', 'Cancelled'));
ALTER TABLE public.child_nutrition_assessments
    DROP CONSTRAINT IF EXISTS child_nutrition_follow_up_date_check;
ALTER TABLE public.child_nutrition_assessments
    ADD CONSTRAINT child_nutrition_follow_up_date_check
    CHECK (follow_up_date IS NULL OR follow_up_date >= assessment_date);
CREATE INDEX IF NOT EXISTS child_nutrition_assessments_child_date_idx
    ON public.child_nutrition_assessments (child_id, assessment_date DESC);
CREATE INDEX IF NOT EXISTS child_nutrition_assessments_follow_up_idx
    ON public.child_nutrition_assessments (follow_up_date) WHERE follow_up_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.child_development_screenings (
    id BIGSERIAL PRIMARY KEY,
    child_id BIGINT NOT NULL REFERENCES public.child_records(id) ON DELETE RESTRICT,
    screening_date DATE NOT NULL,
    tool_name TEXT NOT NULL,
    tool_version TEXT,
    outcome TEXT NOT NULL DEFAULT 'Recorded',
    observations TEXT,
    referral_notes TEXT,
    follow_up_date DATE,
    follow_up_status TEXT NOT NULL DEFAULT 'Scheduled',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.child_development_screenings
    ADD COLUMN IF NOT EXISTS follow_up_status TEXT NOT NULL DEFAULT 'Scheduled',
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.child_development_screenings
    DROP CONSTRAINT IF EXISTS child_screening_follow_up_status_check;
ALTER TABLE public.child_development_screenings
    ADD CONSTRAINT child_screening_follow_up_status_check
    CHECK (follow_up_status IN ('Scheduled', 'Completed', 'Cancelled'));
ALTER TABLE public.child_development_screenings
    DROP CONSTRAINT IF EXISTS child_screening_follow_up_date_check;
ALTER TABLE public.child_development_screenings
    ADD CONSTRAINT child_screening_follow_up_date_check
    CHECK (follow_up_date IS NULL OR follow_up_date >= screening_date);
CREATE INDEX IF NOT EXISTS child_development_screenings_child_date_idx
    ON public.child_development_screenings (child_id, screening_date DESC);
CREATE INDEX IF NOT EXISTS child_development_screenings_follow_up_idx
    ON public.child_development_screenings (follow_up_date) WHERE follow_up_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.child_health_audit (
    id BIGSERIAL PRIMARY KEY,
    child_id BIGINT NOT NULL REFERENCES public.child_records(id) ON DELETE RESTRICT,
    record_type TEXT NOT NULL CHECK (record_type IN ('profile', 'visit', 'nutrition', 'screening')),
    record_id BIGINT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE')),
    old_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    new_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS child_health_audit_child_date_idx
    ON public.child_health_audit (child_id, changed_at DESC);

ALTER TABLE public.child_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_nutrition_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_development_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_health_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Child health profiles access" ON public.child_records;
CREATE POLICY "Child health profiles access" ON public.child_records
    FOR ALL TO authenticated USING (public.is_health_center_staff()) WITH CHECK (public.is_health_center_staff());
DROP POLICY IF EXISTS "Child visits access" ON public.child_visits;
CREATE POLICY "Child visits access" ON public.child_visits
    FOR ALL TO authenticated USING (public.is_health_center_staff()) WITH CHECK (public.is_health_center_staff());
DROP POLICY IF EXISTS "Child nutrition assessments access" ON public.child_nutrition_assessments;
CREATE POLICY "Child nutrition assessments access" ON public.child_nutrition_assessments
    FOR ALL TO authenticated USING (public.is_health_center_staff()) WITH CHECK (public.is_health_center_staff());
DROP POLICY IF EXISTS "Child development screenings access" ON public.child_development_screenings;
CREATE POLICY "Child development screenings access" ON public.child_development_screenings
    FOR ALL TO authenticated USING (public.is_health_center_staff()) WITH CHECK (public.is_health_center_staff());
DROP POLICY IF EXISTS "Child health audit read access" ON public.child_health_audit;
CREATE POLICY "Child health audit read access" ON public.child_health_audit
    FOR SELECT TO authenticated USING (public.is_health_center_staff());

GRANT SELECT, INSERT, UPDATE ON public.child_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.child_visits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.child_nutrition_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.child_development_screenings TO authenticated;
GRANT SELECT ON public.child_health_audit TO authenticated;
REVOKE DELETE ON public.child_records, public.child_visits, public.child_nutrition_assessments, public.child_development_screenings
    FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.child_records_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.child_visits_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.child_nutrition_assessments_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.child_development_screenings_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.child_health_audit_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_child_health_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_child_id BIGINT;
    v_record_id BIGINT;
    v_old_data JSONB := '{}'::JSONB;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_old_data := TO_JSONB(OLD);
        v_record_id := OLD.id;
        IF TG_TABLE_NAME = 'child_records' THEN
            v_child_id := OLD.id;
        ELSE
            v_child_id := OLD.child_id;
        END IF;
    ELSE
        v_record_id := NEW.id;
        IF TG_TABLE_NAME = 'child_records' THEN
            v_child_id := NEW.id;
        ELSE
            v_child_id := NEW.child_id;
        END IF;
    END IF;

    INSERT INTO public.child_health_audit (
        child_id, record_type, record_id, action, old_data, new_data, changed_by
    )
    VALUES (
        v_child_id,
        CASE TG_TABLE_NAME
            WHEN 'child_records' THEN 'profile'
            WHEN 'child_visits' THEN 'visit'
            WHEN 'child_nutrition_assessments' THEN 'nutrition'
            ELSE 'screening'
        END,
        v_record_id,
        TG_OP,
        v_old_data,
        TO_JSONB(NEW),
        auth.uid()
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS child_profile_audit_trigger ON public.child_records;
CREATE TRIGGER child_profile_audit_trigger
    AFTER INSERT OR UPDATE ON public.child_records
    FOR EACH ROW EXECUTE FUNCTION public.audit_child_health_change();
DROP TRIGGER IF EXISTS child_visit_audit_trigger ON public.child_visits;
CREATE TRIGGER child_visit_audit_trigger
    AFTER INSERT OR UPDATE ON public.child_visits
    FOR EACH ROW EXECUTE FUNCTION public.audit_child_health_change();
DROP TRIGGER IF EXISTS child_nutrition_audit_trigger ON public.child_nutrition_assessments;
CREATE TRIGGER child_nutrition_audit_trigger
    AFTER INSERT OR UPDATE ON public.child_nutrition_assessments
    FOR EACH ROW EXECUTE FUNCTION public.audit_child_health_change();
DROP TRIGGER IF EXISTS child_screening_audit_trigger ON public.child_development_screenings;
CREATE TRIGGER child_screening_audit_trigger
    AFTER INSERT OR UPDATE ON public.child_development_screenings
    FOR EACH ROW EXECUTE FUNCTION public.audit_child_health_change();

CREATE OR REPLACE FUNCTION public.set_child_health_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS child_visit_updated_at_trigger ON public.child_visits;
CREATE TRIGGER child_visit_updated_at_trigger
    BEFORE UPDATE ON public.child_visits
    FOR EACH ROW EXECUTE FUNCTION public.set_child_health_updated_at();
DROP TRIGGER IF EXISTS child_nutrition_updated_at_trigger ON public.child_nutrition_assessments;
CREATE TRIGGER child_nutrition_updated_at_trigger
    BEFORE UPDATE ON public.child_nutrition_assessments
    FOR EACH ROW EXECUTE FUNCTION public.set_child_health_updated_at();
DROP TRIGGER IF EXISTS child_screening_updated_at_trigger ON public.child_development_screenings;
CREATE TRIGGER child_screening_updated_at_trigger
    BEFORE UPDATE ON public.child_development_screenings
    FOR EACH ROW EXECUTE FUNCTION public.set_child_health_updated_at();
