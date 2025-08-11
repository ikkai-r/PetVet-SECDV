import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  getAccountSecurityStatus, 
  adminUnlockAccount, 
  cleanupOldSecurityRecords,
  SECURITY_CONFIG,
  getSecurityAudit
} from '@/lib/accountSecurity';
import { AdminGuard } from '@/components/RoleGuard';
import PasswordManagement from '@/components/PasswordManagement';
import { Shield, Lock, Unlock, RefreshCw, AlertTriangle, CheckCircle, Clock, Key } from 'lucide-react';

interface SecurityStatus {
  recentFailedAttempts: number;
  isLocked: boolean;
  lockoutInfo?: any;
}

export const AccountSecurityManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const securityAudit = getSecurityAudit();

  const checkAccountSecurity = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const status = await getAccountSecurityStatus(email);
      setSecurityStatus(status);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check account security status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unlockAccount = async () => {
    if (!email.trim() || !user?.email) return;

    setIsLoading(true);
    try {
      const success = await adminUnlockAccount(email, user.email);
      if (success) {
        toast({
          title: "Success",
          description: "Account has been unlocked",
        });
        // Refresh status
        await checkAccountSecurity();
      } else {
        toast({
          title: "Error",
          description: "Failed to unlock account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlock account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performCleanup = async () => {
    setIsCleaningUp(true);
    try {
      await cleanupOldSecurityRecords();
      toast({
        title: "Success",
        description: "Old security records have been cleaned up",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clean up security records",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Account Security Management</h1>
      </div>

      <Tabs defaultValue="admin" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin">Admin Security</TabsTrigger>
          <TabsTrigger value="personal">Personal Security</TabsTrigger>
        </TabsList>

        {/* Admin Security Tab */}
        <TabsContent value="admin">
          <AdminGuard>
            <div className="space-y-6">
              {/* Security Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Security Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{securityAudit.maxFailedAttempts}</div>
                    <div className="text-sm text-gray-600">Max Failed Attempts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{securityAudit.baseLockoutMinutes}m</div>
                    <div className="text-sm text-gray-600">Base Lockout Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{securityAudit.maxLockoutMinutes}m</div>
                    <div className="text-sm text-gray-600">Max Lockout Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{securityAudit.attemptWindowMinutes}m</div>
                    <div className="text-sm text-gray-600">Attempt Window</div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Security Checker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Check Account Security Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email to check"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={checkAccountSecurity}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Check Status
                </Button>
              </div>
            </div>

            {securityStatus && (
              <div className="space-y-4">
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {securityStatus.recentFailedAttempts}
                        </div>
                        <div className="text-sm text-gray-600">Recent Failed Attempts</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${securityStatus.isLocked ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="flex justify-center mb-2">
                          {securityStatus.isLocked ? 
                            <Lock className="w-8 h-8 text-red-600" /> : 
                            <Unlock className="w-8 h-8 text-green-600" />
                          }
                        </div>
                        <div className="text-sm font-medium">
                          {securityStatus.isLocked ? 'LOCKED' : 'UNLOCKED'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {securityStatus.lockoutInfo && (
                    <Card className="border-2 border-purple-200 bg-purple-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            #{securityStatus.lockoutInfo.lockoutCount}
                          </div>
                          <div className="text-sm text-gray-600">Lockout Count</div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {securityStatus.isLocked && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This account is currently locked due to multiple failed login attempts.
                      {securityStatus.lockoutInfo && (
                        <div className="mt-2 space-y-1 text-sm">
                          <div>Locked at: {new Date(securityStatus.lockoutInfo.lockedAt.toDate()).toLocaleString()}</div>
                          <div>Unlock at: {new Date(securityStatus.lockoutInfo.unlockAt.toDate()).toLocaleString()}</div>
                          <div>Failed attempts: {securityStatus.lockoutInfo.failedAttempts}</div>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {securityStatus.isLocked && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={unlockAccount}
                      disabled={isLoading}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Unlock className="w-4 h-4" />
                      Admin Unlock Account
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              System Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Cleanup Old Security Records</h3>
                <p className="text-sm text-gray-600">
                  Remove login attempt records older than 24 hours to maintain database performance.
                </p>
              </div>
              <Button 
                onClick={performCleanup}
                disabled={isCleaningUp}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isCleaningUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Cleanup Records
              </Button>
            </div>
          </CardContent>
        </Card>

              {/* Security Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Security Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(securityAudit.features).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center gap-3">
                        <Badge variant={enabled ? "default" : "secondary"}>
                          {enabled ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                          {enabled ? 'ENABLED' : 'DISABLED'}
                        </Badge>
                        <span className="text-sm capitalize">
                          {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </AdminGuard>
        </TabsContent>

        {/* Personal Security Tab */}
        <TabsContent value="personal">
          <PasswordManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};
