import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { SecurityProvider } from "@/components/SecurityProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import VetFinder from "./pages/VetFinder";
import PetManagement from "./pages/PetManagement";
import Scheduling from "./pages/Scheduling";
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
                <Route path="/" element={<Index />} />
                <Route path="/vet-finder" element={<VetFinder />} />
                <Route path="/pets" element={<PetManagement />} />
                <Route path="/schedule" element={<Scheduling />} />
                <Route path="/account" element={<Account />} />
                <Route path="/vetdb" element={<VetDashboard />} />
                <Route path="/admindb" element={<AdminDashboard />} />
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
