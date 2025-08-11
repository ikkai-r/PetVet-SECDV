import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Key, 
  Shield, 
  AlertCircle, 
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getUserSecurityQuestions,
  verifySecurityQuestions,
  resetPasswordWithSecurityQuestions
} from '@/services/passwordManagement';

interface PasswordResetProps {
  onBack: () => void;
}

const PasswordReset: React.FC<PasswordResetProps> = ({ onBack }) => {
  const [step, setStep] = useState<'email' | 'questions' | 'newPassword'>('email');
  const [email, setEmail] = useState('');
  const [securityQuestions, setSecurityQuestions] = useState<Array<{
    questionId: string;
    question: string;
  }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const questions = await getUserSecurityQuestions(email);
      setSecurityQuestions(questions);
      setStep('questions');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load security questions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionsSubmit = async () => {
    const answeredQuestions = securityQuestions
      .filter(q => answers[q.questionId]?.trim())
      .map(q => ({
        questionId: q.questionId,
        answer: answers[q.questionId]
      }));

    if (answeredQuestions.length < 2) {
      toast({
        title: "Error",
        description: "Please answer at least 2 security questions",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const verified = await verifySecurityQuestions(email, answeredQuestions);
      if (verified) {
        setStep('newPassword');
      } else {
        toast({
          title: "Error",
          description: "Security question verification failed. Please check your answers.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Verification failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const answeredQuestions = securityQuestions
        .filter(q => answers[q.questionId]?.trim())
        .map(q => ({
          questionId: q.questionId,
          answer: answers[q.questionId]
        }));

      await resetPasswordWithSecurityQuestions(email, answeredQuestions, newPassword);
      
      toast({
        title: "Password Reset Initiated",
        description: "Your password reset has been verified. Please check your email for further instructions.",
      });
      
      onBack();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Password reset failed",
        variant: "destructive"
      });
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
          {step === 'email' && (
            <>
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  Enter your email address to retrieve your security questions.
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={onBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
                <Button onClick={handleEmailSubmit} disabled={loading} className="flex-1">
                  {loading ? 'Loading...' : 'Continue'}
                </Button>
              </div>
            </>
          )}

          {step === 'questions' && (
            <>
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  Answer at least 2 of your security questions to verify your identity.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                {securityQuestions.map((question) => (
                  <div key={question.questionId}>
                    <Label>{question.question}</Label>
                    <Textarea
                      value={answers[question.questionId] || ''}
                      onChange={(e) => setAnswers(prev => ({
                        ...prev,
                        [question.questionId]: e.target.value
                      }))}
                      placeholder="Enter your answer"
                      className="min-h-[80px]"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setStep('email')} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleQuestionsSubmit} disabled={loading} className="flex-1">
                  {loading ? 'Verifying...' : 'Verify Answers'}
                </Button>
              </div>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  Security questions verified! Now enter your new password.
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setStep('questions')} className="flex-1">
                  Back
                </Button>
                <Button onClick={handlePasswordReset} disabled={loading} className="flex-1">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordReset;
