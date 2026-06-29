import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

export default function LoginPage() {
  const { session, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  if (!authLoading && session) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (error) {
      toast.error('ההתחברות נכשלה', { description: 'אימייל או סיסמה שגויים' });
      return;
    }

    // Explicitly persist credentials so Chromium offers to save them even though
    // this SPA unmounts the form on navigation (its heuristic save often misses that).
    if ('PasswordCredential' in window) {
      try {
        const cred = new (window as unknown as { PasswordCredential: new (data: { id: string; password: string; name?: string }) => Credential }).PasswordCredential({
          id: email.trim(),
          password,
          name: email.trim(),
        });
        await navigator.credentials.store(cred);
      } catch {
        /* unsupported or dismissed — fall back to the browser's own heuristic */
      }
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <img src={logo} alt="טל חרמון" width={48} height={48} decoding="async" className="w-12 h-12 rounded-lg object-cover mx-auto" />
          <CardTitle className="text-xl">התחברות למערכת</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                dir="ltr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                dir="ltr"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              התחבר
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
