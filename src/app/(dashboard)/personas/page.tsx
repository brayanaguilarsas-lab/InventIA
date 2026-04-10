import Link from 'next/link';
import { getPeople } from '@/lib/actions/people';
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
import { Plus, Eye } from 'lucide-react';
import { PersonActions } from '@/components/personas/person-actions';

export default async function PeoplePage() {
  const people = await getPeople();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Personas</h1>
        <Link href="/personas/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Persona
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directorio ({people.length} personas)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Identificación</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-28">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">
                    <Link href={`/personas/${person.id}`} className="hover:underline">
                      {person.full_name}
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
                  <TableCell>{person.area}</TableCell>
                  <TableCell>{person.position}</TableCell>
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay personas registradas
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
