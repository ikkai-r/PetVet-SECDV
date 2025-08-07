import { useState, useCallback } from 'react';
import { useSecurity } from '@/components/SecurityProvider';

interface ValidationState {
  isValid: boolean;
  error?: string;
}

interface UseValidationReturn {
  validationState: ValidationState;
  validateInput: (value: string, fieldName?: string) => boolean;
  validateEmail: (value: string) => boolean;
  clearValidation: () => void;
}

/**
 * Custom hook for strict input validation
 * 
 * This hook implements a "reject, don't sanitize" approach:
 * - All validation failures result in input rejection
 * - No sanitization is performed
 * - Users must provide valid input or correct their mistakes
 * 
 * @returns Object with validation utilities
 */
export const useValidation = (): UseValidationReturn => {
  const [validationState, setValidationState] = useState<ValidationState>({ isValid: true });
  const security = useSecurity();

  const validateInput = useCallback((value: string, fieldName?: string): boolean => {
    const result = security.validateInput(value, fieldName);
    setValidationState(result);
    return result.isValid;
  }, [security]);

  const validateEmail = useCallback((value: string): boolean => {
    const result = security.validateEmail(value);
    setValidationState(result);
    return result.isValid;
  }, [security]);

  const clearValidation = useCallback(() => {
    setValidationState({ isValid: true });
  }, []);

  return {
    validationState,
    validateInput,
    validateEmail,
    clearValidation,
  };
};
