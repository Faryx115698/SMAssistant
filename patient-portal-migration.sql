-- Run supabase-schema.sql and required module migrations first, then run this file
-- in the Supabase SQL Editor before enabling the live patient portal.
-- A patient account must have a confirmed email matching exactly one patient record.
-- Assign staff roles in auth.users.app_metadata using a trusted server/admin tool.
-- Deploy create-patient-account.
-- During an in-person visit, the patient enters their own password on the
-- staff-authorized registration screen; no email or SMS delivery is required.
ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS portal_account_created_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS public.consume_patient_account_setup_code(TEXT, TEXT);
DROP TABLE IF EXISTS public.patient_account_setup_codes;

CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT CASE WHEN count(*) = 1 THEN min(p.id) END
    FROM public.patients p
    JOIN auth.users u ON u.id = auth.uid()
    WHERE p.email IS NOT NULL
      AND lower(p.email) = lower(u.email)
      AND u.email_confirmed_at IS NOT NULL
      AND lower(auth.jwt() -> 'app_metadata' ->> 'role') = 'patient'
      AND (
          auth.jwt() -> 'app_metadata' ->> 'patient_id' IS NULL
          OR (
              auth.jwt() -> 'app_metadata' ->> 'patient_id' ~ '^[0-9]+$'
              AND (auth.jwt() -> 'app_metadata' ->> 'patient_id')::BIGINT = p.id
          )
      )
$$;

CREATE OR REPLACE FUNCTION public.is_health_center_staff()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'staff_admin', 'false') = 'true'
        OR replace(lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')), ' ', '_')
            IN ('admin', 'administrator', 'staff', 'nurse', 'doctor', 'health_worker', 'midwife', 'records_staff')
        OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(
                CASE WHEN jsonb_typeof(auth.jwt() -> 'app_metadata' -> 'roles') = 'array'
                    THEN auth.jwt() -> 'app_metadata' -> 'roles'
                    ELSE '[]'::jsonb
                END
            ) AS metadata_roles(role_name)
            WHERE lower(metadata_roles.role_name) IN ('admin', 'administrator')
        );
$$;

CREATE OR REPLACE FUNCTION public.is_inventory_staff()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT public.is_health_center_staff()
        OR replace(lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')), ' ', '_') = 'inventory_staff';
$$;

REVOKE ALL ON FUNCTION public.current_patient_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_health_center_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_inventory_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_patient_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_health_center_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_inventory_staff() TO authenticated;

-- Remove the original policies that exposed every patient's health data to all
-- authenticated accounts. Staff authorization uses trusted app_metadata, not
-- user-editable user_metadata or the client-side role.
DROP POLICY IF EXISTS "Patients viewable by authenticated users" ON public.patients;
DROP POLICY IF EXISTS "Patients insertable by authenticated users" ON public.patients;
DROP POLICY IF EXISTS "Patients updatable by authenticated users" ON public.patients;
DROP POLICY IF EXISTS "Health profiles access" ON public.health_profiles;
DROP POLICY IF EXISTS "Consultations access" ON public.consultations;
DROP POLICY IF EXISTS "Vitals access" ON public.vital_signs;
DROP POLICY IF EXISTS "Prescriptions access" ON public.prescriptions;
DROP POLICY IF EXISTS "Appointments access" ON public.appointments;
DROP POLICY IF EXISTS "Announcements insertable by auth users" ON public.announcements;
DROP POLICY IF EXISTS "Announcements manageable by auth users" ON public.announcements;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname = ANY (ARRAY[
              'Patients can view their own record',
              'Staff can manage patient records',
              'Patients can view their own health profile',
              'Staff can manage health profiles',
              'Patients can view their consultations',
              'Staff can manage consultations',
              'Patients can view vitals from their consultations',
              'Staff can manage vital signs',
              'Patients can view prescriptions from their consultations',
              'Staff can manage prescriptions',
              'Patients can view their appointments',
              'Patients can request their own appointments',
              'Staff can manage appointments',
              'Patients can view their certificate requests',
              'Patients can submit certificate requests',
              'Staff can manage certificate requests',
              'Patients can view their refill requests',
              'Patients can request refills for their prescriptions',
              'Staff can manage refill requests',
              'Patients can view their program registrations',
              'Patients can register for programs',
              'Staff can manage program registrations',
              'Patients can view their notification read receipts',
              'Patients can mark their notifications read',
              'Announcements manageable by health center staff'
          ])
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I',
            policy_record.policyname, policy_record.schemaname, policy_record.tablename);
    END LOOP;
