import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { signIn, signUp, signInWithGoogle } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Stethoscope, Shield } from 'lucide-react';
import { UserRole } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('pet_owner');
  const [vetLicenseNumber, setVetLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

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
      setError(''); // Clear previous errors

      try {
        if (isSignUp) {
          await signUp({
            email,
            password,
            role: selectedRole,
            displayName,
            ...(selectedRole === 'vet' && {
              vetLicenseNumber,
              specialization,
            }),
          });
          toast({
            title: "Account created successfully!",
            description: "Welcome to PetVet!",
          });
        } else {
          await signIn(email, password);
          toast({
            title: "Welcome back!",
            description: "You've been signed in successfully.",
          });
        }
      } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          setError('Invalid username/password');
        } else if (error.code === 'auth/email-already-in-use') {
          setError('Email already in use');
        } else if (error.code === 'auth/weak-password') {
          setError('Password should be at least 6 characters');
        } else if (error.code === 'auth/invalid-email') {
          setError('Invalid email address');
        } else {
          setError('Error: please try again');
        }
      } finally {
        setIsSubmitting(false);
      }
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

    return (
      <div className="min-h-screen flex items-center justify-center p-4 gradient-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <p className="text-muted-foreground">
              {isSignUp ? 'Join PetVet to manage your pet\'s health' : 'Sign in to your PetVet account'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

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
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
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
            <Button
              variant="link"
              className="w-full"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(''); // Clear errors when switching between sign up/sign in
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