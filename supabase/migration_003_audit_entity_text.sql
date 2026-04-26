-- Migración: hacer audit_log.entity_id flexible (UUID o key/string corto)
--
-- Justificación: las nuevas plantillas en `document_templates` se identifican
-- por una clave de texto (ej. 'email_entrega'), no por UUID. Mantener
-- entity_id como UUID hacía fallar el log de esas acciones.

ALTER TABLE audit_log
  ALTER COLUMN entity_id TYPE TEXT USING entity_id::text;
