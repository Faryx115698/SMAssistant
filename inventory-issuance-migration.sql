-- Run this migration in the Supabase SQL Editor for an existing installation.
BEGIN;

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
GRANT SELECT, INSERT ON public.inventory_issuances TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.inventory_issuances_id_seq TO authenticated;

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

COMMIT;
