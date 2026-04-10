import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'csv';
  const status = searchParams.get('status');
  const categoryId = searchParams.get('category_id');

  const supabase = await createClient();

  let query = supabase
    .from('assets')
    .select('*, category:categories(name)')
    .order('code');

  if (status && status !== 'todos') {
    query = query.eq('status', status);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data: assets, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get current assignments for assigned assets
  const assignedIds = assets
    ?.filter((a) => a.status === 'asignado')
    .map((a) => a.id) ?? [];

  let assignmentMap: Record<string, string> = {};
  if (assignedIds.length > 0) {
    const { data: assignments } = await supabase
      .from('assignments')
      .select('asset_id, person:people(full_name)')
      .in('asset_id', assignedIds)
      .eq('is_active', true);

    assignmentMap = (assignments ?? []).reduce((acc, a) => {
      const person = a.person as unknown as { full_name: string } | null;
      acc[a.asset_id] = person?.full_name ?? '';
      return acc;
    }, {} as Record<string, string>);
  }

  const statusLabels: Record<string, string> = {
    disponible: 'Disponible',
    asignado: 'Asignado',
    mantenimiento: 'En Mantenimiento',
    baja: 'Dado de Baja',
  };

  if (format === 'csv') {
    const headers = [
      'Código',
      'Nombre',
      'Categoría',
      'Estado',
      'Responsable Actual',
      'Valor Comercial',
      'Fecha Compra',
      'Fecha Ingreso',
      'Asegurado',
      'Aseguradora',
      'Fin Cobertura',
    ];

    const rows = (assets ?? []).map((asset) => {
      const cat = asset.category as unknown as { name: string } | null;
      return [
        asset.code,
        `"${asset.name}"`,
        cat?.name ?? '',
        statusLabels[asset.status] ?? asset.status,
        assignmentMap[asset.id] ?? '',
        asset.commercial_value,
        asset.purchase_date ?? '',
        asset.entry_date,
        asset.has_insurance ? 'Sí' : 'No',
        asset.insurer_name ?? '',
        asset.insurance_end ?? '',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM for Excel

    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Inventario_SaleADS_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 });
}
