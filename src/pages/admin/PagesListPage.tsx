import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Copy } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { usePages, useDeletePage, useCreatePage } from '@/hooks/usePages';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import type { PageStatus } from '@/types/cms';

export default function PagesListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PageStatus | 'all'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { data: pages, isLoading } = usePages();
  const deletePage = useDeletePage();
  const createPage = useCreatePage();
  const { isAdmin } = useAuth();

  const filteredPages = pages?.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(search.toLowerCase()) ||
      page.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleDuplicate = async (page: { title: string; slug: string }) => {
    const newSlug = `${page.slug}-copy-${Date.now()}`;
    const result = await createPage.mutateAsync({
      title: `${page.title} (kopia)`,
      slug: newSlug,
    });
    navigate(`/admin/pages/${result.id}`);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deletePage.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Sidor</h1>
            <p className="text-muted-foreground mt-1">
              Hantera och redigera dina sidor
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/pages/new">
              <Plus className="h-4 w-4 mr-2" />
              Ny sida
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök efter titel eller slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={(value) => setStatusFilter(value as PageStatus | 'all')}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrera status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla statusar</SelectItem>
                  <SelectItem value="draft">Utkast</SelectItem>
                  <SelectItem value="reviewing">Granskning</SelectItem>
                  <SelectItem value="published">Publicerad</SelectItem>
                  <SelectItem value="archived">Arkiverad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pages List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">
              {filteredPages.length} {filteredPages.length === 1 ? 'sida' : 'sidor'}
            </CardTitle>
            <CardDescription>
              Klicka på en sida för att redigera den
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {search || statusFilter !== 'all' 
                    ? 'Inga sidor matchar din sökning'
                    : 'Inga sidor ännu. Skapa din första sida!'}
                </p>
                {!search && statusFilter === 'all' && (
                  <Button asChild>
                    <Link to="/admin/pages/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Skapa sida
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <Link 
                      to={`/admin/pages/${page.id}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{page.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            /{page.slug}
                          </p>
                        </div>
                        <StatusBadge status={page.status} />
                      </div>
                    </Link>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/pages/${page.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Redigera
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(page)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicera
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteId(page.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Radera
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Denna åtgärd kan inte ångras. Sidan kommer att raderas permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Radera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
