import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  History,
  Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getLastLoginInfo } from '@/services/passwordManagement';

const SecurityStatus: React.FC = () => {
  const [loginInfo, setLoginInfo] = useState<{
    lastSuccessfulLogin?: Date;
    recentFailedAttempts: number;
  }>({ recentFailedAttempts: 0 });
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      loadLoginInfo();
    }
  }, [user]);

  const loadLoginInfo = async () => {
    if (!user?.uid) return;

    try {
      const info = await getLastLoginInfo(user.uid);
      setLoginInfo(info);
    } catch (error) {
      console.error('Error loading login info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-gray-600">Loading security status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Security Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last Login Info */}
        {loginInfo.lastSuccessfulLogin && (
          <Alert>
            <History className="w-4 h-4" />
            <AlertDescription>
              <div className="flex flex-col space-y-1">
                <span className="font-medium">Last successful login:</span>
                <span className="text-sm text-gray-600">
                  {loginInfo.lastSuccessfulLogin.toLocaleString()}
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Failed Attempts Warning */}
        {loginInfo.recentFailedAttempts > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="flex flex-col space-y-1">
                <span className="font-medium">Security Alert:</span>
                <span className="text-sm">
                  {loginInfo.recentFailedAttempts} failed login attempt(s) in the last 24 hours.
                  If this wasn't you, please change your password immediately.
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Security Tips */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <span className="font-medium">Security Reminders:</span>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Change your password regularly (minimum 24 hours between changes)</li>
                <li>Don't reuse your last 5 passwords</li>
                <li>Monitor your login activity for suspicious attempts</li>
                <li>Use a strong password with numbers, symbols, and mixed case</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* Security Score */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium">Account Security</span>
          </div>
          <Badge variant={loginInfo.recentFailedAttempts === 0 ? "default" : "destructive"}>
            {loginInfo.recentFailedAttempts === 0 ? "Good" : "Needs Attention"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityStatus;
