-- ==============================================================================
-- SMART ASSISTANT - SUPABASE POSTGRESQL SCHEMA & SEED DATA
-- Run this script in your Supabase Project -> SQL Editor -> New query -> Run
-- ==============================================================================

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

REVOKE ALL ON FUNCTION public.is_health_center_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_inventory_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_health_center_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_inventory_staff() TO authenticated;

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Administrator',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. PATIENT REGISTRATION & RECORDS
CREATE TABLE IF NOT EXISTS public.patients (
    id BIGSERIAL PRIMARY KEY,
    patient_code TEXT UNIQUE,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    suffix TEXT,
    sex TEXT CHECK (sex IN ('Male', 'Female')),
    birth_date DATE,
    civil_status TEXT DEFAULT 'Single',
    nationality TEXT DEFAULT 'Filipino',
    religion TEXT DEFAULT 'Catholic',
    occupation TEXT,
    contact_number TEXT,
    telephone TEXT,
    email TEXT,
    address TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT CASE WHEN count(*) = 1 THEN min(id) END
    FROM public.patients
    WHERE email IS NOT NULL
      AND lower(email) = lower(auth.jwt() ->> 'email')
      AND EXISTS (
          SELECT 1 FROM auth.users u
          WHERE u.id = auth.uid()
            AND u.email_confirmed_at IS NOT NULL
            AND lower(u.email) = lower(auth.jwt() ->> 'email')
      )
$$;

REVOKE ALL ON FUNCTION public.current_patient_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_patient_id() TO authenticated;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view their own record"
    ON public.patients FOR SELECT TO authenticated
    USING (id = public.current_patient_id() OR public.is_health_center_staff());
CREATE POLICY "Staff can manage patient records"
    ON public.patients FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

-- 3. HEALTH PROFILES
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
CREATE POLICY "Patients can view their own health profile"
    ON public.health_profiles FOR SELECT TO authenticated
    USING (patient_id = public.current_patient_id() OR public.is_health_center_staff());
CREATE POLICY "Staff can manage health profiles"
    ON public.health_profiles FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

-- 4. CONSULTATIONS & MEDICAL RECORDS
CREATE TABLE IF NOT EXISTS public.consultations (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT REFERENCES public.patients(id) ON DELETE CASCADE,
    consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    consultation_time TIME NOT NULL DEFAULT CURRENT_TIME,
    visit_type TEXT NOT NULL DEFAULT 'General Consultation',
    status TEXT NOT NULL DEFAULT 'Completed',
    provider_name TEXT DEFAULT 'Dr. Cyron',
    chief_complaint TEXT,
    history_present_illness TEXT,
    physical_examination TEXT,
    primary_diagnosis TEXT,
    diagnosis_code TEXT,
    secondary_diagnosis TEXT,
    treatment_plan TEXT,
    notes TEXT,
    follow_up_date DATE,
    follow_up_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view their consultations"
    ON public.consultations FOR SELECT TO authenticated
    USING (patient_id = public.current_patient_id() OR public.is_health_center_staff());
CREATE POLICY "Staff can manage consultations"
    ON public.consultations FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

-- 5. VITAL SIGNS
CREATE TABLE IF NOT EXISTS public.vital_signs (
    id BIGSERIAL PRIMARY KEY,
    consultation_id BIGINT REFERENCES public.consultations(id) ON DELETE CASCADE,
    temperature NUMERIC(4,1),
    respiratory_rate NUMERIC(4,1),
    blood_pressure TEXT,
    oxygen_saturation NUMERIC(4,1),
    heart_rate INT,
    height NUMERIC(5,1),
    weight NUMERIC(5,1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
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

-- 6. PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id BIGSERIAL PRIMARY KEY,
    consultation_id BIGINT REFERENCES public.consultations(id) ON DELETE CASCADE,
    medicine TEXT NOT NULL,
    dose TEXT,
    frequency TEXT,
    duration TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
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

-- 7. APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT REFERENCES public.patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    service TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    purpose TEXT,
    status TEXT DEFAULT 'Scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
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

-- 8. INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    reorder INT NOT NULL DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'Adequate',
    expiry DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inventory access" ON public.inventory FOR ALL TO authenticated
    USING (public.is_inventory_staff())
    WITH CHECK (public.is_inventory_staff());

CREATE OR REPLACE FUNCTION public.set_inventory_stock_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.status := CASE
        WHEN NEW.stock <= 0 THEN 'Out of Stock'
        WHEN NEW.stock <= NEW.reorder THEN 'Low Stock'
        ELSE 'Adequate'
    END;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_stock_status_trigger ON public.inventory;
CREATE TRIGGER inventory_stock_status_trigger
    BEFORE INSERT OR UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION public.set_inventory_stock_status();

UPDATE public.inventory
SET status = CASE
    WHEN stock <= 0 THEN 'Out of Stock'
    WHEN stock <= reorder THEN 'Low Stock'
    ELSE 'Adequate'
END;

-- Medicine issuance transactions. The RPC below updates stock and records the
-- issuance in one database transaction to prevent overselling stock.
CREATE TABLE IF NOT EXISTS public.inventory_issuances (
    id BIGSERIAL PRIMARY KEY,
    inventory_id BIGINT REFERENCES public.inventory(id) ON DELETE SET NULL,
    patient_id BIGINT REFERENCES public.patients(id) ON DELETE SET NULL,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('patient', 'non_patient')),
    recipient_name TEXT NOT NULL,
    recipient_category TEXT,
    medicine_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    issued_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.inventory_issuances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inventory issuances access" ON public.inventory_issuances;
CREATE POLICY "Inventory issuances access" ON public.inventory_issuances
    FOR ALL TO authenticated
    USING (public.is_inventory_staff())
    WITH CHECK (public.is_inventory_staff());

CREATE OR REPLACE FUNCTION public.issue_medicine(
    p_inventory_id BIGINT,
    p_patient_id BIGINT,
    p_recipient_type TEXT,
    p_recipient_name TEXT,
    p_recipient_category TEXT,
    p_quantity INT,
    p_issued_by TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (issuance_id BIGINT, remaining_stock INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_name TEXT;
    v_unit TEXT;
    v_remaining INT;
    v_issuance_id BIGINT;
BEGIN
    IF p_quantity IS NULL OR p_quantity < 1 THEN
        RAISE EXCEPTION 'Quantity must be at least 1.';
    END IF;
    IF p_recipient_type NOT IN ('patient', 'non_patient') THEN
        RAISE EXCEPTION 'Choose a valid recipient type.';
    END IF;
    IF NULLIF(BTRIM(p_recipient_name), '') IS NULL OR NULLIF(BTRIM(p_issued_by), '') IS NULL THEN
        RAISE EXCEPTION 'Recipient and staff names are required.';
    END IF;
    IF p_recipient_type = 'patient' AND p_patient_id IS NULL THEN
        RAISE EXCEPTION 'Choose a registered patient.';
    END IF;
    IF p_recipient_type = 'non_patient' AND p_patient_id IS NOT NULL THEN
        RAISE EXCEPTION 'Non-patient issuances cannot reference a patient.';
    END IF;

    UPDATE public.inventory
    SET stock = stock - p_quantity,
        status = CASE
            WHEN stock - p_quantity <= 0 THEN 'Out of Stock'
            WHEN stock - p_quantity <= reorder THEN 'Low Stock'
            ELSE 'Adequate'
        END
    WHERE id = p_inventory_id AND is_active = TRUE AND stock >= p_quantity
    RETURNING name, unit, stock INTO v_name, v_unit, v_remaining;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Medicine not found or available stock is insufficient.';
    END IF;

    INSERT INTO public.inventory_issuances (
        inventory_id, patient_id, recipient_type, recipient_name,
        recipient_category, medicine_name, unit, quantity, issued_by, notes
    ) VALUES (
        p_inventory_id, p_patient_id, p_recipient_type, BTRIM(p_recipient_name),
        NULLIF(BTRIM(p_recipient_category), ''), v_name, v_unit, p_quantity,
        BTRIM(p_issued_by), NULLIF(BTRIM(p_notes), '')
    )
    RETURNING id INTO v_issuance_id;

    RETURN QUERY SELECT v_issuance_id, v_remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_medicine(BIGINT, BIGINT, TEXT, TEXT, TEXT, INT, TEXT, TEXT)
    TO authenticated;

CREATE OR REPLACE FUNCTION public.set_medicine_active(
    p_inventory_id BIGINT,
    p_is_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.inventory
    SET is_active = p_is_active
    WHERE id = p_inventory_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Medicine was not found.';
    END IF;

    RETURN p_is_active;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_medicine_active(BIGINT, BOOLEAN) TO authenticated;

CREATE TABLE IF NOT EXISTS public.inventory_stock_receipts (
    id BIGSERIAL PRIMARY KEY,
    inventory_id BIGINT NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    received_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.inventory_stock_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inventory stock receipts access" ON public.inventory_stock_receipts;
CREATE POLICY "Inventory stock receipts access" ON public.inventory_stock_receipts
    FOR ALL TO authenticated
    USING (public.is_inventory_staff())
    WITH CHECK (public.is_inventory_staff());
GRANT SELECT, INSERT, UPDATE ON public.inventory TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.inventory_id_seq TO authenticated;
GRANT SELECT, INSERT ON public.inventory_stock_receipts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.inventory_stock_receipts_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.receive_medicine(
    p_inventory_id BIGINT,
    p_quantity INT,
    p_received_by TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (receipt_id BIGINT, remaining_stock INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_remaining INT;
    v_receipt_id BIGINT;
BEGIN
    IF p_quantity IS NULL OR p_quantity < 1 THEN
        RAISE EXCEPTION 'Received quantity must be at least 1.';
    END IF;
    IF NULLIF(BTRIM(p_received_by), '') IS NULL THEN
        RAISE EXCEPTION 'Received-by name is required.';
    END IF;

    UPDATE public.inventory
    SET stock = stock + p_quantity,
        status = CASE
            WHEN stock + p_quantity <= 0 THEN 'Out of Stock'
            WHEN stock + p_quantity <= reorder THEN 'Low Stock'
            ELSE 'Adequate'
        END
    WHERE id = p_inventory_id AND is_active = TRUE
    RETURNING stock INTO v_remaining;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Medicine was not found.';
    END IF;

    INSERT INTO public.inventory_stock_receipts (inventory_id, quantity, received_by, notes)
    VALUES (p_inventory_id, p_quantity, BTRIM(p_received_by), NULLIF(BTRIM(p_notes), ''))
    RETURNING id INTO v_receipt_id;

    RETURN QUERY SELECT v_receipt_id, v_remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_medicine(BIGINT, INT, TEXT, TEXT) TO authenticated;

-- 9. IMMUNIZATION RECORDS
CREATE TABLE IF NOT EXISTS public.immunization_records (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT REFERENCES public.patients(id) ON DELETE CASCADE,
    vaccine TEXT NOT NULL,
    dose TEXT NOT NULL,
    date_given DATE,
    age_at_dose TEXT,
    batch_no TEXT,
    given_by TEXT,
    next_dose DATE,
    status TEXT DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.immunization_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Immunization access" ON public.immunization_records FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

-- 9A. IMMUNIZATION AUDIT, VACCINE LOTS, AND STOCK WORKFLOW
-- Additive immunization workflow update for existing Supabase projects.
-- Run once in the intended project's SQL Editor; safe to rerun.

CREATE TABLE IF NOT EXISTS public.vaccine_inventory_lots (
    id BIGSERIAL PRIMARY KEY,
    vaccine TEXT NOT NULL,
    manufacturer TEXT,
    lot_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    quantity_received INT NOT NULL CHECK (quantity_received >= 0),
    quantity_available INT NOT NULL CHECK (quantity_available >= 0),
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS vaccine_inventory_lots_vaccine_lot_idx
    ON public.vaccine_inventory_lots (LOWER(vaccine), LOWER(lot_number));

CREATE TABLE IF NOT EXISTS public.vaccine_stock_movements (
    id BIGSERIAL PRIMARY KEY,
    lot_id BIGINT NOT NULL REFERENCES public.vaccine_inventory_lots(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('receipt', 'administration', 'correction')),
    quantity INT NOT NULL CHECK (quantity <> 0),
    patient_id BIGINT REFERENCES public.patients(id) ON DELETE SET NULL,
    immunization_record_id BIGINT REFERENCES public.immunization_records(id) ON DELETE SET NULL,
    received_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vaccine_stock_movements_created_at_idx
    ON public.vaccine_stock_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS vaccine_stock_movements_lot_id_idx
    ON public.vaccine_stock_movements (lot_id);

CREATE TABLE IF NOT EXISTS public.immunization_record_audit (
    id BIGSERIAL PRIMARY KEY,
    record_id BIGINT NOT NULL REFERENCES public.immunization_records(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    old_data JSONB NOT NULL,
    new_data JSONB NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.immunization_records
    ADD COLUMN IF NOT EXISTS administration_source TEXT NOT NULL DEFAULT 'external',
    ADD COLUMN IF NOT EXISTS inventory_lot_id BIGINT;

ALTER TABLE public.immunization_records
    DROP CONSTRAINT IF EXISTS immunization_records_administration_source_check;
ALTER TABLE public.immunization_records
    ADD CONSTRAINT immunization_records_administration_source_check
    CHECK (administration_source IN ('external', 'clinic'));
ALTER TABLE public.immunization_records
    DROP CONSTRAINT IF EXISTS immunization_records_inventory_lot_source_check;
ALTER TABLE public.immunization_records
    ADD CONSTRAINT immunization_records_inventory_lot_source_check
    CHECK (inventory_lot_id IS NULL OR administration_source = 'clinic');
ALTER TABLE public.immunization_records
    DROP CONSTRAINT IF EXISTS immunization_records_clinic_completed_lot_check;
ALTER TABLE public.immunization_records
    ADD CONSTRAINT immunization_records_clinic_completed_lot_check
    CHECK (COALESCE(LOWER(status), '') <> 'completed' OR administration_source <> 'clinic' OR inventory_lot_id IS NOT NULL);
ALTER TABLE public.immunization_records
    DROP CONSTRAINT IF EXISTS immunization_records_inventory_lot_id_fkey;
ALTER TABLE public.immunization_records
    ADD CONSTRAINT immunization_records_inventory_lot_id_fkey
    FOREIGN KEY (inventory_lot_id) REFERENCES public.vaccine_inventory_lots(id) ON DELETE RESTRICT;

ALTER TABLE public.vaccine_inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.immunization_record_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vaccine lot read access" ON public.vaccine_inventory_lots;
CREATE POLICY "Vaccine lot read access" ON public.vaccine_inventory_lots
    FOR SELECT TO authenticated USING (public.is_inventory_staff());
DROP POLICY IF EXISTS "Vaccine movement read access" ON public.vaccine_stock_movements;
CREATE POLICY "Vaccine movement read access" ON public.vaccine_stock_movements
    FOR SELECT TO authenticated USING (public.is_health_center_staff());
DROP POLICY IF EXISTS "Immunization audit read access" ON public.immunization_record_audit;
CREATE POLICY "Immunization audit read access" ON public.immunization_record_audit
    FOR SELECT TO authenticated USING (public.is_health_center_staff());

GRANT SELECT ON public.vaccine_inventory_lots TO authenticated;
GRANT SELECT ON public.vaccine_stock_movements TO authenticated;
GRANT SELECT ON public.immunization_record_audit TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.immunization_records TO authenticated;
REVOKE DELETE ON public.immunization_records FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.immunization_records_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.vaccine_inventory_lots_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.vaccine_stock_movements_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.immunization_record_audit_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.receive_vaccine_stock(
    p_vaccine TEXT,
    p_manufacturer TEXT,
    p_lot_number TEXT,
    p_expiry_date DATE,
    p_quantity INT,
    p_received_date DATE,
    p_received_by TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (lot_id BIGINT, quantity_available INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lot_id BIGINT;
    v_quantity INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required to receive vaccine stock.';
    END IF;
    IF NOT public.is_inventory_staff() THEN
        RAISE EXCEPTION 'Health center staff must receive vaccine stock.';
    END IF;
    IF NULLIF(BTRIM(p_vaccine), '') IS NULL OR NULLIF(BTRIM(p_lot_number), '') IS NULL THEN
        RAISE EXCEPTION 'Vaccine name and lot number are required.';
    END IF;
    IF p_quantity IS NULL OR p_quantity < 1 THEN
        RAISE EXCEPTION 'Received quantity must be at least 1.';
    END IF;
    IF p_expiry_date IS NULL OR p_expiry_date <= CURRENT_DATE THEN
        RAISE EXCEPTION 'Expired vaccine stock cannot be received.';
    END IF;
    IF p_received_date IS NULL OR p_received_date > CURRENT_DATE + 1 THEN
        RAISE EXCEPTION 'Received date cannot be more than one day ahead of the database date.';
    END IF;
    IF NULLIF(BTRIM(p_received_by), '') IS NULL THEN
        RAISE EXCEPTION 'Received-by name is required.';
    END IF;

    SELECT id INTO v_lot_id
    FROM public.vaccine_inventory_lots
    WHERE LOWER(vaccine) = LOWER(BTRIM(p_vaccine))
      AND LOWER(lot_number) = LOWER(BTRIM(p_lot_number))
    FOR UPDATE;

    IF v_lot_id IS NULL THEN
        INSERT INTO public.vaccine_inventory_lots AS lot (
            vaccine, manufacturer, lot_number, expiry_date,
            quantity_received, quantity_available, received_date, received_by, notes
        )
        VALUES (
            BTRIM(p_vaccine), NULLIF(BTRIM(p_manufacturer), ''), BTRIM(p_lot_number), p_expiry_date,
            p_quantity, p_quantity, p_received_date, BTRIM(p_received_by), NULLIF(BTRIM(p_notes), '')
        )
        RETURNING lot.id, lot.quantity_available INTO v_lot_id, v_quantity;
    ELSE
        UPDATE public.vaccine_inventory_lots AS lot
        SET quantity_received = lot.quantity_received + p_quantity,
            quantity_available = lot.quantity_available + p_quantity,
            manufacturer = COALESCE(NULLIF(BTRIM(p_manufacturer), ''), lot.manufacturer),
            received_date = p_received_date,
            received_by = BTRIM(p_received_by),
            notes = COALESCE(NULLIF(BTRIM(p_notes), ''), notes)
        WHERE lot.id = v_lot_id AND lot.expiry_date = p_expiry_date
        RETURNING lot.quantity_available INTO v_quantity;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'That lot number is already recorded with a different expiry date.';
        END IF;
    END IF;

    INSERT INTO public.vaccine_stock_movements (lot_id, movement_type, quantity, received_by, notes)
    VALUES (v_lot_id, 'receipt', p_quantity, BTRIM(p_received_by), NULLIF(BTRIM(p_notes), ''));

    RETURN QUERY SELECT v_lot_id, v_quantity;
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_vaccine_stock(TEXT, TEXT, TEXT, DATE, INT, DATE, TEXT, TEXT)
    TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_immunization_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_holds_stock BOOLEAN := FALSE;
    v_new_holds_stock BOOLEAN := FALSE;
    v_old_lot_id BIGINT;
    v_old_patient_id BIGINT;
    v_old_record_id BIGINT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        v_old_lot_id := OLD.inventory_lot_id;
        v_old_patient_id := OLD.patient_id;
        v_old_record_id := OLD.id;
        v_old_holds_stock := COALESCE(LOWER(OLD.status), '') = 'completed'
            AND OLD.administration_source = 'clinic'
            AND OLD.inventory_lot_id IS NOT NULL;
    END IF;
    v_new_holds_stock := COALESCE(LOWER(NEW.status), '') = 'completed'
        AND NEW.administration_source = 'clinic'
        AND NEW.inventory_lot_id IS NOT NULL;

    IF v_new_holds_stock AND NEW.date_given > CURRENT_DATE + 1 THEN
        RAISE EXCEPTION 'A completed dose cannot have an administration date more than one day ahead of the database date.';
    END IF;

    IF v_old_holds_stock AND (
        NOT v_new_holds_stock OR v_old_lot_id IS DISTINCT FROM NEW.inventory_lot_id
    ) THEN
        UPDATE public.vaccine_inventory_lots
        SET quantity_available = quantity_available + 1
        WHERE id = v_old_lot_id;
        INSERT INTO public.vaccine_stock_movements (
            lot_id, movement_type, quantity, patient_id, immunization_record_id, notes
        )
        VALUES (
            v_old_lot_id, 'correction', 1, v_old_patient_id, v_old_record_id,
            'Dose returned after the immunization record was updated or voided.'
        );
    END IF;

    IF v_new_holds_stock AND (
        NOT v_old_holds_stock OR v_old_lot_id IS DISTINCT FROM NEW.inventory_lot_id
    ) THEN
        UPDATE public.vaccine_inventory_lots
        SET quantity_available = quantity_available - 1
        WHERE id = NEW.inventory_lot_id
          AND quantity_available > 0
          AND expiry_date >= CURRENT_DATE
          AND LOWER(vaccine) = LOWER(NEW.vaccine);
        IF NOT FOUND THEN
            RAISE EXCEPTION 'The selected vaccine lot is expired, depleted, or does not match this vaccine.';
        END IF;
        INSERT INTO public.vaccine_stock_movements (
            lot_id, movement_type, quantity, patient_id, immunization_record_id, notes
        )
        VALUES (
            NEW.inventory_lot_id, 'administration', -1, NEW.patient_id, NEW.id,
            'Clinic-administered completed dose.'
        );
    ELSIF v_new_holds_stock AND NOT EXISTS (
        SELECT 1
        FROM public.vaccine_inventory_lots
        WHERE id = NEW.inventory_lot_id
          AND LOWER(vaccine) = LOWER(NEW.vaccine)
    ) THEN
        RAISE EXCEPTION 'The selected vaccine lot does not match this vaccine.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_immunization_record_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.immunization_record_audit (record_id, action, old_data, new_data, changed_by)
    VALUES (OLD.id, 'UPDATE', TO_JSONB(OLD), TO_JSONB(NEW), auth.uid());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS immunization_stock_movement_trigger ON public.immunization_records;
CREATE TRIGGER immunization_stock_movement_trigger
    AFTER INSERT OR UPDATE ON public.immunization_records
    FOR EACH ROW EXECUTE FUNCTION public.apply_immunization_stock_movement();

DROP TRIGGER IF EXISTS immunization_record_audit_trigger ON public.immunization_records;
CREATE TRIGGER immunization_record_audit_trigger
    AFTER UPDATE ON public.immunization_records
    FOR EACH ROW EXECUTE FUNCTION public.audit_immunization_record_update();

-- 10. MATERNAL RECORDS
CREATE TABLE IF NOT EXISTS public.maternal_records (
    id BIGSERIAL PRIMARY KEY,
    patient_name TEXT NOT NULL,
    patient_id TEXT,
    age INT,
    gravida TEXT,
    para TEXT,
    edd DATE,
    gestational_age TEXT,
    contact TEXT,
    address TEXT,
    blood_type TEXT DEFAULT 'O+',
    allergies TEXT DEFAULT 'None known',
    lmp DATE,
    philhealth TEXT,
    civil_status TEXT,
    notes TEXT,
    risk_level TEXT DEFAULT 'Low Risk',
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.maternal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Maternal access" ON public.maternal_records FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

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
CREATE POLICY "Maternal ANC visits access" ON public.maternal_anc_visits FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

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
CREATE POLICY "Maternal appointments access" ON public.maternal_appointments FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

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
CREATE POLICY "Maternal PNC records access" ON public.maternal_pnc_records FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

CREATE TABLE IF NOT EXISTS public.maternal_birth_records (
    id BIGSERIAL PRIMARY KEY,
    maternal_id BIGINT NOT NULL REFERENCES public.maternal_records(id) ON DELETE CASCADE,
    delivery_date DATE NOT NULL,
    delivery_mode TEXT NOT NULL,
    outcome TEXT NOT NULL,
    infant_sex TEXT,
    birth_weight_kg NUMERIC(5, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.maternal_birth_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Maternal birth records access" ON public.maternal_birth_records FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

-- 11. INFANT & CHILD RECORDS
CREATE TABLE IF NOT EXISTS public.child_records (
    id BIGSERIAL PRIMARY KEY,
    child_code TEXT UNIQUE,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    sex TEXT NOT NULL,
    contact_number TEXT,
    address TEXT,
    mother_name TEXT,
    mother_contact TEXT,
    blood_type TEXT DEFAULT 'O+',
    allergies TEXT DEFAULT 'None known',
    birth_weight TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.child_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Child records access" ON public.child_records;
CREATE POLICY "Child records access" ON public.child_records FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

-- 11A. CHILD HEALTH VISITS, SCREENINGS, AUDIT, AND FOLLOW-UPS
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

-- 12. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    date_posted DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements viewable by all" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Announcements manageable by health center staff"
    ON public.announcements FOR ALL TO authenticated
    USING (public.is_health_center_staff())
    WITH CHECK (public.is_health_center_staff());

-- ==============================================================================
-- SAMPLE SEED DATA
-- ==============================================================================

-- Seed Patients
INSERT INTO public.patients (patient_code, first_name, middle_name, last_name, sex, birth_date, contact_number, email, address, status)
VALUES
('PR-2026-0001', 'Juan', 'D.', 'Dela Cruz', 'Male', '1990-05-12', '0917 123 4567', 'juan@example.com', 'Labin St., Talimundoc, Orani, Bataan', 'Active'),
('PR-2026-0002', 'Maria', 'Clara', 'Santos', 'Female', '1998-08-20', '0918 234 5678', 'maria@example.com', 'Centro St., Talimundoc, Orani, Bataan', 'Active'),
('PR-2026-0003', 'Pedro', 'O.', 'Penduko', 'Male', '1985-03-15', '0919 345 6789', 'pedro@example.com', 'Poblacion, Orani, Bataan', 'Active')
ON CONFLICT (patient_code) DO NOTHING;

-- Seed Health Profiles
INSERT INTO public.health_profiles (patient_id, blood_type, height, weight, allergies, medical_conditions)
VALUES
(1, 'O+', '170 cm', '65 kg', 'None known', 'None'),
(2, 'A+', '158 cm', '52 kg', 'Penicillin', 'Mild Asthma')
ON CONFLICT DO NOTHING;

-- Seed Announcements
INSERT INTO public.announcements (title, message, date_posted)
VALUES
('Free Flu Vaccination Day', 'Free flu vaccination services will be held on May 15, 2026 at the Talimundoc Health Center from 8:00 AM to 4:00 PM.', CURRENT_DATE),
('Heat Index Advisory', 'High heat index expected this week. Stay hydrated, drink water, and avoid prolonged outdoor exposure.', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Seed Appointments
INSERT INTO public.appointments (patient_id, patient_name, service, appointment_date, appointment_time, purpose, status)
VALUES
(1, 'Juan D. Dela Cruz', 'General Consultation', CURRENT_DATE, '09:00:00', 'Routine check-up', 'Scheduled'),
(2, 'Maria Clara Santos', 'Prenatal Check Up', CURRENT_DATE, '10:30:00', 'ANC 4th visit', 'Scheduled')
ON CONFLICT DO NOTHING;

-- Seed Inventory
INSERT INTO public.inventory (name, category, unit, stock, reorder, status, expiry)
VALUES
('Paracetamol 500mg tab', 'Analgesic / Antipyretic', 'Tablet', 620, 120, 'Adequate', '2027-12-31'),
('Amoxicillin 500mg cap', 'Antibiotic', 'Capsule', 45, 120, 'Low Stock', '2028-08-15'),
('Losartan 50mg tab', 'Anti-hypertensive', 'Tablet', 148, 120, 'Adequate', '2027-02-20'),
('Omeprazole 20mg cap', 'Gastrointestinal', 'Capsule', 32, 90, 'Low Stock', '2026-11-20'),
('Salbutamol 2mg tab', 'Respiratory', 'Tablet', 156, 90, 'Adequate', '2027-05-20'),
('Ferrous Sulfate 300mg tab', 'Hematinic / Supplement', 'Tablet', 8, 90, 'Low Stock', '2027-06-15')
ON CONFLICT DO NOTHING;
