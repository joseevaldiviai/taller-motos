-- ============================================================
-- TALLER MOTOS — Migration 006: Estado de pago en cards
-- ============================================================

ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS pagado boolean not null default false;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS metodo_pago text check (metodo_pago in ('EFECTIVO', 'QR', 'TARJETA', 'TRANSFERENCIA', 'OTRO'));
