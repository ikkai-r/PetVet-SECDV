import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { signIn, signUp, signInWithGoogle } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      try {
        if (isSignUp) {
          await signUp(email, password);
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
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleGoogleSignIn = async () => {
      try {
        await signInWithGoogle();
        toast({
          title: "Welcome!",
          description: "You've been signed in with Google.",
        });
      } catch (error: any) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
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
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>
            
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
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
            >
              Google
            </Button>
            
            <Button
              variant="link"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
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