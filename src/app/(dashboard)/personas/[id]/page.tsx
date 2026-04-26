import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPersonById } from '@/lib/actions/people';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil } from 'lucide-react';
import { titleCase } from '@/lib/format';

async function getPersonAssignments(personId: string) {
  const supabase = await createClient();

  const { data: active } = await supabase
    .from('assignments')
    .select('*, asset:assets(id, code, name, category:categories(name))')
    .eq('person_id', personId)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false });

  const { data: history } = await supabase
    .from('assignments')
    .select('*, asset:assets(id, code, name, category:categories(name))')
    .eq('person_id', personId)
    .eq('is_active', false)
    .order('assigned_at', { ascending: false });

  return {
    active: active ?? [],
    history: history ?? [],
  };
}

export default async function PersonDetailPage({
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

  const assignments = await getPersonAssignments(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{titleCase(person.full_name)}</h1>
          <p className="text-muted-foreground">
            {person.id_type} {person.id_number}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={person.is_active ? 'default' : 'destructive'}>
            {person.is_active ? 'Activo' : 'Inactivo'}
          </Badge>
          <Link href={`/personas/${id}/editar`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-3 w-3" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Person Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tipo</span>
              <Badge variant="secondary">
                {person.person_type === 'empleado' ? 'Empleado' : 'Contratista'}
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Área</span>
              <span className="text-sm font-medium">{titleCase(person.area)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cargo</span>
              <span className="text-sm font-medium">{titleCase(person.position)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Correo</span>
              <span className="text-sm">{person.email}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Registrado</span>
              <span className="text-sm font-mono">
                {new Date(person.created_at).toLocaleDateString('es-CO')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activos Asignados ({assignments.active.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.active.length > 0 ? (
              <div className="space-y-3">
                {assignments.active.map((a) => {
                  const asset = a.asset as unknown as { id: string; code: string; name: string; category: { name: string } | null } | null;
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <Link href={`/activos/${asset?.id}`} className="font-mono text-sm font-medium hover:underline">
                          {asset?.code}
                        </Link>
                        <p className="text-sm text-muted-foreground">{asset?.name}</p>
                      </div>
                      <Badge variant="outline">
                        {(asset?.category as { name: string } | null)?.name}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin activos asignados actualmente</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Asignaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Asignación</TableHead>
                <TableHead>Devolución</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.history.map((a) => {
                const asset = a.asset as unknown as { code: string; name: string; category: { name: string } | null } | null;
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className="font-mono text-sm">{asset?.code}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{asset?.name}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {(asset?.category as { name: string } | null)?.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {new Date(a.assigned_at).toLocaleDateString('es-CO')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {a.returned_at ? new Date(a.returned_at).toLocaleDateString('es-CO') : '-'}
                    </TableCell>
                    <TableCell>
                      {a.return_condition === 'bueno' && <Badge>Bueno</Badge>}
                      {a.return_condition === 'con_daños' && <Badge variant="destructive">Con daños</Badge>}
                      {!a.return_condition && '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {assignments.history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Sin historial de asignaciones
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
