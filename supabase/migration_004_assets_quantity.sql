-- Migración: agregar columna quantity a assets
--
-- Algunas facturas registran varias unidades del mismo activo (ej. 6 celulares
-- Xiaomi Redmi 15C). Esta columna permite registrar la cantidad y derivar el
-- valor unitario = commercial_value / quantity en la UI.
--
-- Idempotente: usa IF NOT EXISTS por si fue agregada manualmente antes.

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1
    CHECK (quantity > 0);
