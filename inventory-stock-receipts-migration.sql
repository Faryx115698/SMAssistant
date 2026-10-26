-- Run this migration in Supabase SQL Editor to enable stock receiving.
BEGIN;

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
    WHERE id = p_inventory_id
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

COMMIT;