END;
$$;

CREATE POLICY "Announcements manageable by health center staff"
    ON public.announcements FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

CREATE POLICY "Patients can view their own record"
    ON public.patients FOR SELECT TO authenticated
    USING (id = public.current_patient_id() OR public.is_health_center_staff());
CREATE POLICY "Staff can manage patient records"
    ON public.patients FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

CREATE POLICY "Patients can view their own health profile"
    ON public.health_profiles FOR SELECT TO authenticated
    USING (patient_id = public.current_patient_id() OR public.is_health_center_staff());
CREATE POLICY "Staff can manage health profiles"
    ON public.health_profiles FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

CREATE POLICY "Patients can view their consultations"
    ON public.consultations FOR SELECT TO authenticated
    USING (patient_id = public.current_patient_id() OR public.is_health_center_staff());
CREATE POLICY "Staff can manage consultations"
    ON public.consultations FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

CREATE POLICY "Patients can view vitals from their consultations"
    ON public.vital_signs FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.consultations c
            WHERE c.id = consultation_id
              AND c.patient_id = public.current_patient_id()
        )
        OR public.is_health_center_staff()
    );
CREATE POLICY "Staff can manage vital signs"
    ON public.vital_signs FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

CREATE POLICY "Patients can view prescriptions from their consultations"
    ON public.prescriptions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.consultations c
            WHERE c.id = consultation_id
              AND c.patient_id = public.current_patient_id()
        )
        OR public.is_health_center_staff()
    );
CREATE POLICY "Staff can manage prescriptions"
    ON public.prescriptions FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

CREATE POLICY "Patients can view their appointments"
    ON public.appointments FOR SELECT TO authenticated
    USING (patient_id = public.current_patient_id() OR public.is_health_center_staff());
CREATE POLICY "Patients can request their own appointments"
    ON public.appointments FOR INSERT TO authenticated
    WITH CHECK (
        patient_id = public.current_patient_id()
        AND appointment_date >= CURRENT_DATE
        AND (status IS NULL OR status = 'Scheduled')
    );
CREATE POLICY "Staff can manage appointments"
    ON public.appointments FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

