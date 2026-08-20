-- ============================================================
-- TALLER MOTOS — Migration 005
-- ============================================================

-- Permitir cantidades decimales en reemplazos (ej: 0.5 litros de aceite)
ALTER TABLE public.reemplazos ALTER COLUMN cantidad TYPE numeric(10,2) USING cantidad::numeric;
ALTER TABLE public.reemplazos ALTER COLUMN cantidad SET DEFAULT 1;
