import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateActaPDF } from '@/lib/pdf/generate-acta';
import { generateActaSpartianPDF } from '@/lib/pdf/generate-acta-spartian';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get('id');
  // tipo: 'spartian' fuerza acta de comodato; 'normal' fuerza acta de entrega simple;
  // sin tipo, usa el acta correspondiente a person.is_spartian
  const forceTipo = searchParams.get('tipo');

  if (!assignmentId) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const { data: assignment, error } = await supabase
    .from('assignments')
    .select(`
      *,
      asset:assets(*, category:categories(*)),
      person:people(*)
    `)
    .eq('id', assignmentId)
    .single();

  if (error || !assignment) {
    return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
  }

  const asset = assignment.asset as unknown as {
    code: string;
    name: string;
    commercial_value: number;
    specific_fields: Record<string, unknown>;
    category: { name: string } | null;
  };
  const person = assignment.person as unknown as {
    full_name: string;
    id_type: string;
    id_number: string;
    area: string;
    position: string;
    email: string;
    is_spartian?: boolean;
  };

  // Get who assigned
  let assignedByName = 'Administración SaleADS';
  if (assignment.assigned_by) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', assignment.assigned_by)
      .single();
    if (profile) assignedByName = profile.full_name;
  }

  const sf = (asset.specific_fields ?? {}) as Record<string, unknown>;
  const useSpartian =
    forceTipo === 'spartian' || (forceTipo !== 'normal' && !!person.is_spartian);
  const pdfBytes = useSpartian
    ? await generateActaSpartianPDF({
        assetCode: asset.code,
        assetName: asset.name,
        assetType: asset.category?.name ?? 'Equipo tecnológico',
        brand: sf.marca as string | undefined,
        model: sf.modelo as string | undefined,
        serial: sf.serial as string | undefined,
        ram: sf.ram as string | undefined,
        storage: sf.almacenamiento as string | undefined,
        accessories: sf.accesorios as string | undefined,
        commercialValue: Number(asset.commercial_value),
        personName: person.full_name,
        personIdType: person.id_type,
        personIdNumber: person.id_number,
        personPosition: person.position,
        date: assignment.assigned_at,
        assignedBy: assignedByName,
      })
    : await generateActaPDF({
        tipo: 'entrega',
        assetCode: asset.code,
        assetName: asset.name,
        categoryName: asset.category?.name ?? 'Sin categoría',
        commercialValue: Number(asset.commercial_value),
        specificFields: asset.specific_fields ?? {},
        personName: person.full_name,
        personIdType: person.id_type,
        personIdNumber: person.id_number,
        personArea: person.area,
        personPosition: person.position,
        personEmail: person.email,
        date: assignment.assigned_at,
        assignedBy: assignedByName,
      });

  const prefix = useSpartian ? 'Acta_Comodato_Spartian' : 'Acta_Entrega';
  const safePerson = person.full_name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safeCode = asset.code.replace(/[^a-zA-Z0-9_-]/g, '_');
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${prefix}_${safeCode}_${safePerson}.pdf"`,
    },
  });
}
