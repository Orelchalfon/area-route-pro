import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { technicians } from '@/data/mockData';

type Role = 'admin' | 'employee';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}

const technicianName = (id: string | null): string =>
  id ? (technicians.find(t => t.id === id)?.name ?? id) : '—';

export default function UsersPage() {
  const { users, loading, error, createUser } = useAdminUsers();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('employee');
  const [technicianId, setTechnicianId] = useState(technicians[0].id);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error: createError } = await createUser(
      email.trim(),
      password,
      role,
      role === 'employee' ? technicianId : null,
    );
    setSubmitting(false);

    if (createError) {
      toast.error('יצירת המשתמש נכשלה', { description: createError });
      return;
    }
    toast.success('המשתמש נוצר בהצלחה');
    setEmail('');
    setPassword('');
    setRole('employee');
    setTechnicianId(technicians[0].id);
  };

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">ניהול משתמשים</h2>
        <p className="text-sm text-muted-foreground mt-1">יצירה וצפייה במשתמשים בעלי גישה למערכת</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="w-5 h-5" />
              משתמש חדש
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">אימייל</Label>
                <Input
                  id="new-email"
                  type="email"
                  autoComplete="off"
                  dir="ltr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">סיסמה</Label>
                <Input
                  id="new-password"
                  type="text"
                  autoComplete="off"
                  dir="ltr"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">לפחות 6 תווים</p>
              </div>
              <div className="space-y-2">
                <Label>תפקיד</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="employee">עובד (טכנאי)</SelectItem>
                    <SelectItem value="admin">מנהל</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {role === 'employee'
                    ? 'עובד רואה רק את המשימות שלו ויכול לדווח על ביצוע בלבד'
                    : 'מנהל בעל גישה מלאה למערכת'}
                </p>
              </div>
              {role === 'employee' && (
                <div className="space-y-2">
                  <Label>טכנאי</Label>
                  <Select value={technicianId} onValueChange={setTechnicianId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {technicians.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                צור משתמש
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">משתמשים קיימים ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive py-4">טעינת המשתמשים נכשלה: {error}</p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">תפקיד</TableHead>
                      <TableHead className="text-right">טכנאי</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">נוצר</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">כניסה אחרונה</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell dir="ltr" className="text-right">{user.email}</TableCell>
                        <TableCell>{user.role === 'admin' ? 'מנהל' : user.role === 'employee' ? 'עובד' : '—'}</TableCell>
                        <TableCell>{technicianName(user.technician_id)}</TableCell>
                        <TableCell className="hidden lg:table-cell">{formatDate(user.created_at)}</TableCell>
                        <TableCell className="hidden lg:table-cell">{formatDate(user.last_sign_in_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
