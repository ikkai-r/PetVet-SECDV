import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { PetOwnerGuard, VetGuard, AdminGuard, VetOrAdminGuard } from "@/components/RoleGuard";
import { SecurityProvider } from "@/components/SecurityProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PetManagement from "./pages/PetManagement";
import Account from "./pages/Account";
import VetDashboard from "./pages/VetDashboard";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SecurityProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthGuard>
              <Routes>
                {/* Public routes (accessible to all authenticated users) */}
                <Route path="/" element={<Index />} />
                <Route path="/account" element={<Account />} />
                
                {/* Pet Owner routes */}
               
                <Route 
                  path="/pets" 
                  element={
                    <PetOwnerGuard>
                      <PetManagement />
                    </PetOwnerGuard>
                  } 
                />
            
                
                {/* Vet routes */}
                <Route 
                  path="/vetdb" 
                  element={
                    <VetGuard>
                      <VetDashboard />
                    </VetGuard>
                  } 
                />
                
                {/* Admin routes */}
                <Route 
                  path="/admindb" 
                  element={
                    <AdminGuard>
                      <AdminDashboard />
                    </AdminGuard>
                  } 
                />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthGuard>
          </BrowserRouter>
        </TooltipProvider>
      </SecurityProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
