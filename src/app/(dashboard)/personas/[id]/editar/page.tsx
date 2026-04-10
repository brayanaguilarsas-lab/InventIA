import { notFound } from 'next/navigation';
import { getPersonById } from '@/lib/actions/people';
import { EditPersonForm } from '@/components/personas/edit-person-form';

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let person;
  try {
    person = await getPersonById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Editar Persona</h1>
      <EditPersonForm person={person} />
    </div>
  );
}
