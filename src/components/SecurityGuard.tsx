import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasSecurityQuestionsSetup } from '@/services/passwordManagement';
import SecurityQuestionsSetup from './SecurityQuestionsSetup';
import { Loader2 } from 'lucide-react';

interface SecurityGuardProps {
  children: React.ReactNode;
}

const SecurityGuard: React.FC<SecurityGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [hasQuestions, setHasQuestions] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSecuritySetup = async () => {
      if (!user) {
        console.log('🔍 SecurityGuard: No user, setting loading to false');
        setLoading(false);
        return;
      }

      console.log('🔍 SecurityGuard: Checking security setup for user:', user.uid);
      try {
        const questionsExist = await hasSecurityQuestionsSetup(user.uid);
        console.log('🔍 SecurityGuard: Security questions exist:', questionsExist);
        setHasQuestions(questionsExist);
      } catch (error) {
        console.error('❌ SecurityGuard: Error checking security questions:', error);
        setHasQuestions(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      console.log('🔍 SecurityGuard: Auth not loading and user exists, checking security setup');
      checkSecuritySetup();
    } else if (!authLoading && !user) {
      console.log('🔍 SecurityGuard: Auth not loading and no user');
      setLoading(false);
    } else {
      console.log('🔍 SecurityGuard: Auth still loading or waiting for user');
    }
  }, [user, authLoading]);

  const handleSecuritySetupComplete = () => {
    console.log('✅ SecurityGuard: Security setup completed');
    setHasQuestions(true);
  };

  console.log('🔍 SecurityGuard render:', { 
    authLoading, 
    loading, 
    user: !!user, 
    hasQuestions,
    userId: user?.uid 
  });

  if (authLoading || loading) {
    console.log('🔍 SecurityGuard: Showing loader');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // If user is authenticated but hasn't set up security questions, show setup
  if (user && hasQuestions === false) {
    console.log('🔍 SecurityGuard: Showing security questions setup');
    return <SecurityQuestionsSetup onComplete={handleSecuritySetupComplete} />;
  }

  // Otherwise, show the protected content
  console.log('🔍 SecurityGuard: Showing protected content');
  return <>{children}</>;
};

export default SecurityGuard;
