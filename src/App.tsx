import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PagesListPage from "./pages/admin/PagesListPage";
import NewPagePage from "./pages/admin/NewPagePage";
import PageEditorPage from "./pages/admin/PageEditorPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/pages" element={<PagesListPage />} />
            <Route path="/admin/pages/new" element={<NewPagePage />} />
            <Route path="/admin/pages/:id" element={<PageEditorPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
