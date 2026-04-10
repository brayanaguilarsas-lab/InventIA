import { getCategories } from '@/lib/actions/categories';
import { AssetForm } from '@/components/activos/asset-form';

export default async function NewAssetPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Registrar Nuevo Activo</h1>
      <AssetForm categories={categories} />
    </div>
  );
}
