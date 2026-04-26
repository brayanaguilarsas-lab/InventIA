export type AssetStatus = 'disponible' | 'asignado' | 'mantenimiento' | 'baja';
export type PersonType = 'empleado' | 'contratista';
export type IdType = 'CC' | 'CE' | 'Pasaporte' | 'NIT';
export type ReturnCondition = 'bueno' | 'con_daños';
export type MaintenanceFinalStatus = 'funcional' | 'no_funcional';
export type RetirementReason = 'dañado' | 'obsoleto' | 'robado' | 'perdido' | 'otro';
export type FinalDestination = 'desechado' | 'vendido' | 'donado';

export interface Category {
  id: string;
  name: string;
  code_prefix: string;
  fields_schema: FieldDefinition[];
  acta_template: string;
  created_at: string;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  required: boolean;
  options?: string[];
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  category_id: string;
  status: AssetStatus;
  purchase_date: string | null;
  entry_date: string;
  commercial_value: number;
  quantity: number;
  supplier: string | null;
  has_insurance: boolean;
  insurer_name: string | null;
  insurance_start: string | null;
  insurance_end: string | null;
  drive_folder_url: string | null;
  specific_fields: Record<string, unknown>;
  created_by: string;
  created_at: string;
  // Joined fields
  category?: Category;
  current_assignee?: Person;
}

export interface Person {
  id: string;
  full_name: string;
  id_number: string;
  id_type: IdType;
  person_type: PersonType;
  area: string;
  position: string;
  email: string;
  is_active: boolean;
  is_spartian: boolean;
  created_at: string;
}

export interface Assignment {
  id: string;
  asset_id: string;
  person_id: string;
  assigned_by: string;
  assigned_at: string;
  returned_at: string | null;
  return_condition: ReturnCondition | null;
  damage_description: string | null;
  acta_url: string | null;
  is_active: boolean;
  // Joined
  asset?: Asset;
  person?: Person;
}

export interface Maintenance {
  id: string;
  asset_id: string;
  reason: string;
  description: string;
  sent_at: string;
  returned_at: string | null;
  final_status: MaintenanceFinalStatus | null;
  registered_by: string;
  created_at: string;
  // Joined
  asset?: Asset;
}

export interface AssetRetirement {
  id: string;
  asset_id: string;
  reason: RetirementReason;
  description: string;
  final_destination: FinalDestination;
  authorized_by: string;
  registered_by: string;
  retired_at: string;
  // Joined
  asset?: Asset;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin';
}
