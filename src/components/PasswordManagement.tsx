import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lock, 
  Key, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/lib/firebase';
import { 
  changePassword,
  setupSecurityQuestions,
  SECURITY_QUESTIONS,
  SecurityQuestion,
  canChangePassword
} from '@/services/passwordManagement';
import { 
  validatePassword, 
  getPasswordStrength, 
  getPasswordStrengthColor, 
  getPasswordStrengthBg 
} from '@/lib/passwordValidation';

const PasswordManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordValidation, setPasswordValidation] = useState({ isValid: true, errors: [] });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Security questions form
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [securityQuestionsSetup, setSecurityQuestionsSetup] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

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
      toast({
        title: "Success",
        description: "Password changed successfully"
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      setError("Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addSecurityQuestion = () => {
    if (selectedQuestions.length >= 5) {
      toast({
        title: "Limit Reached",
        description: "You can select up to 5 security questions",
        variant: "destructive"
      });
      return;
    }
    setSelectedQuestions([...selectedQuestions, '']);
  };

  const updateSelectedQuestion = (index: number, questionId: string) => {
    const newSelected = [...selectedQuestions];
    newSelected[index] = questionId;
    setSelectedQuestions(newSelected);
  };

  const removeSecurityQuestion = (index: number) => {
    const questionId = selectedQuestions[index];
    const newSelected = selectedQuestions.filter((_, i) => i !== index);
    const newAnswers = { ...questionAnswers };
    delete newAnswers[questionId];
    
    setSelectedQuestions(newSelected);
    setQuestionAnswers(newAnswers);
  };

  const updateAnswer = (questionId: string, answer: string) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSetupSecurityQuestions = async () => {
    if (!user) return;

    const validQuestions = selectedQuestions.filter(id => id && questionAnswers[id]?.trim());
    
    if (validQuestions.length < 3) {
      toast({
        title: "Error",
        description: "Please answer at least 3 security questions",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const questionsData = validQuestions.map(questionId => ({
        questionId,
        answer: questionAnswers[questionId]
      }));

      await setupSecurityQuestions(user.uid, questionsData);
      toast({
        title: "Success",
        description: "Security questions setup completed"
      });
      setSecurityQuestionsSetup(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableQuestions = () => {
    return SECURITY_QUESTIONS.filter(q => !selectedQuestions.includes(q.id));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Security</h1>
        <p className="text-gray-600">Manage your password and security settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">Password Change</TabsTrigger>
          <TabsTrigger value="security">Security Questions</TabsTrigger>
        </TabsList>

        {/* Password Change Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  Choose a strong password that's at least 8 characters long and includes numbers, symbols, and both uppercase and lowercase letters.
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
                </div>

                <Button 
                  onClick={handlePasswordChange}
                  disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="w-full"
                >
                  {loading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Questions Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Security Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Security questions help recover your account if you forget your password. Choose questions with answers that are:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Memorable to you but not easily guessable by others</li>
                    <li>Specific and detailed (avoid common answers)</li>
                    <li>Unlikely to change over time</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {securityQuestionsSetup && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    Security questions have been set up for your account. You can update them by setting new ones below.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-6">
                {selectedQuestions.map((questionId, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <Label>Security Question {index + 1}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSecurityQuestion(index)}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    </div>
                    
                    <Select 
                      value={questionId} 
                      onValueChange={(value) => updateSelectedQuestion(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a security question" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableQuestions().map((question) => (
                          <SelectItem key={question.id} value={question.id}>
                            {question.question}
                          </SelectItem>
                        ))}
                        {questionId && (
                          <SelectItem value={questionId}>
                            {SECURITY_QUESTIONS.find(q => q.id === questionId)?.question}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>

                    {questionId && (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          Example: {SECURITY_QUESTIONS.find(q => q.id === questionId)?.example}
                        </div>
                        <Textarea
                          placeholder="Enter your answer (be specific and detailed)"
                          value={questionAnswers[questionId] || ''}
                          onChange={(e) => updateAnswer(questionId, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={addSecurityQuestion}
                    disabled={selectedQuestions.length >= 5 || getAvailableQuestions().length === 0}
                  >
                    Add Security Question
                  </Button>
                  
                  <Badge variant="secondary">
                    {selectedQuestions.filter(id => id && questionAnswers[id]?.trim()).length} of 3 minimum questions answered
                  </Badge>
                </div>

                <Button 
                  onClick={handleSetupSecurityQuestions}
                  disabled={loading || selectedQuestions.filter(id => id && questionAnswers[id]?.trim()).length < 3}
                  className="w-full"
                >
                  {loading ? 'Setting up...' : securityQuestionsSetup ? 'Update Security Questions' : 'Setup Security Questions'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PasswordManagement;
