import { createClient } from '@/lib/supabase/server';
import {
  RetirementsManager,
  type RetirementRow,
  type AssetOption,
  type AdminOption,
} from '@/components/bajas/retirements-manager';

export default async function RetirementPage() {
  const supabase = await createClient();
  const [rRes, aRes, adRes] = await Promise.all([
    supabase
      .from('asset_retirements')
      .select('id, reason, description, final_destination, retired_at, asset:assets(id, name, code)')
      .order('retired_at', { ascending: false }),
    supabase
      .from('assets')
      .select('id, name, code, status')
      .neq('status', 'baja'),
    supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .order('full_name'),
  ]);

  const retirements = (rRes.data ?? []) as unknown as RetirementRow[];
  const assets = (aRes.data ?? []) as AssetOption[];
  const admins = (adRes.data ?? []) as AdminOption[];

  return <RetirementsManager retirements={retirements} assets={assets} admins={admins} />;
}
