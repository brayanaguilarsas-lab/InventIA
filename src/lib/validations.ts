import { z } from 'zod';

export const assetStatusEnum = z.enum(['disponible', 'asignado', 'mantenimiento', 'baja']);
export const personTypeEnum = z.enum(['empleado', 'contratista']);
export const idTypeEnum = z.enum(['CC', 'CE', 'Pasaporte', 'NIT']);
export const returnConditionEnum = z.enum(['bueno', 'con_daños']);
export const maintenanceFinalStatusEnum = z.enum(['funcional', 'no_funcional']);
export const retirementReasonEnum = z.enum(['dañado', 'obsoleto', 'robado', 'perdido', 'otro']);
export const finalDestinationEnum = z.enum(['desechado', 'vendido', 'donado']);

export const createPersonSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  id_number: z.string().min(4, 'El número de identificación es requerido'),
  id_type: idTypeEnum,
  person_type: personTypeEnum,
  area: z.string().min(1, 'El área es requerida'),
  position: z.string().min(1, 'El cargo es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  is_spartian: z.boolean().default(false),
});

export const createAssetSchema = z.object({
  name: z.string().min(2, 'El nombre del activo es requerido'),
  category_id: z.string().uuid('Selecciona una categoría'),
  quantity: z.number().int().min(1, 'La cantidad mínima es 1').default(1),
  purchase_date: z.string().nullable().optional(),
  commercial_value: z.number().min(0, 'El valor debe ser mayor o igual a 0'),
  supplier: z.string().nullable().optional(),
  has_insurance: z.boolean().default(false),
  insurer_name: z.string().nullable().optional(),
  insurance_start: z.string().nullable().optional(),
  insurance_end: z.string().nullable().optional(),
  specific_fields: z.record(z.string(), z.unknown()).default({}),
});

export const createAssignmentSchema = z.object({
  asset_id: z.string().uuid('Selecciona un activo'),
  person_id: z.string().uuid('Selecciona una persona'),
});

export const returnAssignmentSchema = z.object({
  return_condition: returnConditionEnum,
  damage_description: z.string().nullable().optional(),
});

// Helper: fecha YYYY-MM-DD, no en el futuro y no antes del 2000.
const pastOrTodayDate = z
  .string()
  .min(1, 'La fecha es requerida')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Formato de fecha inválido')
  .refine(
    (d) => new Date(d) <= new Date(Date.now() + 24 * 60 * 60 * 1000),
    'La fecha no puede estar en el futuro'
  )
  .refine((d) => new Date(d).getFullYear() >= 2000, 'Fecha demasiado antigua');

export const createMaintenanceSchema = z.object({
  asset_id: z.string().uuid('Selecciona un activo'),
  reason: z.string().min(1, 'El motivo es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  sent_at: pastOrTodayDate,
});

export const returnMaintenanceSchema = z.object({
  returned_at: pastOrTodayDate,
  final_status: maintenanceFinalStatusEnum,
});

export const createRetirementSchema = z.object({
  asset_id: z.string().uuid('Selecciona un activo'),
  reason: retirementReasonEnum,
  description: z.string().min(1, 'La descripción es requerida'),
  final_destination: finalDestinationEnum,
  authorized_by: z.string().uuid('Selecciona quién autoriza'),
});

export const createCategorySchema = z.object({
  name: z.string().min(2, 'El nombre de la categoría es requerido'),
  code_prefix: z.string().min(2, 'El prefijo del código es requerido').max(5),
  fields_schema: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(['text', 'number', 'select', 'date']),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
    })
  ),
  acta_template: z.string().default(''),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type ReturnAssignmentInput = z.infer<typeof returnAssignmentSchema>;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type ReturnMaintenanceInput = z.infer<typeof returnMaintenanceSchema>;
export type CreateRetirementInput = z.infer<typeof createRetirementSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
