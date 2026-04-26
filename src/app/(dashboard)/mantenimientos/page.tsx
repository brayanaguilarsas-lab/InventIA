import { createClient } from '@/lib/supabase/server';
import {
  MaintenancesManager,
  type MaintenanceRow,
  type AssetOption,
} from '@/components/mantenimientos/maintenances-manager';

export default async function MaintenancesPage() {
  const supabase = await createClient();

  const [mRes, aRes] = await Promise.all([
    supabase
      .from('maintenances')
      .select('id, reason, description, sent_at, returned_at, final_status, asset_id, asset:assets(id, name, code)')
      .order('created_at', { ascending: false }),
    supabase
      .from('assets')
      .select('id, name, code')
      .in('status', ['disponible', 'asignado']),
  ]);

  const maintenances = (mRes.data ?? []) as unknown as MaintenanceRow[];
  const assets = (aRes.data ?? []) as AssetOption[];

  return <MaintenancesManager maintenances={maintenances} assets={assets} />;
}
