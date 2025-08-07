import { createContext, useContext, ReactNode } from 'react';
import { validateStrictInput, validateEmail } from '@/lib/validation';

interface SecurityContextType {
  validateInput: (input: string, fieldName?: string) => { isValid: boolean; error?: string };
  validateEmail: (email: string) => { isValid: boolean; error?: string };
  validateFileUpload: (file: File) => { isValid: boolean; error?: string };
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

const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed. Only JPEG, PNG, and WebP are supported.' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size too large. Maximum size is 5MB.' };
  }
  
  // Additional filename validation
  const fileNameCheck = validateStrictInput(file.name, 'Filename');
  if (!fileNameCheck.isValid) {
    return fileNameCheck;
  }
  
  return { isValid: true };
};

export const SecurityProvider = ({ children }: SecurityProviderProps) => {
  const value = {
    validateInput: validateStrictInput,
    validateEmail,
    validateFileUpload,
    isRateLimited,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};