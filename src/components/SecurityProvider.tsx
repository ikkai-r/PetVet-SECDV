import { createContext, useContext, ReactNode } from 'react';
import { sanitizeInput } from '@/lib/validation';

interface SecurityContextType {
  sanitizeInput: (input: string) => string;
  validateFileUpload: (file: File) => boolean;
  isRateLimited: () => boolean;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: ReactNode;
}

// Simple rate limiting - in production, use Redis or similar
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const isRateLimited = (): boolean => {
  const key = 'global'; // In real app, use user ID or IP
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return false;
  }
  
  if (limit.count >= 60) { // 60 requests per minute
    return true;
  }
  
  limit.count++;
  return false;
};

const validateFileUpload = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
};

export const SecurityProvider = ({ children }: SecurityProviderProps) => {
  const value = {
    sanitizeInput,
    validateFileUpload,
    isRateLimited,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};