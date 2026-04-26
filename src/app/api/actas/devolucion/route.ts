import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateActaPDF } from '@/lib/pdf/generate-acta';

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
  };

  let assignedByName = 'Administración SaleADS';
  if (assignment.assigned_by) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', assignment.assigned_by)
      .single();
    if (profile) assignedByName = profile.full_name;
  }

  const pdfBytes = await generateActaPDF({
    tipo: 'devolucion',
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
    date: assignment.returned_at ?? new Date().toISOString(),
    assignedBy: assignedByName,
    returnCondition: assignment.return_condition ?? undefined,
    damageDescription: assignment.damage_description ?? undefined,
  });

  const safePerson = person.full_name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safeCode = asset.code.replace(/[^a-zA-Z0-9_-]/g, '_');
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Acta_Devolucion_${safeCode}_${safePerson}.pdf"`,
    },
  });
}
