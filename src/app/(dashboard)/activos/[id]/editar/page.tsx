import { notFound } from 'next/navigation';
import { getAssetById } from '@/lib/actions/assets';
import { getCategories } from '@/lib/actions/categories';
import { EditAssetForm } from '@/components/activos/edit-asset-form';

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let asset;
  try {
    asset = await getAssetById(id);
  } catch {
    notFound();
  }

  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Editar Activo — {asset.code}</h1>
      <EditAssetForm asset={asset} categories={categories} />
    </div>
  );
}
