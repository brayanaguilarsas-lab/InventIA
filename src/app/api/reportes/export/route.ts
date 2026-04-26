import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateDepreciation } from '@/lib/depreciation';

export const maxDuration = 60;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'csv';
  const status = searchParams.get('status');
  const categoryId = searchParams.get('category_id');

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

  const headers = [
    'Código', 'Nombre', 'Categoría', 'Estado', 'Cantidad', 'Responsable Actual',
    'Proveedor', 'Valor Comercial', 'Depreciación Acum.', 'Valor en Libros',
    'Fecha Compra', 'Fecha Ingreso', 'Asegurado', 'Aseguradora', 'Fin Cobertura',
  ];

  const fmt = (n: number) => new Intl.NumberFormat('es-CO').format(Math.round(n));

  const tableRows = (assets ?? []).map((asset) => {
    const cat = asset.category as unknown as { name: string } | null;
    const commercial = Number(asset.commercial_value) || 0;
    const dep = calculateDepreciation(cat?.name, commercial, asset.purchase_date);
    const supplier = (asset as unknown as { supplier?: string | null }).supplier ?? '';
    return [
      asset.code,
      asset.name,
      cat?.name ?? '',
      statusLabels[asset.status] ?? asset.status,
      (asset as unknown as { quantity?: number }).quantity ?? 1,
      assignmentMap[asset.id] ?? '',
      supplier,
      fmt(commercial),
      fmt(dep.accumulated),
      fmt(dep.bookValue),
      asset.purchase_date ?? '',
      asset.entry_date,
      asset.has_insurance ? 'Sí' : 'No',
      asset.insurer_name ?? '',
      asset.insurance_end ?? '',
    ];
  });

  const dateStamp = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const csvEscape = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.map(csvEscape).join(','),
      ...tableRows.map((r) => r.map(csvEscape).join(',')),
    ].join('\n');
    const bom = '\uFEFF';
    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Inventario_SaleADS_${dateStamp}.csv"`,
      },
    });
  }

  if (format === 'pdf') {
    if (!process.env.PDFSHIFT_API_KEY) {
      return NextResponse.json(
        { error: 'PDFSHIFT_API_KEY no configurada en el servidor' },
        { status: 500 }
      );
    }
    const totalValue = (assets ?? []).reduce(
      (s, a) => s + (Number(a.commercial_value) || 0),
      0
    );
    const totalBookValue = (assets ?? []).reduce((s, a) => {
      const cat = a.category as unknown as { name: string } | null;
      return s + calculateDepreciation(cat?.name, Number(a.commercial_value) || 0, a.purchase_date).bookValue;
    }, 0);
    const totalQty = (assets ?? []).reduce(
      (s, a) => s + ((a as unknown as { quantity?: number }).quantity ?? 1),
      0
    );
    const htmlEscape = (s: string) =>
      s.replace(/[<>&"']/g, (m) => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;',
      }[m]!));

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;font-size:9pt;color:#111;margin:20px}
      h1{font-size:14pt;margin:0 0 4px}
      .meta{color:#666;font-size:8pt;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}
      th{background:#f3f4f6;font-size:8pt}
      td{font-size:8pt}
      tfoot td{font-weight:700;background:#f9fafb}
      .num{text-align:right;font-variant-numeric:tabular-nums}
    </style></head><body>
    <h1>Consolidado de Inventario — SALEADS CORP</h1>
    <div class="meta">Generado: ${htmlEscape(new Date().toLocaleString('es-CO'))} · Filtro: ${htmlEscape(status ?? 'todos')}${categoryId ? ' · categoría filtrada' : ''} · Total activos: ${assets?.length ?? 0}</div>
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>
        ${tableRows.map((r) => `<tr>${r.map((c, i) => `<td class="${[4, 7, 8, 9].includes(i) ? 'num' : ''}">${htmlEscape(String(c))}</td>`).join('')}</tr>`).join('')}
      </tbody>
      <tfoot><tr>
        <td colspan="4">TOTAL</td>
        <td class="num">${totalQty}</td>
        <td colspan="2"></td>
        <td class="num">${fmt(totalValue)}</td>
        <td></td>
        <td class="num">${fmt(totalBookValue)}</td>
        <td colspan="5"></td>
      </tr></tfoot>
    </table>
    </body></html>`;

    const pdfRes = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from('api:' + process.env.PDFSHIFT_API_KEY).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: html, landscape: true, format: 'A4', margin: '15mm' }),
    });
    if (!pdfRes.ok) {
      const txt = await pdfRes.text();
      return NextResponse.json({ error: 'PDF error: ' + txt.slice(0, 300) }, { status: 500 });
    }
    const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
    return new NextResponse(pdfBuf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Inventario_SaleADS_${dateStamp}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 });
}
