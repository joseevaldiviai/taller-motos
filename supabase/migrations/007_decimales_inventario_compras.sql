-- ============================================================
-- TALLER MOTOS — Migration 007: Permitir decimales en stock (insumos) y compras (cantidad)
-- ============================================================

ALTER TABLE public.insumos ALTER COLUMN stock TYPE numeric(10,2) USING stock::numeric;
ALTER TABLE public.insumos ALTER COLUMN stock SET DEFAULT 0;

ALTER TABLE public.compras ALTER COLUMN cantidad TYPE numeric(10,2) USING cantidad::numeric;
ALTER TABLE public.compras ALTER COLUMN cantidad SET DEFAULT 1;

-- Actualizar la columna generada costo_total en compras para usar numeric
ALTER TABLE public.compras DROP COLUMN IF EXISTS costo_total;
ALTER TABLE public.compras ADD COLUMN costo_total numeric(10,2) GENERATED ALWAYS AS (cantidad * costo_unit) STORED;
