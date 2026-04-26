-- Migración: índices para queries críticas + constraint contra mantenimientos
-- duplicados sobre el mismo activo.
--
-- Idempotente con IF NOT EXISTS / DO blocks para que correr varias veces
-- no falle.

-- 1) audit_log(user_id) — el JOIN manual de user_profiles depende de esto.
CREATE INDEX IF NOT EXISTS idx_audit_user
  ON audit_log(user_id);

-- 2) audit_log(created_at DESC) — listado paginado más reciente primero.
CREATE INDEX IF NOT EXISTS idx_audit_created_desc
  ON audit_log(created_at DESC);

-- 3) Composite assets(status, category_id) — filtro frecuente del dashboard
--    y de /activos con dos filtros aplicados.
CREATE INDEX IF NOT EXISTS idx_assets_status_category
  ON assets(status, category_id);

-- 4) Composite assignments(asset_id) WHERE is_active = true — la query
--    "asignación activa de este activo" se hace muy seguido.
CREATE INDEX IF NOT EXISTS idx_assignments_active_asset
  ON assignments(asset_id)
  WHERE is_active = true;

-- 5) UNIQUE parcial: un activo solo puede tener UN mantenimiento abierto a la
--    vez. Cierra la race condition entre el SELECT de status y el UPDATE.
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_open_maintenance
  ON maintenances(asset_id)
  WHERE returned_at IS NULL;

-- 6) people(area) lower — permite búsqueda case-insensitive eficiente para
--    el nuevo filtro de área.
CREATE INDEX IF NOT EXISTS idx_people_area_lower
  ON people(LOWER(area));

-- 7) people(is_active, full_name) — listado y filtro habitual.
CREATE INDEX IF NOT EXISTS idx_people_active_name
  ON people(is_active, full_name);
