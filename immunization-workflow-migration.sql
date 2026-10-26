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
