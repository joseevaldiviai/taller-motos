-- ============================================================
-- TALLER MOTOS — Migration 010: Tipo de vehículo (Moto, Trimoto, Cuadratrack)
-- ============================================================

ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS tipo_vehiculo text not null default 'MOTO' check (tipo_vehiculo in ('MOTO', 'TRIMOTO', 'CUADRATRACK'));
