# InventIA — Contexto del Proyecto

Sistema interno de gestión de inventario de activos para **Saleads Corp** (>300 activos). Automatiza registro con IA (visión), asignaciones, actas PDF, mantenimiento, bajas y reportes.

## Stack real (según `package.json`)

- **Next.js 16.2.3** (App Router) — NO es el Next que conocías; leer `node_modules/next/dist/docs/` antes de codear. Usa `proxy.ts` (no `middleware.ts`).
- **React 19.2.4** + TypeScript estricto + Tailwind v4
- **Supabase** (`@supabase/ssr` + `supabase-js`) — proyecto `leotnuwgkhnoqrkpaevl`
- **Base UI + shadcn** (no Radix) — `render` no `asChild`; `onValueChange` puede ser null
- **Anthropic SDK** (`@anthropic-ai/sdk` 0.86) — Claude Sonnet con visión para extracción
- **Google Drive API** (`googleapis`) — cuenta de servicio, carpetas por activo
- **Resend** — envío de actas (faltan env vars en Railway)
- **pdf-lib** — generación de actas
- **n8n** — orquestación: 3 workflows activos (pólizas, mant., reporte semanal)
- **Zod** validación

## Usuarios (sin acceso externo)

Directora, Analista Administrativa, Líder de TH.

## Módulos

1. Registro inteligente con IA (sube foto/factura/ficha → Claude extrae → prellenar → alertas por campo faltante → código único + carpeta Drive)
2. Categorías editables (Tecnología, Mobiliario, Vehículos, Electrodomésticos) con `fields_schema` JSONB
3. Personas (empleados/contratistas)
4. Asignación → acta PDF → Drive → email a persona + 3 admins
5. Devolución + paz y salvo (bueno/con daños, sin cobro)
6. Mantenimiento (si no retorna funcional → Baja)
7. Baja (motivo, descripción, destino final, autoriza)
8. Dashboard + alertas (pólizas a 30 días) + export Excel/PDF + auditoría

## Modelo de datos

Tablas: `assets`, `categories`, `people`, `assignments`, `maintenances`, `asset_retirements`, `audit_log`. Ver `supabase/migration_001_initial.sql` y spec completa en `../prompt_inventario_saleads.md`.

## Reglas críticas

- Código único: `[CAT]-[AÑO]-[SEQ]` (ej `TEC-2026-001`)
- Un activo, una asignación activa a la vez; solo se asignan `Disponible`
- Toda acción → `audit_log`
- Baja de activo asignado: primero registrar devolución
- JSONB para `specific_fields` por categoría

## Estado y pendientes

- Estructura base lista: `src/app`, `src/components`, `src/lib`, `src/types`, `proxy.ts`
- Migración inicial creada (`migration_001_initial.sql`)
- **Pendiente**: setear env vars de Resend en Railway
- Orden de implementación: Registro IA → Personas → Asignación/actas → Devolución → Mantenimiento/Bajas → Dashboard

## Referencias

- Spec completa: `/Users/brayanaguilar/Documents/Claude Code/Inventario SaleADS - MH/prompt_inventario_saleads.md`
- AGENTS.md: advertencia sobre Next.js 16 breaking changes
