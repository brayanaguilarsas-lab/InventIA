// Convierte errores técnicos (Supabase/Postgres/Zod) a mensajes en español
// que un usuario no-técnico pueda entender.

interface ErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  issues?: Array<{ message: string; path: (string | number)[] }>;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Nombre completo',
  id_number: 'Identificación',
  email: 'Correo electrónico',
  name: 'Nombre',
  code: 'Código',
  purchase_date: 'Fecha de compra',
  commercial_value: 'Valor comercial',
  category_id: 'Categoría',
  asset_id: 'Activo',
  person_id: 'Persona',
  code_prefix: 'Prefijo',
  insurer_name: 'Aseguradora',
  insurance_start: 'Inicio de cobertura',
  insurance_end: 'Fin de cobertura',
};

function pickField(msg: string): string | null {
  // Extrae nombre de columna de mensajes tipo:
  //   'duplicate key value violates unique constraint "people_id_number_key"'
  //   'null value in column "email" violates not-null constraint'
  const uniqueMatch = msg.match(/constraint "([a-z_]+)_([a-z_]+)_key"/i);
  if (uniqueMatch) {
    const col = uniqueMatch[2];
    return FIELD_LABELS[col] ?? col;
  }
  const colMatch = msg.match(/column "([a-z_]+)"/i);
  if (colMatch) {
    const col = colMatch[1];
    return FIELD_LABELS[col] ?? col;
  }
  return null;
}

export function humanizeError(err: unknown): string {
  if (err == null) return 'Error desconocido';
  if (typeof err === 'string') return err;

  const e = err as ErrorLike;

  // Zod: agregar primera issue con nombre de campo
  if (Array.isArray(e.issues) && e.issues.length > 0) {
    const issue = e.issues[0];
    const field = issue.path[0];
    const label = typeof field === 'string' ? (FIELD_LABELS[field] ?? field) : null;
    return label ? `${label}: ${issue.message}` : issue.message;
  }

  const msg = e.message ?? '';
  const code = e.code ?? '';

  // Postgres error codes
  // https://www.postgresql.org/docs/current/errcodes-appendix.html
  if (code === '23505' || msg.includes('duplicate key')) {
    const field = pickField(msg);
    return field
      ? `Ya existe un registro con ese ${field.toLowerCase()}.`
      : 'Ya existe un registro con esos datos.';
  }
  if (code === '23502' || msg.includes('not-null constraint')) {
    const field = pickField(msg);
    return field
      ? `El campo ${field.toLowerCase()} es obligatorio.`
      : 'Falta un campo obligatorio.';
  }
  if (code === '23503' || msg.includes('foreign key constraint')) {
    return 'No se puede completar la acción: hay registros relacionados que lo impiden.';
  }
  if (code === '23514' || msg.includes('check constraint')) {
    return 'Uno de los valores no cumple las reglas del sistema.';
  }
  if (code === '22P02' || msg.includes('invalid input syntax')) {
    return 'Formato de dato inválido. Revisa los valores ingresados.';
  }
  if (code === '42501' || msg.includes('permission denied')) {
    return 'No tienes permisos para realizar esta acción.';
  }

  // Auth / Supabase
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.';
  }
  if (msg.includes('JWT expired') || msg.includes('session_not_found')) {
    return 'Tu sesión expiró. Inicia sesión de nuevo.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
  }

  // Errores ya amigables (que lanzamos desde server actions)
  if (msg && !msg.match(/^[A-Z]{2,}:/) && !msg.match(/^\d{5}/)) {
    return msg;
  }

  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
