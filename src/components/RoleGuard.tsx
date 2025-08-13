import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, AlertTriangle } from 'lucide-react';
import { logEvent } from '@/services/adminService';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  requireVerification?: boolean;
}

export const RoleGuard = ({ 
  children, 
  allowedRoles, 
  fallback,
  requireVerification = false 
}: RoleGuardProps) => {
  const { user } = useAuth();

  if (!user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldX className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Please sign in to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    const date = new Date();
    const timestamp = date.toLocaleDateString() + " " + date.toLocaleTimeString();
        
    logEvent(
        "Access Control",
        timestamp,
        "Unauthorized access attempt to a page requiring roles: " + allowedRoles.join(", "),
        user.email,
        false
    );

    return fallback || (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ShieldX className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
              Go back to the <a href="/" className="text-primary underline">home page</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

// Convenience components for specific roles
export const PetOwnerGuard = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => (
  <RoleGuard allowedRoles={['pet_owner']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const VetGuard = ({ children, fallback, requireVerification = true }: { 
  children: ReactNode; 
  fallback?: ReactNode;
  requireVerification?: boolean;
}) => (
  <RoleGuard allowedRoles={['vet']} fallback={fallback} requireVerification={requireVerification}>
    {children}
  </RoleGuard>
);

export const AdminGuard = ({ children, fallback, requireVerification = true }: { 
  children: ReactNode; 
  fallback?: ReactNode;
  requireVerification?: boolean;
}) => (
  <RoleGuard allowedRoles={['admin']} fallback={fallback} requireVerification={requireVerification}>
    {children}
  </RoleGuard>
);

export const VetOrAdminGuard = ({ children, fallback, requireVerification = true }: { 
  children: ReactNode; 
  fallback?: ReactNode;
  requireVerification?: boolean;
}) => (
  <RoleGuard allowedRoles={['vet', 'admin']} fallback={fallback} requireVerification={requireVerification}>
    {children}
  </RoleGuard>
);
