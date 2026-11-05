-- ============================================================
-- TALLER MOTOS — Migration 009: Detalles de la moto (marca, modelo, color)
-- ============================================================

ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS moto_marca text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS moto_modelo text;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS moto_color text;
