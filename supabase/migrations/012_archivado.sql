-- ============================================================
-- TALLER MOTOS — Migration 012: Columna archivado en cards
-- ============================================================

ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS archivado boolean not null default false;
