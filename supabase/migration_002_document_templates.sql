-- Migración: tabla de plantillas editables (formatos)
-- Permite que los administradores editen los textos de los emails
-- y de las cláusulas largas de los PDFs desde la UI de Configuración.
--
-- Las plantillas SIEMPRE tienen un fallback hardcoded en el código,
-- así que funciona aunque la tabla esté vacía.

CREATE TABLE IF NOT EXISTS document_templates (
  key           TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL CHECK (category IN ('email', 'pdf')),
  subject       TEXT,
  body          TEXT NOT NULL,
  variables     JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access"
  ON document_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION touch_document_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_document_templates ON document_templates;
CREATE TRIGGER trg_touch_document_templates
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION touch_document_template_updated_at();
