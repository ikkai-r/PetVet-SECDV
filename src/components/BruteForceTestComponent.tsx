import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signIn } from '@/services/auth';
import { isAccountLocked, clearFailedAttempts } from '@/lib/accountSecurity';

export const BruteForceTestComponent = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('wrongpassword');
  const [attempts, setAttempts] = useState(0);
  const [lastError, setLastError] = useState('');
  const [lockStatus, setLockStatus] = useState<any>(null);

  const testLogin = async () => {
    try {
      setLastError('');
      console.log(`🧪 Test attempt #${attempts + 1} with email: ${email}`);
      
      await signIn(email, password);
      setLastError('Login successful (unexpected)');
    } catch (error: any) {
      console.log('❌ Login failed:', error);
      setAttempts(prev => prev + 1);
      setLastError(error.message || error.code || 'Unknown error');
      
      // Check lock status after error
      const status = await isAccountLocked(email);
      setLockStatus(status);
      console.log('🔒 Lock status:', status);
    }
  };

  const checkLockStatus = async () => {
    const status = await isAccountLocked(email);
    setLockStatus(status);
    console.log('🔍 Current lock status:', status);
  };

  const clearAttempts = async () => {
    await clearFailedAttempts(email);
    setAttempts(0);
    setLastError('');
    setLockStatus(null);
    console.log('🧹 Cleared failed attempts');
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>🧪 Brute Force Protection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Test Email:</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Wrong Password:</label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="wrongpassword"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={testLogin} variant="destructive" size="sm">
            Test Failed Login ({attempts}/5)
          </Button>
          <Button onClick={checkLockStatus} variant="outline" size="sm">
            Check Status
          </Button>
          <Button onClick={clearAttempts} variant="secondary" size="sm">
            Clear
          </Button>
        </div>

        {lastError && (
          <Alert>
            <AlertDescription>
              <strong>Last Error:</strong> {lastError}
            </AlertDescription>
          </Alert>
        )}

        {lockStatus && (
          <Alert variant={lockStatus.isLocked ? "destructive" : "default"}>
            <AlertDescription>
              <strong>Lock Status:</strong> {lockStatus.isLocked ? 'LOCKED' : 'UNLOCKED'}
              {lockStatus.isLocked && (
                <div className="mt-1">
                  <div>Remaining: {lockStatus.remainingMinutes} minutes</div>
                  <div>Unlock at: {lockStatus.unlockAt?.toLocaleString()}</div>
                  <div>Lockout count: {lockStatus.lockoutCount}</div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500">
          <p><strong>Instructions:</strong></p>
          <p>1. Click "Test Failed Login" 5 times</p>
          <p>2. After 5 attempts, account should be locked</p>
          <p>3. Check browser console for detailed logs</p>
        </div>
      </CardContent>
    </Card>
  );
};
