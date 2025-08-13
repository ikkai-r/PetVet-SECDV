import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { signIn, signUp, signInWithGoogle, getLastLoginAttempt } from '@/services/auth';
import { setupSecurityQuestions, SECURITY_QUESTIONS } from '@/services/passwordManagement';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Stethoscope, Shield, Eye, EyeOff, ArrowLeft, Plus, X } from 'lucide-react';
import PasswordReset from '@/components/PasswordReset';
import { UserRole } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validatePassword, getPasswordStrength, getPasswordStrengthColor, getPasswordStrengthBg } from '@/lib/passwordValidation';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpStep, setSignUpStep] = useState(1); // 1: Account info, 2: Security questions
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('pet_owner');
  const [vetLicenseNumber, setVetLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({ isValid: true, errors: [] });
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  
  // Security questions state - now using fixed questions
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({
    first_pet_detail: '',
    childhood_friend: '',
    birth_hospital: ''
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError('');

      try {
        if (isSignUp && signUpStep === 1) {
          // Step 1: Just validate form and move to step 2
          if (!passwordValidation.isValid) {
            setError(passwordValidation.errors[0]);
            setIsSubmitting(false);
            return;
          }

          // Move to step 2 without creating account yet
          setSignUpStep(2);
          setIsSubmitting(false);
          return;
        } else if (isSignUp && signUpStep === 2) {
          // Step 2: Validate security questions, create account, and setup security questions
          const requiredQuestions = SECURITY_QUESTIONS.map(q => q.id);
          const incompleteAnswers = requiredQuestions.filter(qId => !questionAnswers[qId] || questionAnswers[qId].trim().length < 5);
          
          if (incompleteAnswers.length > 0) {
            setError('Please provide detailed answers (at least 5 characters) for all security questions');
            setIsSubmitting(false);
            return;
          }

          // Create the Firebase account first
          const newUser = await signUp({
            email,
            password,
            role: selectedRole,
            displayName,
            ...(selectedRole === 'vet' && {
              vetLicenseNumber,
              specialization,
            }),
          });

          // Setup security questions - use all 3 fixed questions
          const questionsData = requiredQuestions.map(questionId => ({
            questionId,
            answer: questionAnswers[questionId].trim()
          }));
          
          await setupSecurityQuestions(newUser.uid, questionsData);
          
          console.log('Account created and security questions set up successfully');
          
          // Reset form and complete signup
          resetForm();
          setIsSubmitting(false);
          return;
        } else {
          // Regular sign in
          await signIn(email, password);

          toast({
            title: "Welcome back!",
            description: "You've been signed in successfully.",
          });

          const lastLoginAttempt = await getLastLoginAttempt(email);
          if (lastLoginAttempt) {
            toast({
              title: lastLoginAttempt.success ? "Last Login Successful" : "Last Login Failed",
              description: `Date: ${lastLoginAttempt.timestamp}`,
              variant: lastLoginAttempt.success ? "default" : "destructive"
            });
          }
        }
      } catch (error: any) {
        if (error.code === 'auth/account-locked') {
          setError(error.message);
        } else if (error.code === 'auth/too-many-requests') {
          setError('Error too many requests. Please try again later.');
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          setError('Invalid username/password');
        } else if (error.code === 'auth/email-already-in-use') {
          setError('Email already in use');
        } else if (error.code === 'auth/invalid-email') {
          setError('Invalid email address');
        } else if (error.message) {
          setError(error.message);
        } else {
          setError('Error: please try again');
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    const updateAnswer = (questionId: string, answer: string) => {
      setQuestionAnswers({ ...questionAnswers, [questionId]: answer });
      setError('');
    };

    const goBackToAccountInfo = () => {
      setSignUpStep(1);
      setError('');
    };

    const resetForm = () => {
      setIsSignUp(false);
      setSignUpStep(1);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setSelectedRole('pet_owner');
      setVetLicenseNumber('');
      setSpecialization('');
      setQuestionAnswers({
        first_pet_detail: '',
        childhood_friend: '',
        birth_hospital: ''
      });
      setCreatedUser(null);
      setShowPasswordReset(false);
      setError('');
    };

    const handleGoogleSignIn = async () => {
      setError(''); // Clear previous errors
      try {
        await signInWithGoogle(selectedRole);
        toast({
          title: "Welcome!",
          description: "You've been signed in with Google.",
        });
      } catch (error: any) {
        setError('Error: please try again');
      }
    };

    const getRoleIcon = (role: UserRole) => {
      switch (role) {
        case 'pet_owner':
          return <User className="w-4 h-4" />;
        case 'vet':
          return <Stethoscope className="w-4 h-4" />;
      }
    };

    const getRoleDescription = (role: UserRole) => {
      switch (role) {
        case 'pet_owner':
          return 'Manage your pets and schedule appointments';
        case 'vet':
          return 'Provide vet services and manage appointments';
      }
    };

    // Show password reset component if requested
    if (showPasswordReset) {
      return <PasswordReset onBack={() => setShowPasswordReset(false)} />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4 gradient-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isSignUp && signUpStep === 2 ? 'Security Questions' : isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <p className="text-muted-foreground">
              {isSignUp && signUpStep === 2 
                ? 'Set up security questions to protect your account' 
                : isSignUp 
                ? 'Join PetVet to manage your pet\'s health' 
                : 'Sign in to your PetVet account'
              }
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Security Questions Setup (Step 2 of signup) */}
              {isSignUp && signUpStep === 2 ? (
                <>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Please answer all 3 security questions. These will help verify your identity if you need to reset your password.
                    </p>
                    
                    {/* Fixed Security Questions */}
                    {SECURITY_QUESTIONS.map((question, index) => (
                      <div key={question.id} className="space-y-3 p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor={`question-${question.id}`} className="text-sm font-medium">
                            Question {index + 1}
                          </Label>
                          <p className="text-sm text-gray-700 font-medium">
                            {question.question}
                          </p>
                          {question.example && (
                            <p className="text-xs text-gray-500 italic">
                              {question.example}
                            </p>
                          )}
                        </div>
                        
                        <Input
                          id={`question-${question.id}`}
                          type="text"
                          placeholder="Enter your answer..."
                          value={questionAnswers[question.id] || ''}
                          onChange={(e) => updateAnswer(question.id, e.target.value)}
                          className="w-full"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Regular Sign Up/Sign In Form */
                <>
                  {isSignUp && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="role">Account Type</Label>
                        <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pet_owner">
                              <div className="flex items-center gap-2">
                                {getRoleIcon('pet_owner')}
                                <div>
                                  <div className="font-medium">Pet Owner</div>
                                  <div className="text-sm text-muted-foreground">
                                    {getRoleDescription('pet_owner')}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="vet">
                              <div className="flex items-center gap-2">
                                {getRoleIcon('vet')}
                                <div>
                                  <div className="font-medium">Veterinarian</div>
                                  <div className="text-sm text-muted-foreground">
                                    {getRoleDescription('vet')}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                       
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="displayName">Name</Label>
                        <Input
                          id="displayName"
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          required
                        />
                      </div>

                      {selectedRole === 'vet' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="vetLicense">Veterinary License Number</Label>
                            <Input
                              id="vetLicense"
                              type="text"
                              value={vetLicenseNumber}
                              onChange={(e) => setVetLicenseNumber(e.target.value)}
                              placeholder="Enter your license number"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="specialization">Specialization</Label>
                            <Input
                              id="specialization"
                              type="text"
                              value={specialization}
                              onChange={(e) => setSpecialization(e.target.value)}
                              placeholder="e.g., Small Animal Medicine, Surgery"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          // Only validate password for signup
                          if (isSignUp) {
                            setPasswordValidation(validatePassword(e.target.value));
                          }
                        }}
                        required
                        className={isSignUp && password && !passwordValidation.isValid ? "border-red-500" : ""}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {/* Password requirements for signup - always visible */}
                    {isSignUp && (
                      <div className="space-y-2">
                        {password && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthBg(getPasswordStrength(password))}`}
                                style={{ 
                                  width: passwordValidation.isValid ? '100%' : 
                                         passwordValidation.errors.length <= 2 ? '66%' : '33%' 
                                }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${getPasswordStrengthColor(getPasswordStrength(password))}`}>
                              {getPasswordStrength(password).charAt(0).toUpperCase() + getPasswordStrength(password).slice(1)}
                            </span>
                          </div>
                        )}
                        
                        {/* Password requirements - always visible during signup */}
                        <div className="text-xs space-y-1">
                          <p className="font-medium text-gray-700 mb-2">Password must contain:</p>
                          <div className="grid grid-cols-1 gap-1">
                            <div className={password && password.length > 9 ? "text-green-600" : "text-gray-500"}>
                              {password && password.length > 9 ? "✓" : "○"} More than 9 characters
                            </div>
                            <div className={password && /[A-Z]/.test(password) ? "text-green-600" : "text-gray-500"}>
                              {password && /[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter (A-Z)
                            </div>
                            <div className={password && /[a-z]/.test(password) ? "text-green-600" : "text-gray-500"}>
                              {password && /[a-z]/.test(password) ? "✓" : "○"} One lowercase letter (a-z)
                            </div>
                            <div className={password && /\d/.test(password) ? "text-green-600" : "text-gray-500"}>
                              {password && /\d/.test(password) ? "✓" : "○"} One number (0-9)
                            </div>
                            <div className={password && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-green-600" : "text-gray-500"}>
                              {password && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "✓" : "○"} One special character (!@#$%^&*)
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </p>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSignUp && signUpStep === 2 
                  ? 'Complete Account Setup' 
                  : isSignUp 
                  ? 'Continue' 
                  : 'Sign In'
                }
              </Button>
              
              {/* Back button for security questions step */}
              {isSignUp && signUpStep === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setSignUpStep(1)}
                  disabled={isSubmitting}
                >
                  Back to Account Details
                </Button>
              )}
            </form>
            {/* Divider 
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            {isSignUp && (
              <div className="space-y-2">
                <Label>Google Sign-up Role</Label>
                <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pet_owner">Pet Owner</SelectItem>
                    <SelectItem value="vet">Veterinarian</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
            >
              Google
            </Button>
            */}
            
            {/* Forgot Password Link - only show during sign in */}
            {!isSignUp && (
              <Button
                variant="link"
                className="w-full text-sm"
                onClick={() => setShowPasswordReset(true)}
              >
                Forgot your password?
              </Button>
            )}
            
            <Button
              variant="link"
              className="w-full"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(''); // Clear errors when switching between sign up/sign in
                setSignUpStep(1); // Reset signup step
                setQuestionAnswers({
                  first_pet_detail: '',
                  childhood_friend: '',
                  birth_hospital: ''
                }); // Reset answers
              }}
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : 'Need an account? Sign up'
              }
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};