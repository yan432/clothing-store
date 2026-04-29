-- 016: Atomic stock reservation functions to prevent race conditions during drops
-- Run in Supabase SQL Editor before a drop event.

-- Atomically reserves product-level stock.
-- Returns TRUE if reservation succeeded, FALSE if insufficient stock.
CREATE OR REPLACE FUNCTION reserve_product_stock(p_id bigint, p_qty int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_count int;
BEGIN
  UPDATE products
  SET
    available_stock = available_stock - p_qty,
    reserved_stock  = COALESCE(reserved_stock, 0) + p_qty,
    stock           = available_stock - p_qty
  WHERE id = p_id
    AND COALESCE(available_stock, 0) >= p_qty;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

-- Atomically reserves size-level stock.
-- Returns TRUE if reservation succeeded, FALSE if insufficient stock.
CREATE OR REPLACE FUNCTION reserve_size_stock(p_product_id bigint, p_size text, p_qty int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_count int;
BEGIN
  UPDATE product_size_stock
  SET reserved = COALESCE(reserved, 0) + p_qty
  WHERE product_id = p_product_id
    AND size = p_size
    AND COALESCE(stock, 0) - COALESCE(reserved, 0) >= p_qty;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION reserve_product_stock(bigint, int) TO service_role;
GRANT EXECUTE ON FUNCTION reserve_size_stock(bigint, text, int) TO service_role;
