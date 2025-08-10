/**
 * Standalone test script for brute force protection
 * Run this with: node testBruteForceStandalone.js
 */

// Mock Firebase for testing
const mockFirebase = {
  collection: () => ({
    doc: () =    for (let i = 1; i <= 6; i++) {
      console.log(`\n--- Recording failed attempt #${i} ---`);
      await recordFailedAttempt(testEmail);
      
      // Check status after each attempt
      const status = await isAccountLocked(testEmail);
      console.log(`After ${i} attempts:`, status);     set: async (data) => {
        console.log('📝 Mock: Recording failed attempt:', data);
        return Promise.resolve();
      }
    }),
    where: () => ({
      where: () => ({
        get: async () => {
          console.log('🔍 Mock: Querying attempts');
          // Simulate increasing failed attempts
          const mockAttempts = Array.from({ length: mockFailedAttempts }, (_, i) => ({
            data: () => ({
              email: 'test@example.com',
              timestamp: { toDate: () => new Date() }
            })
          }));
          mockFailedAttempts++;
          return { docs: mockAttempts };
        }
      })
    })
  }),
  doc: () => ({
    get: async () => {
      console.log('🔍 Mock: Checking lockout status');
      if (mockFailedAttempts >= 5) {
        return {
          exists: () => true,
          data: () => ({
            email: 'test@example.com',
            lockedAt: { toDate: () => new Date() },
            unlockAt: { toDate: () => new Date(Date.now() + 15 * 60 * 1000) },
            failedAttempts: mockFailedAttempts,
            lockoutCount: 1
          })
        };
      }
      return { exists: () => false };
    },
    set: async (data) => {
      console.log('🔒 Mock: Locking account:', data);
      return Promise.resolve();
    },
    delete: async () => {
      console.log('🧹 Mock: Clearing attempts');
      mockFailedAttempts = 0;
      return Promise.resolve();
    }
  }),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (date) => ({ toDate: () => date })
  }
};

let mockFailedAttempts = 0;

// Mock security configuration
const SECURITY_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  BASE_LOCKOUT_MINUTES: 15,
  MAX_LOCKOUT_MINUTES: 120,
  ATTEMPT_WINDOW_MINUTES: 60,
  PROGRESSIVE_MULTIPLIER: 2,
};

// Mock functions
const recordFailedAttempt = async (email) => {
  try {
    console.log('🚨 Recording failed attempt for:', email);
    const attemptId = `${email}_${Date.now()}`;
    
    const attempt = {
      email: email.toLowerCase(),
      timestamp: mockFirebase.Timestamp.now(),
      attemptNumber: 1,
    };
    
    console.log('💾 Saving attempt:', attempt);
    await mockFirebase.collection('loginAttempts').doc(attemptId).set(attempt);
    console.log('✅ Failed attempt recorded successfully');
    
    await checkAndLockAccount(email);
    
  } catch (error) {
    console.error('❌ Error recording failed attempt:', error);
  }
};

const checkAndLockAccount = async (email) => {
  console.log('🔍 Checking if account should be locked:', email);
  const recentAttempts = await getRecentFailedAttempts(email);
  console.log(`📊 Found ${recentAttempts.length} recent attempts (max: ${SECURITY_CONFIG.MAX_FAILED_ATTEMPTS})`);
  
  if (recentAttempts.length >= SECURITY_CONFIG.MAX_FAILED_ATTEMPTS) {
    console.log('🔒 Locking account due to too many attempts');
    await lockAccount(email, recentAttempts.length);
  } else {
    console.log('✅ Account not locked yet');
  }
};

const getRecentFailedAttempts = async (email) => {
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - SECURITY_CONFIG.ATTEMPT_WINDOW_MINUTES);
  
  console.log('🔍 Getting recent failed attempts for:', email);
  console.log('🕐 Cutoff time:', cutoffTime.toISOString());
  
  const snapshot = await mockFirebase.collection('loginAttempts').where('email', '==', email.toLowerCase()).where('timestamp', '>', mockFirebase.Timestamp.fromDate(cutoffTime)).get();
  const attempts = snapshot.docs.map(doc => doc.data());
  
  console.log(`📋 Found ${attempts.length} recent attempts`);
  return attempts;
};

const lockAccount = async (email, failedAttempts) => {
  try {
    const lockoutMinutes = Math.min(
      SECURITY_CONFIG.BASE_LOCKOUT_MINUTES * Math.pow(SECURITY_CONFIG.PROGRESSIVE_MULTIPLIER, 0),
      SECURITY_CONFIG.MAX_LOCKOUT_MINUTES
    );
    
    const lockedAt = mockFirebase.Timestamp.now();
    const unlockAt = mockFirebase.Timestamp.fromDate(new Date(Date.now() + (lockoutMinutes * 60 * 1000)));
    
    const lockout = {
      email: email.toLowerCase(),
      lockedAt,
      unlockAt,
      failedAttempts,
      lockoutCount: 1,
    };
    
    await mockFirebase.doc(`accountLockouts/${email.toLowerCase()}`).set(lockout);
    console.warn(`🔒 Account locked: ${email} for ${lockoutMinutes} minutes`);
    
  } catch (error) {
    console.error('Error locking account:', error);
  }
};

const isAccountLocked = async (email) => {
  try {
    const snapshot = await mockFirebase.doc(`accountLockouts/${email.toLowerCase()}`).get();
    
    if (!snapshot.exists()) {
      return { isLocked: false };
    }
    
    const lockout = snapshot.data();
    const now = new Date();
    const unlockTime = lockout.unlockAt.toDate();
    
    if (now >= unlockTime) {
      await mockFirebase.doc(`accountLockouts/${email.toLowerCase()}`).delete();
      return { isLocked: false };
    }
    
    const remainingMs = unlockTime.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    
    return {
      isLocked: true,
      unlockAt: unlockTime,
      remainingMinutes,
      lockoutCount: lockout.lockoutCount,
    };
    
  } catch (error) {
    console.error('Error checking account lockout:', error);
    return { isLocked: false };
  }
};

const clearFailedAttempts = async (email) => {
  try {
    await mockFirebase.doc(`accountLockouts/${email.toLowerCase()}`).delete();
    mockFailedAttempts = 0;
    console.log('🧹 Cleared failed attempts');
  } catch (error) {
    console.error('Error clearing failed attempts:', error);
  }
};

// Test function
const testBruteForceProtection = async (testEmail) => {
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

// Run the test
console.log('🚀 Starting Brute Force Protection Test...\n');
testBruteForceProtection('test-brute-force@example.com')
  .then(result => {
    console.log('\n✅ Test completed successfully!');
    console.log('Final result:', result);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
  });
