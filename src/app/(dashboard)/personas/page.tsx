import Link from 'next/link';
import { getPeople, getPeopleAreas } from '@/lib/actions/people';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Eye, Users } from 'lucide-react';
import { PersonActions } from '@/components/personas/person-actions';
import { ImportCsvDialog } from '@/components/personas/import-csv-dialog';
import { PeopleSearch } from '@/components/personas/people-search';
import { titleCase } from '@/lib/format';

const PAGE_SIZE = 25;

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; area?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const [{ rows: people, total }, areas] = await Promise.all([
    getPeople({
      search: params.search,
      area: params.area,
      page,
      pageSize: PAGE_SIZE,
    }),
    getPeopleAreas(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Personas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Empleados y contratistas que pueden recibir activos asignados.
          </p>
        </div>
        <div className="flex gap-2">
          <ImportCsvDialog />
          <Link href="/personas/nueva">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Persona
            </Button>
          </Link>
        </div>
      </div>

      <PeopleSearch areas={areas} />

      <Card>
        <CardHeader>
          <CardTitle>Directorio ({total} personas)</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 && !params.search ? (
            <EmptyState
              icon={Users}
              title="Aún no hay personas registradas"
              description="Agrega empleados o contratistas para poder asignarles activos."
              cta={{ label: 'Registrar primera persona', href: '/personas/nueva' }}
            />
          ) : (
          <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Identificación</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Spartian</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-28">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">
                      <Link href={`/personas/${person.id}`} className="hover:underline">
                        {titleCase(person.full_name)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {person.id_type} {person.id_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant={person.person_type === 'empleado' ? 'default' : 'secondary'}>
                        {person.person_type === 'empleado' ? 'Empleado' : 'Contratista'}
                      </Badge>
                    </TableCell>
                    <TableCell>{titleCase(person.area)}</TableCell>
                    <TableCell>{titleCase(person.position)}</TableCell>
                    <TableCell>
                      {person.is_spartian ? (
                        <Badge>Sí</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={person.is_active ? 'default' : 'destructive'}>
                        {person.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/personas/${person.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </Link>
                        <PersonActions personId={person.id} isActive={person.is_active} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {people.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No hay personas que coincidan con la búsqueda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination total={total} pageSize={PAGE_SIZE} />
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
