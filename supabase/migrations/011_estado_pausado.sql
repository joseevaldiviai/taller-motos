-- ============================================================
-- TALLER MOTOS — Migration 011: Permitir estado PAUSADO en cards
-- ============================================================

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_estado_check;
ALTER TABLE public.cards ADD CONSTRAINT cards_estado_check
  CHECK (estado IN ('NUEVO', 'EN_CURSO', 'PAUSADO', 'TERMINADO', 'PRUEBAS', 'FINALIZADO'));
