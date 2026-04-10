-- ============================================
-- Inventario SaleADS - Migration 001: Initial Schema
-- ============================================

-- Enums
CREATE TYPE asset_status AS ENUM ('disponible', 'asignado', 'mantenimiento', 'baja');
CREATE TYPE person_type AS ENUM ('empleado', 'contratista');
CREATE TYPE id_type AS ENUM ('CC', 'CE', 'Pasaporte', 'NIT');
CREATE TYPE return_condition AS ENUM ('bueno', 'con_daños');
CREATE TYPE maintenance_final_status AS ENUM ('funcional', 'no_funcional');
CREATE TYPE retirement_reason AS ENUM ('dañado', 'obsoleto', 'robado', 'perdido', 'otro');
CREATE TYPE final_destination AS ENUM ('desechado', 'vendido', 'donado');

-- ============================================
-- Tabla: user_profiles (perfiles de usuario)
-- ============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  full_name VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Tabla: categories (categorías)
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  code_prefix VARCHAR(5) NOT NULL UNIQUE,
  fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  acta_template TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorías iniciales
INSERT INTO categories (name, code_prefix, fields_schema) VALUES
('Tecnología', 'TEC', '[
  {"name": "marca", "label": "Marca", "type": "text", "required": true},
  {"name": "modelo", "label": "Modelo", "type": "text", "required": true},
  {"name": "serial", "label": "Número de Serial", "type": "text", "required": true},
  {"name": "part_number", "label": "Part Number", "type": "text", "required": false},
  {"name": "ram", "label": "RAM", "type": "text", "required": false},
  {"name": "procesador", "label": "Procesador", "type": "text", "required": false},
  {"name": "almacenamiento", "label": "Almacenamiento", "type": "text", "required": false},
  {"name": "accesorios", "label": "Accesorios incluidos", "type": "text", "required": false},
  {"name": "estado_fisico", "label": "Estado físico", "type": "select", "required": true, "options": ["Excelente", "Bueno", "Regular", "Malo"]}
]'::jsonb),
('Mobiliario', 'MOB', '[
  {"name": "marca", "label": "Marca", "type": "text", "required": false},
  {"name": "material", "label": "Material", "type": "text", "required": true},
  {"name": "color", "label": "Color", "type": "text", "required": true},
  {"name": "dimensiones", "label": "Dimensiones", "type": "text", "required": false},
  {"name": "estado_fisico", "label": "Estado físico", "type": "select", "required": true, "options": ["Excelente", "Bueno", "Regular", "Malo"]}
]'::jsonb),
('Vehículos', 'VEH', '[
  {"name": "placa", "label": "Placa", "type": "text", "required": true},
  {"name": "marca", "label": "Marca", "type": "text", "required": true},
  {"name": "modelo", "label": "Modelo", "type": "text", "required": true},
  {"name": "año", "label": "Año", "type": "number", "required": true},
  {"name": "kilometraje", "label": "Kilometraje actual", "type": "number", "required": true},
  {"name": "estado_fisico", "label": "Estado físico", "type": "select", "required": true, "options": ["Excelente", "Bueno", "Regular", "Malo"]}
]'::jsonb),
('Electrodomésticos', 'ELE', '[
  {"name": "marca", "label": "Marca", "type": "text", "required": true},
  {"name": "modelo", "label": "Modelo", "type": "text", "required": true},
  {"name": "serial", "label": "Número de Serial", "type": "text", "required": false},
  {"name": "estado_fisico", "label": "Estado físico", "type": "select", "required": true, "options": ["Excelente", "Bueno", "Regular", "Malo"]}
]'::jsonb);

-- ============================================
-- Tabla: assets (activos)
-- ============================================
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  status asset_status NOT NULL DEFAULT 'disponible',
  purchase_date DATE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  commercial_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  has_insurance BOOLEAN NOT NULL DEFAULT false,
  insurer_name VARCHAR,
  insurance_start DATE,
  insurance_end DATE,
  drive_folder_url VARCHAR,
  specific_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Tabla: people (personas)
-- ============================================
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR NOT NULL,
  id_number VARCHAR NOT NULL UNIQUE,
  id_type id_type NOT NULL DEFAULT 'CC',
  person_type person_type NOT NULL,
  area VARCHAR NOT NULL,
  position VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Tabla: assignments (asignaciones)
-- ============================================
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  person_id UUID NOT NULL REFERENCES people(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  return_condition return_condition,
  damage_description TEXT,
  acta_url VARCHAR,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ============================================
-- Tabla: maintenances (mantenimientos)
-- ============================================
CREATE TABLE maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  reason TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sent_at DATE NOT NULL,
  returned_at DATE,
  final_status maintenance_final_status,
  registered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Tabla: asset_retirements (bajas)
-- ============================================
CREATE TABLE asset_retirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  reason retirement_reason NOT NULL,
  description TEXT NOT NULL,
  final_destination final_destination NOT NULL,
  authorized_by UUID REFERENCES auth.users(id),
  registered_by UUID REFERENCES auth.users(id),
  retired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Tabla: audit_log (auditoría)
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Índices
-- ============================================
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assignments_asset ON assignments(asset_id);
CREATE INDEX idx_assignments_person ON assignments(person_id);
CREATE INDEX idx_assignments_active ON assignments(is_active);
CREATE INDEX idx_maintenances_asset ON maintenances(asset_id);
CREATE INDEX idx_retirements_asset ON asset_retirements(asset_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_assets_insurance_end ON assets(insurance_end) WHERE has_insurance = true;

-- ============================================
-- Función: Generar código único de activo
-- ============================================
CREATE OR REPLACE FUNCTION generate_asset_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix VARCHAR;
  current_year VARCHAR;
  seq_num INTEGER;
  new_code VARCHAR;
BEGIN
  SELECT code_prefix INTO prefix FROM categories WHERE id = NEW.category_id;
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(code, '-', 3) AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM assets
  WHERE code LIKE prefix || '-' || current_year || '-%';

  new_code := prefix || '-' || current_year || '-' || LPAD(seq_num::VARCHAR, 3, '0');
  NEW.code := new_code;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_asset_code
  BEFORE INSERT ON assets
  FOR EACH ROW
  WHEN (NEW.code IS NULL OR NEW.code = '')
  EXECUTE FUNCTION generate_asset_code();

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_retirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write all data (admin-only system)
CREATE POLICY "Authenticated users full access" ON user_profiles
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON assets
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON people
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON assignments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON maintenances
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON asset_retirements
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON audit_log
  FOR ALL USING (auth.role() = 'authenticated');
