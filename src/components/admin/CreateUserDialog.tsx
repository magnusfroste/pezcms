import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, RefreshCw, Copy, Check } from 'lucide-react';
import type { AppRole } from '@/types/cms';

function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('writer');
  const [copied, setCopied] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Inte inloggad');

      const response = await supabase.functions.invoke('create-user', {
        body: { email, password, full_name: fullName, role }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setCreatedPassword(password);
      toast({ 
        title: 'Användare skapad', 
        description: `${email} har lagts till med rollen ${role === 'writer' ? 'Skribent' : role === 'approver' ? 'Granskare' : 'Administratör'}.`
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Fel', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const handleGenerate = () => {
    setPassword(generatePassword());
  };

  const handleCopyPassword = async () => {
    const pwToCopy = createdPassword || password;
    await navigator.clipboard.writeText(pwToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate();
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form after close animation
    setTimeout(() => {
      setEmail('');
      setFullName('');
      setPassword('');
      setRole('writer');
      setCreatedPassword(null);
      setCopied(false);
    }, 200);
  };

  const isValid = email.includes('@') && password.length >= 8;

  return (
    <Dialog open={open} onOpenChange={(v) => v ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Lägg till användare
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Skapa ny användare</DialogTitle>
          <DialogDescription>
            Skapa en ny användare för CMS:et. Användaren kan logga in direkt.
          </DialogDescription>
        </DialogHeader>

        {createdPassword ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Användare skapad!</p>
              <p className="text-sm text-muted-foreground">
                Spara lösenordet nedan – det visas endast en gång.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono">
                  {createdPassword}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyPassword}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Stäng</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="namn@example.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="fullName">Namn</Label>
                <Input
                  id="fullName"
                  placeholder="Förnamn Efternamn"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Lösenord (minst 8 tecken)</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="text"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleGenerate}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Roll</Label>
                <Select value={role} onValueChange={(v: AppRole) => setRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="writer">Skribent</SelectItem>
                    <SelectItem value="approver">Granskare</SelectItem>
                    <SelectItem value="admin">Administratör</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Avbryt
              </Button>
              <Button type="submit" disabled={!isValid || createUser.isPending}>
                {createUser.isPending ? 'Skapar...' : 'Skapa användare'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
