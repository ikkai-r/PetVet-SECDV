import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  EyeOff,
  Info,
  Clock,
  History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { 
  changePassword,
  getLastLoginInfo,
  canChangePassword
} from '@/services/passwordManagement';
import { logEvent } from '@/services/adminService';
import { 
  validatePassword, 
  getPasswordStrength, 
  getPasswordStrengthColor, 
  getPasswordStrengthBg 
} from '@/lib/passwordValidation';

interface AccountPasswordChangeProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountPasswordChange: React.FC<AccountPasswordChangeProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [error, setError] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [canChange, setCanChange] = useState<{ allowed: boolean; reason?: string }>({ allowed: true });
  const [lastLoginInfo, setLastLoginInfo] = useState<{
    lastSuccessfulLogin?: Date;
    recentFailedAttempts: number;
  }>({ recentFailedAttempts: 0 });
  const [passwordValidation, setPasswordValidation] = useState({ isValid: true, errors: [] });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && auth.currentUser) {
      loadSecurityInfo();
    }
  }, [isOpen]);

  const loadSecurityInfo = async () => {
    if (!auth.currentUser) return;

    try {
      const [canChangeResult, loginInfo] = await Promise.all([
        canChangePassword(auth.currentUser.uid),
        getLastLoginInfo(auth.currentUser.uid)
      ]);
      
      setCanChange(canChangeResult);
      setLastLoginInfo(loginInfo);
    } catch (error) {
      console.error('Error loading security info:', error);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePasswordChange = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setError("No user authenticated");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (!passwordValidation.isValid) {
      setError("Password does not meet requirements");
      return;
    }

    setLoading(true);
    setError('');
    try {
      await changePassword(firebaseUser, passwordForm.currentPassword, passwordForm.newPassword);
      setStep('success');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      // Log password change event
      try {
        const date = new Date();
        await logEvent(
          'Password Change',
          date.toLocaleDateString() + " " + date.toLocaleTimeString(),
          'User changed password',
          firebaseUser.email || '',
          true
        );
      } catch (logError) {
        console.error('Failed to log password change event:', logError);
      }
    } catch (error: any) {
      // Use error.message from passwordManagement for user feedback
      setError(error.message || "Failed to change password. Please try again.");
       try {
        const date = new Date();
        await logEvent(
          'Password Change',
          date.toLocaleDateString() + " " + date.toLocaleTimeString(),
          error.message || 'Failed to change password',
          firebaseUser.email || '',
          false
        );
      } catch (logError) {
        console.error('Failed to log password change event:', logError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setError('');
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordValidation({ isValid: true, errors: [] });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            {step === 'form' ? 'Change Password' : 'Password Changed'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'form' ? (
          <div className="space-y-4">
            {/* Security Status */}
            <div className="space-y-2">
              {lastLoginInfo.lastSuccessfulLogin && (
                <Alert>
                  <History className="w-4 h-4" />
                  <AlertDescription>
                    Last successful login: {lastLoginInfo.lastSuccessfulLogin.toLocaleString()}
                    {lastLoginInfo.recentFailedAttempts > 0 && (
                      <div className="mt-1 text-orange-600">
                        ⚠️ {lastLoginInfo.recentFailedAttempts} failed login attempt(s) in the last 24 hours
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {!canChange.allowed && (
                <Alert variant="destructive">
                  <Clock className="w-4 h-4" />
                  <AlertDescription>{canChange.reason}</AlertDescription>
                </Alert>
              )}
            </div>

            {canChange.allowed && (
              <>
                <Alert>
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1 text-sm">
                      <div>• Re-authenticate with current password for security</div>
                      <div>• Cannot reuse your last 5 passwords</div>
                      <div>• Password can only be changed once every 24 hours</div>
                    </div>
                  </AlertDescription>
                </Alert>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                    {error}
                  </p>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => {
                          setPasswordForm({...passwordForm, currentPassword: e.target.value});
                          setError('');
                        }}
                        placeholder="Enter your current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          const newPassword = e.target.value;
                          setPasswordForm({...passwordForm, newPassword});
                          setPasswordValidation(validatePassword(newPassword));
                          setError('');
                        }}
                        placeholder="Enter your new password"
                        className={passwordForm.newPassword && !passwordValidation.isValid ? "border-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {passwordForm.newPassword && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthBg(getPasswordStrength(passwordForm.newPassword))}`}
                              style={{ 
                                width: passwordValidation.isValid ? '100%' : 
                                       passwordValidation.errors.length <= 2 ? '66%' : '33%' 
                              }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${getPasswordStrengthColor(getPasswordStrength(passwordForm.newPassword))}`}>
                            {getPasswordStrength(passwordForm.newPassword).charAt(0).toUpperCase() + getPasswordStrength(passwordForm.newPassword).slice(1)}
                          </span>
                        </div>
                        
                        {/* Password Requirements */}
                        <div className="text-xs space-y-1">
                          <p className="font-medium text-gray-700 mb-2">Password must contain:</p>
                          <div className="grid grid-cols-1 gap-1">
                            <div className={passwordForm.newPassword && passwordForm.newPassword.length > 9 ? "text-green-600" : "text-gray-500"}>
                              {passwordForm.newPassword && passwordForm.newPassword.length > 9 ? "✓" : "○"} More than 9 characters
                            </div>
                            <div className={passwordForm.newPassword && /[A-Z]/.test(passwordForm.newPassword) ? "text-green-600" : "text-gray-500"}>
                              {passwordForm.newPassword && /[A-Z]/.test(passwordForm.newPassword) ? "✓" : "○"} One uppercase letter (A-Z)
                            </div>
                            <div className={passwordForm.newPassword && /[a-z]/.test(passwordForm.newPassword) ? "text-green-600" : "text-gray-500"}>
                              {passwordForm.newPassword && /[a-z]/.test(passwordForm.newPassword) ? "✓" : "○"} One lowercase letter (a-z)
                            </div>
                            <div className={passwordForm.newPassword && /\d/.test(passwordForm.newPassword) ? "text-green-600" : "text-gray-500"}>
                              {passwordForm.newPassword && /\d/.test(passwordForm.newPassword) ? "✓" : "○"} One number (0-9)
                            </div>
                            <div className={passwordForm.newPassword && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordForm.newPassword) ? "text-green-600" : "text-gray-500"}>
                              {passwordForm.newPassword && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordForm.newPassword) ? "✓" : "○"} One special character (!@#$%^&*)
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => {
                          setPasswordForm({...passwordForm, confirmPassword: e.target.value});
                          setError('');
                        }}
                        placeholder="Confirm your new password"
                        className={passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword ? "border-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Password Changed Successfully</h3>
              <p className="text-sm text-gray-600 mt-2">
                Your password has been updated. You will need to use your new password for future logins.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'form' && canChange.allowed ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handlePasswordChange}
                disabled={loading || !canChange.allowed || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || !passwordValidation.isValid || passwordForm.newPassword !== passwordForm.confirmPassword}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </>
          ) : step === 'form' && !canChange.allowed ? null : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AccountPasswordChange;
