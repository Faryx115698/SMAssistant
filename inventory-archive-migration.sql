-- Run this migration in Supabase SQL Editor to enable reversible medicine archiving.
BEGIN;

ALTER TABLE public.inventory
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
GRANT SELECT, INSERT, UPDATE ON public.inventory TO authenticated;

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
    SET stock = stock - p_quantity
    WHERE id = p_inventory_id AND is_active = TRUE AND stock >= p_quantity
    RETURNING name, unit, stock INTO v_name, v_unit, v_remaining;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Medicine not found, archived, or available stock is insufficient.';
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
    SET stock = stock + p_quantity
    WHERE id = p_inventory_id AND is_active = TRUE
    RETURNING stock INTO v_remaining;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Medicine was not found or is archived.';
    END IF;

    INSERT INTO public.inventory_stock_receipts (inventory_id, quantity, received_by, notes)
    VALUES (p_inventory_id, p_quantity, BTRIM(p_received_by), NULLIF(BTRIM(p_notes), ''))
    RETURNING id INTO v_receipt_id;

    RETURN QUERY SELECT v_receipt_id, v_remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_medicine(BIGINT, INT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_medicine_active(
    p_inventory_id BIGINT,
    p_is_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_is_active IS NULL THEN
        RAISE EXCEPTION 'Choose whether the medicine should be active.';
    END IF;

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

COMMIT;
