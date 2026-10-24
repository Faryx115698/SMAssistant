-- ==============================================================================
-- SMART ASSISTANT - SUPABASE POSTGRESQL SCHEMA & SEED DATA
-- Run this script in your Supabase Project -> SQL Editor -> New query -> Run
-- ==============================================================================

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

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients viewable by authenticated users" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Patients insertable by authenticated users" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Patients updatable by authenticated users" ON public.patients FOR UPDATE TO authenticated USING (true);

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
CREATE POLICY "Health profiles access" ON public.health_profiles FOR ALL TO authenticated USING (true);

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
CREATE POLICY "Consultations access" ON public.consultations FOR ALL TO authenticated USING (true);

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
CREATE POLICY "Vitals access" ON public.vital_signs FOR ALL TO authenticated USING (true);

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
CREATE POLICY "Prescriptions access" ON public.prescriptions FOR ALL TO authenticated USING (true);

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
CREATE POLICY "Appointments access" ON public.appointments FOR ALL TO authenticated USING (true);

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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inventory access" ON public.inventory FOR ALL TO authenticated USING (true);

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
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

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
    WHERE id = p_inventory_id AND stock >= p_quantity
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
CREATE POLICY "Immunization access" ON public.immunization_records FOR ALL TO authenticated USING (true);

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
CREATE POLICY "Maternal access" ON public.maternal_records FOR ALL TO authenticated USING (true);

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
CREATE POLICY "Maternal ANC visits access" ON public.maternal_anc_visits FOR ALL TO authenticated USING (true);

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
CREATE POLICY "Maternal appointments access" ON public.maternal_appointments FOR ALL TO authenticated USING (true);

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
CREATE POLICY "Maternal PNC records access" ON public.maternal_pnc_records FOR ALL TO authenticated USING (true);

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
CREATE POLICY "Child records access" ON public.child_records FOR ALL TO authenticated USING (true);

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
CREATE POLICY "Announcements insertable by auth users" ON public.announcements FOR INSERT TO authenticated WITH CHECK (true);

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
('Ferrous Sulfate 300mg tab', 'Hematinic / Supplement', 'Tablet', 8, 90, 'Out of Stock', '2027-06-15')
ON CONFLICT DO NOTHING;