CREATE TABLE IF NOT EXISTS public.patient_certificate_requests (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    reference_code TEXT NOT NULL UNIQUE DEFAULT
        ('CR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
    certificate_type TEXT NOT NULL,
    purpose TEXT NOT NULL,
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted / Under Review'
        CHECK (status IN ('Submitted / Under Review', 'In Processing', 'Ready for Pickup', 'Rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.patient_certificate_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view their certificate requests"
    ON public.patient_certificate_requests FOR SELECT TO authenticated
    USING (patient_id = public.current_patient_id() OR public.is_health_center_staff());
CREATE POLICY "Patients can submit certificate requests"
    ON public.patient_certificate_requests FOR INSERT TO authenticated
    WITH CHECK (
        patient_id = public.current_patient_id()
        AND status = 'Submitted / Under Review'
    );
CREATE POLICY "Staff can manage certificate requests"
    ON public.patient_certificate_requests FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

CREATE TABLE IF NOT EXISTS public.patient_refill_requests (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    prescription_id BIGINT NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    requested_supply TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted / Under Review'
        CHECK (status IN ('Submitted / Under Review', 'Preparing', 'Ready for Pickup', 'Rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.patient_refill_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view their refill requests"
    ON public.patient_refill_requests FOR SELECT TO authenticated
    USING (patient_id = public.current_patient_id() OR public.is_health_center_staff());
CREATE POLICY "Patients can request refills for their prescriptions"
    ON public.patient_refill_requests FOR INSERT TO authenticated
    WITH CHECK (
        patient_id = public.current_patient_id()
        AND status = 'Submitted / Under Review'
        AND EXISTS (
            SELECT 1
            FROM public.prescriptions p
            JOIN public.consultations c ON c.id = p.consultation_id
            WHERE p.id = prescription_id
              AND c.patient_id = public.current_patient_id()
        )
    );
CREATE POLICY "Staff can manage refill requests"
    ON public.patient_refill_requests FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

CREATE TABLE IF NOT EXISTS public.patient_program_registrations (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    program_name TEXT NOT NULL,
    program_date TEXT NOT NULL,
    venue TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Registered'
        CHECK (status IN ('Registered', 'Confirmed', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (patient_id, program_name, program_date)
);
ALTER TABLE public.patient_program_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view their program registrations"
    ON public.patient_program_registrations FOR SELECT TO authenticated
    USING (patient_id = public.current_patient_id() OR public.is_health_center_staff());
CREATE POLICY "Patients can register for programs"
    ON public.patient_program_registrations FOR INSERT TO authenticated
    WITH CHECK (patient_id = public.current_patient_id() AND status = 'Registered');
CREATE POLICY "Staff can manage program registrations"
    ON public.patient_program_registrations FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

-- The portal does not expose the clinical modules below. Keep them staff-only
-- rather than inheriting the legacy policies that allowed every account to read them.
DO $$
DECLARE
    protected_table TEXT;
    policy_record RECORD;
    access_function TEXT;
    protected_tables TEXT[] := ARRAY[
        'inventory', 'inventory_issuances', 'inventory_stock_receipts',
        'immunization_records', 'vaccine_inventory_lots', 'vaccine_stock_movements',
        'immunization_record_audit', 'maternal_records', 'maternal_anc_visits',
        'maternal_appointments', 'maternal_pnc_records', 'maternal_birth_records',
        'child_records', 'child_visits', 'child_nutrition_assessments',
        'child_development_screenings', 'child_health_audit', 'tb_cases',
        'tb_intakes', 'tb_lab_results', 'tb_contacts', 'health_education_activities',
        'health_education_participants', 'health_education_materials'
    ];
BEGIN
    FOREACH protected_table IN ARRAY protected_tables LOOP
        IF to_regclass('public.' || quote_ident(protected_table)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', protected_table);
            FOR policy_record IN
                SELECT policyname FROM pg_policies
                WHERE schemaname = 'public' AND tablename = protected_table
            LOOP
                EXECUTE format('DROP POLICY %I ON public.%I',
                    policy_record.policyname, protected_table);
            END LOOP;
            access_function := CASE
                WHEN protected_table IN (
                    'inventory', 'inventory_issuances', 'inventory_stock_receipts',
                    'vaccine_inventory_lots'
                ) THEN 'public.is_inventory_staff()'
                ELSE 'public.is_health_center_staff()'
            END;
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
                'Staff-only access', protected_table, access_function, access_function
            );
        END IF;
    END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS public.patient_notification_reads (
    patient_id BIGINT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    notification_key TEXT NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (patient_id, notification_key)
);
ALTER TABLE public.patient_notification_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view their notification read receipts"
    ON public.patient_notification_reads FOR SELECT TO authenticated
    USING (patient_id = public.current_patient_id());
CREATE POLICY "Patients can mark their notifications read"
    ON public.patient_notification_reads FOR INSERT TO authenticated
    WITH CHECK (patient_id = public.current_patient_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients, public.health_profiles,
    public.consultations, public.vital_signs, public.prescriptions, public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_certificate_requests,
    public.patient_refill_requests, public.patient_program_registrations,
    public.patient_notification_reads TO authenticated;
GRANT SELECT, INSERT ON public.announcements TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.patients_id_seq, public.health_profiles_id_seq,
    public.consultations_id_seq, public.vital_signs_id_seq, public.prescriptions_id_seq,
    public.appointments_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.patient_certificate_requests_id_seq,
    public.patient_refill_requests_id_seq, public.patient_program_registrations_id_seq,
    public.announcements_id_seq TO authenticated;

NOTIFY pgrst, 'reload schema';
