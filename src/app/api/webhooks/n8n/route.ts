import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateActaPDF } from '@/lib/pdf/generate-acta';
import { sendActaEmail, buildEntregaEmailHtml, buildDevolucionEmailHtml } from '@/lib/email';
import { uploadActaToDrive } from '@/lib/google-drive';

/**
 * n8n Webhook endpoint for orchestrating automated flows.
 *
 * Accepts POST with JSON body:
 * {
 *   "action": "assignment_complete" | "return_complete",
 *   "assignment_id": "uuid"
 * }
 *
 * Flow: Generate PDF → Upload to Drive → Send Email
 */
export async function POST(request: Request) {
  try {
    // Verify webhook secret
    const secret = request.headers.get('x-webhook-secret');
    if (secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, assignment_id } = body;

    if (!action || !assignment_id) {
      return NextResponse.json({ error: 'Missing action or assignment_id' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch assignment with relations
    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('*, asset:assets(*, category:categories(*)), person:people(*)')
      .eq('id', assignment_id)
      .single();

    if (error || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const asset = assignment.asset as unknown as {
      code: string;
      name: string;
      commercial_value: number;
      specific_fields: Record<string, unknown>;
      drive_folder_url: string | null;
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

    // Get admin name
    let adminName = 'Administración SaleADS';
    if (assignment.assigned_by) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', assignment.assigned_by)
        .single();
      if (profile) adminName = profile.full_name;
    }

    const results: Record<string, unknown> = { action };

    if (action === 'assignment_complete') {
      // Generate entrega PDF
      const pdfBytes = await generateActaPDF({
        tipo: 'entrega',
        assetCode: asset.code,
        assetName: asset.name,
        categoryName: asset.category?.name ?? '',
        commercialValue: Number(asset.commercial_value),
        specificFields: asset.specific_fields ?? {},
        personName: person.full_name,
        personIdType: person.id_type,
        personIdNumber: person.id_number,
        personArea: person.area,
        personPosition: person.position,
        personEmail: person.email,
        date: assignment.assigned_at,
        assignedBy: adminName,
      });

      // Upload to Drive (if configured)
      if (asset.drive_folder_url) {
        try {
          const actaUrl = await uploadActaToDrive(
            asset.drive_folder_url,
            `Acta_Entrega_${asset.code}_${person.full_name.replace(/\s/g, '_')}.pdf`,
            pdfBytes
          );
          await supabase
            .from('assignments')
            .update({ acta_url: actaUrl })
            .eq('id', assignment_id);
          results.drive_url = actaUrl;
        } catch (err) {
          results.drive_error = (err as Error).message;
        }
      }

      // Send email
      try {
        await sendActaEmail({
          to: person.email,
          subject: `Acta de Entrega — ${asset.code} (${asset.name})`,
          htmlBody: buildEntregaEmailHtml({
            personName: person.full_name,
            assetCode: asset.code,
            assetName: asset.name,
            date: assignment.assigned_at,
          }),
          pdfBytes,
          pdfFilename: `Acta_Entrega_${asset.code}.pdf`,
        });
        results.email_sent = true;
      } catch (err) {
        results.email_error = (err as Error).message;
      }
    }

    if (action === 'return_complete') {
      const pdfBytes = await generateActaPDF({
        tipo: 'devolucion',
        assetCode: asset.code,
        assetName: asset.name,
        categoryName: asset.category?.name ?? '',
        commercialValue: Number(asset.commercial_value),
        specificFields: asset.specific_fields ?? {},
        personName: person.full_name,
        personIdType: person.id_type,
        personIdNumber: person.id_number,
        personArea: person.area,
        personPosition: person.position,
        personEmail: person.email,
        date: assignment.returned_at ?? new Date().toISOString(),
        assignedBy: adminName,
        returnCondition: assignment.return_condition ?? undefined,
        damageDescription: assignment.damage_description ?? undefined,
      });

      // Upload to Drive
      if (asset.drive_folder_url) {
        try {
          const actaUrl = await uploadActaToDrive(
            asset.drive_folder_url,
            `Acta_Devolucion_${asset.code}_${person.full_name.replace(/\s/g, '_')}.pdf`,
            pdfBytes
          );
          results.drive_url = actaUrl;
        } catch (err) {
          results.drive_error = (err as Error).message;
        }
      }

      // Send email
      try {
        await sendActaEmail({
          to: person.email,
          subject: `Acta de Devolución y Paz y Salvo — ${asset.code} (${asset.name})`,
          htmlBody: buildDevolucionEmailHtml({
            personName: person.full_name,
            assetCode: asset.code,
            assetName: asset.name,
            date: assignment.returned_at ?? new Date().toISOString(),
            condition: assignment.return_condition ?? 'bueno',
          }),
          pdfBytes,
          pdfFilename: `Acta_Devolucion_${asset.code}.pdf`,
        });
        results.email_sent = true;
      } catch (err) {
        results.email_error = (err as Error).message;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
