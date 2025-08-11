import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Key, 
  Shield, 
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getUserSecurityQuestions,
  resetPasswordWithSecurityQuestions,
  SECURITY_QUESTIONS
} from '@/services/passwordManagement';
import { validatePassword } from '@/lib/passwordValidation';

interface PasswordResetProps {
  onBack: () => void;
}

const PasswordReset: React.FC<PasswordResetProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<{
    id: string;
    question: string;
    example?: string;
  } | null>(null);
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));
  const [error, setError] = useState('');

  const { toast } = useToast();

  // Select a random security question on component mount
  React.useEffect(() => {
    const randomIndex = Math.floor(Math.random() * SECURITY_QUESTIONS.length);
    setSelectedQuestion(SECURITY_QUESTIONS[randomIndex]);
  }, []);

  // Password strength helper functions
  const getPasswordStrength = (password: string): string => {
    if (!password) return 'none';
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return passwordValidation.isValid ? 'strong' : 'medium';
  };

  const getPasswordStrengthColor = (strength: string): string => {
    switch (strength) {
      case 'weak': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'strong': return 'text-green-600';
      default: return 'text-gray-400';
    }
  };

  const getPasswordStrengthBg = (strength: string): string => {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    // Check that the security question is answered
    if (!selectedQuestion) {
      setError("No security question available");
      return;
    }

    if (!answer.trim()) {
      setError("Please answer the security question");
      return;
    }

    // Validate new password
    if (!newPassword.trim()) {
      setError("Please enter a new password");
      return;
    }

    if (!passwordValidation.isValid) {
      setError("Please enter a valid password that meets all requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const answeredQuestions = [{
        questionId: selectedQuestion.id,
        answer: answer.trim()
      }];

      const result = await resetPasswordWithSecurityQuestions(email, answeredQuestions, newPassword);
      
      if (result.success) {
        toast({
          title: "Security Questions Verified",
          description: "A secure password reset link has been sent to your email. Click the link to complete the password reset with your new password.",
        });
        onBack();
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      setError("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            Password Reset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              Enter your email, answer the security question, and set your new password. After verification, you'll receive a secure email link to complete the reset.
            </AlertDescription>
          </Alert>

          <form onSubmit={handlePasswordReset} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
              />
            </div>

            {/* Security Question - Single Random Question */}
            {selectedQuestion && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Security Question</Label>
                <p className="text-sm text-gray-600">
                  Please answer this security question to verify your identity.
                </p>
                <div className="space-y-2 p-4 border rounded-lg">
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                    {selectedQuestion.question}
                  </p>
                  {selectedQuestion.example && (
                    <p className="text-xs text-gray-500 italic">
                      {selectedQuestion.example}
                    </p>
                  )}
                  <Input
                    type="text"
                    placeholder="Your answer..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordValidation(validatePassword(e.target.value));
                  }}
                  placeholder="Enter new password"
                  className={newPassword && !passwordValidation.isValid ? "border-red-500" : ""}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthBg(getPasswordStrength(newPassword))}`}
                        style={{ 
                          width: passwordValidation.isValid ? '100%' : 
                                 passwordValidation.errors.length <= 2 ? '66%' : '33%' 
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getPasswordStrengthColor(getPasswordStrength(newPassword))}`}>
                      {getPasswordStrength(newPassword).charAt(0).toUpperCase() + getPasswordStrength(newPassword).slice(1)}
                    </span>
                  </div>
                  
                  {/* Password requirements */}
                  <div className="text-xs space-y-1">
                    <p className="font-medium text-gray-700 mb-2">Password must contain:</p>
                    <div className="grid grid-cols-1 gap-1">
                      <div className={newPassword && newPassword.length > 9 ? "text-green-600" : "text-gray-500"}>
                        {newPassword && newPassword.length > 9 ? "✓" : "○"} More than 9 characters
                      </div>
                      <div className={newPassword && /[A-Z]/.test(newPassword) ? "text-green-600" : "text-gray-500"}>
                        {newPassword && /[A-Z]/.test(newPassword) ? "✓" : "○"} One uppercase letter (A-Z)
                      </div>
                      <div className={newPassword && /[a-z]/.test(newPassword) ? "text-green-600" : "text-gray-500"}>
                        {newPassword && /[a-z]/.test(newPassword) ? "✓" : "○"} One lowercase letter (a-z)
                      </div>
                      <div className={newPassword && /\d/.test(newPassword) ? "text-green-600" : "text-gray-500"}>
                        {newPassword && /\d/.test(newPassword) ? "✓" : "○"} One number (0-9)
                      </div>
                      <div className={newPassword && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? "text-green-600" : "text-gray-500"}>
                        {newPassword && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? "✓" : "○"} One special character (!@#$%^&*)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={confirmPassword && newPassword !== confirmPassword ? "border-red-500" : ""}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </p>
            )}

            <div className="flex space-x-2">
              <Button variant="outline" onClick={onBack} className="flex-1" type="button">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
              <Button 
                type="submit"
                disabled={
                  loading || 
                  !selectedQuestion ||
                  !answer.trim() ||
                  !passwordValidation.isValid || 
                  newPassword !== confirmPassword
                } 
                className="flex-1"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordReset;
