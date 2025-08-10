/**
 * Test the brute force protection manually
 * This is a debug utility to test the account security
 */

import { 
  recordFailedAttempt, 
  isAccountLocked, 
  clearFailedAttempts,
  SECURITY_CONFIG 
} from '@/lib/accountSecurity';

export const testBruteForceProtection = async (testEmail: string) => {
  console.log('🧪 Testing Brute Force Protection for:', testEmail);
  console.log('Configuration:', SECURITY_CONFIG);
  
  try {
    // Clear any existing attempts first
    await clearFailedAttempts(testEmail);
    console.log('✅ Cleared existing attempts');
    
    // Check initial status
    let status = await isAccountLocked(testEmail);
    console.log('Initial status:', status);
    
    // Record multiple failed attempts
    for (let i = 1; i <= 6; i++) {
      console.log(`\n--- Recording failed attempt #${i} ---`);
      await recordFailedAttempt(testEmail);
      
      // Check status after each attempt
      status = await isAccountLocked(testEmail);
      console.log(`After ${i} attempts:`, status);
      
      if (status.isLocked) {
        console.log(`🔒 Account locked after ${i} attempts!`);
        console.log(`Unlock time: ${status.unlockAt}`);
        console.log(`Remaining minutes: ${status.remainingMinutes}`);
        break;
      }
    }
    
    return status;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Test with a dummy email
export const runBruteForceTest = () => {
  const testEmail = 'test-brute-force@example.com';
  return testBruteForceProtection(testEmail);
};
