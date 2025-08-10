/**
 * Account Security - Brute Force Protection
 * ========================================
 * 
 * Implements account lockout after failed login attempts to prevent brute force attacks.
 * 
 * SECURITY POLICY:
 * - Lock account after 5 failed attempts
 * - Lockout duration: 15 minutes (prevents DoS, discourages brute force)
 * - Progressive lockout: subsequent lockouts increase duration
 * - Admin override capability for legitimate users
 * 
 * STORAGE:
 * - Failed attempts stored in Firestore with timestamps
 * - Automatic cleanup of old attempt records
 * - Lockout status tracked per user account
 */

import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface LoginAttempt {
  email: string;
  timestamp: Timestamp;
  attemptNumber: number; // Track how many attempts for this email
}

export interface AccountLockout {
  email: string;
  lockedAt: Timestamp;
  unlockAt: Timestamp;
  failedAttempts: number;
  lockoutCount: number; // Number of times this account has been locked
}

// Security configuration
export const SECURITY_CONFIG = {
  MAX_FAILED_ATTEMPTS: 3,
  BASE_LOCKOUT_MINUTES: 15,    // 15 minutes base lockout
  MAX_LOCKOUT_MINUTES: 120,    // 2 hours maximum lockout
  ATTEMPT_WINDOW_MINUTES: 60,  // Failed attempts expire after 1 hour
  PROGRESSIVE_MULTIPLIER: 2,   // Each subsequent lockout doubles duration
} as const;

/**
 * Record a failed login attempt
 */
export const recordFailedAttempt = async (email: string): Promise<void> => {
  try {
    console.log('🚨 Recording failed attempt for:', email);
    
    // Get current attempt count for this email
    const recentAttempts = await getRecentFailedAttempts(email);
    const attemptNumber = recentAttempts.length + 1;
    
    const attemptId = `${email}_${Date.now()}`;
    const attemptDoc = doc(db, 'loginAttempts', attemptId);
    
    const attempt: LoginAttempt = {
      email: email.toLowerCase(),
      timestamp: Timestamp.now(),
      attemptNumber,
    };
    
    console.log('💾 Saving attempt:', attempt);
    await setDoc(attemptDoc, attempt);
    console.log('✅ Failed attempt recorded successfully');
    
    // Check if account should be locked
    await checkAndLockAccount(email);
    
  } catch (error) {
    console.error('❌ Error recording failed attempt:', error);
    // Don't throw - security logging shouldn't break the app
  }
};

/**
 * Check if account should be locked and lock if necessary
 */
const checkAndLockAccount = async (email: string): Promise<void> => {
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

/**
 * Get recent failed attempts for an email
 */
const getRecentFailedAttempts = async (email: string): Promise<LoginAttempt[]> => {
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - SECURITY_CONFIG.ATTEMPT_WINDOW_MINUTES);
  
  console.log('🔍 Getting recent failed attempts for:', email);
  console.log('🕐 Cutoff time:', cutoffTime.toISOString());
  
  // Simplified query to avoid index requirement
  // We'll filter by email first, then filter by timestamp in memory
  const attemptsRef = collection(db, 'loginAttempts');
  const q = query(
    attemptsRef,
    where('email', '==', email.toLowerCase())
  );
  
  const snapshot = await getDocs(q);
  const cutoffTimestamp = Timestamp.fromDate(cutoffTime);
  
  // Filter by timestamp in memory to avoid composite index requirement
  const attempts = snapshot.docs
    .map(doc => doc.data() as LoginAttempt)
    .filter(attempt => attempt.timestamp.toMillis() > cutoffTimestamp.toMillis());
  
  console.log(`📋 Found ${attempts.length} recent attempts:`, attempts.map(a => ({ 
    email: a.email, 
    timestamp: a.timestamp.toDate().toISOString() 
  })));
  
  return attempts;
};

/**
 * Lock an account
 */
const lockAccount = async (email: string, failedAttempts: number): Promise<void> => {
  try {
    const lockoutDoc = doc(db, 'accountLockouts', email.toLowerCase());
    
    // Check for existing lockout to determine progressive penalty
    const existingLockout = await getDoc(lockoutDoc);
    const previousLockoutCount = existingLockout.exists() ? 
      (existingLockout.data() as AccountLockout).lockoutCount || 0 : 0;
    
    // Calculate lockout duration with progressive penalty
    const lockoutMinutes = Math.min(
      SECURITY_CONFIG.BASE_LOCKOUT_MINUTES * Math.pow(SECURITY_CONFIG.PROGRESSIVE_MULTIPLIER, previousLockoutCount),
      SECURITY_CONFIG.MAX_LOCKOUT_MINUTES
    );
    
    const lockedAt = Timestamp.now();
    const unlockAt = Timestamp.fromDate(new Date(Date.now() + (lockoutMinutes * 60 * 1000)));
    
    const lockout: AccountLockout = {
      email: email.toLowerCase(),
      lockedAt,
      unlockAt,
      failedAttempts,
      lockoutCount: previousLockoutCount + 1,
    };
    
    await setDoc(lockoutDoc, lockout);
    
    // Clean up failed attempts for this email
    await cleanupFailedAttempts(email);
    
    console.warn(`Account locked: ${email} for ${lockoutMinutes} minutes (lockout #${lockout.lockoutCount})`);
    
  } catch (error) {
    console.error('Error locking account:', error);
  }
};

/**
 * Check if an account is currently locked
 */
export const isAccountLocked = async (email: string): Promise<{ 
  isLocked: boolean; 
  unlockAt?: Date; 
  remainingMinutes?: number;
  lockoutCount?: number;
}> => {
  try {
    const lockoutDoc = doc(db, 'accountLockouts', email.toLowerCase());
    const snapshot = await getDoc(lockoutDoc);
    
    if (!snapshot.exists()) {
      return { isLocked: false };
    }
    
    const lockout = snapshot.data() as AccountLockout;
    const now = new Date();
    const unlockTime = lockout.unlockAt.toDate();
    
    if (now >= unlockTime) {
      // Lockout has expired, remove it
      await deleteDoc(lockoutDoc);
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
    return { isLocked: false }; // Fail open for user experience
  }
};

/**
 * Clear failed attempts for successful login
 */
export const clearFailedAttempts = async (email: string): Promise<void> => {
  try {
    await cleanupFailedAttempts(email);
    
    // Also remove any lockout
    const lockoutDoc = doc(db, 'accountLockouts', email.toLowerCase());
    const snapshot = await getDoc(lockoutDoc);
    if (snapshot.exists()) {
      await deleteDoc(lockoutDoc);
    }
    
  } catch (error) {
    console.error('Error clearing failed attempts:', error);
  }
};

/**
 * Admin function to unlock an account
 */
export const adminUnlockAccount = async (email: string, adminEmail: string): Promise<boolean> => {
  try {
    const lockoutDoc = doc(db, 'accountLockouts', email.toLowerCase());
    await deleteDoc(lockoutDoc);
    await cleanupFailedAttempts(email);
    
    // Log admin action
    console.log(`Admin ${adminEmail} unlocked account: ${email}`);
    
    return true;
  } catch (error) {
    console.error('Error unlocking account:', error);
    return false;
  }
};

/**
 * Get account security status for admin dashboard
 */
export const getAccountSecurityStatus = async (email: string): Promise<{
  recentFailedAttempts: number;
  isLocked: boolean;
  lockoutInfo?: AccountLockout;
}> => {
  try {
    const [recentAttempts, lockoutStatus] = await Promise.all([
      getRecentFailedAttempts(email),
      isAccountLocked(email)
    ]);
    
    let lockoutInfo;
    if (lockoutStatus.isLocked) {
      const lockoutDoc = doc(db, 'accountLockouts', email.toLowerCase());
      const snapshot = await getDoc(lockoutDoc);
      if (snapshot.exists()) {
        lockoutInfo = snapshot.data() as AccountLockout;
      }
    }
    
    return {
      recentFailedAttempts: recentAttempts.length,
      isLocked: lockoutStatus.isLocked,
      lockoutInfo,
    };
    
  } catch (error) {
    console.error('Error getting account security status:', error);
    return {
      recentFailedAttempts: 0,
      isLocked: false,
    };
  }
};

/**
 * Cleanup old failed attempts
 */
const cleanupFailedAttempts = async (email: string): Promise<void> => {
  try {
    const attemptsRef = collection(db, 'loginAttempts');
    const q = query(attemptsRef, where('email', '==', email.toLowerCase()));
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error cleaning up failed attempts:', error);
  }
};

/**
 * Periodic cleanup function to remove old records
 */
export const cleanupOldSecurityRecords = async (): Promise<void> => {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24); // Remove records older than 24 hours
    
    // Cleanup old failed attempts
    const attemptsRef = collection(db, 'loginAttempts');
    const oldAttemptsQuery = query(
      attemptsRef,
      where('timestamp', '<', Timestamp.fromDate(cutoffTime))
    );
    
    const oldAttempts = await getDocs(oldAttemptsQuery);
    const deletePromises = oldAttempts.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
    
    if (oldAttempts.size > 0) {
      console.log(`Cleaned up ${oldAttempts.size} old login attempt records`);
    }
    
  } catch (error) {
    console.error('Error during security records cleanup:', error);
  }
};

/**
 * Security audit information
 */
export const getSecurityAudit = () => {
  return {
    maxFailedAttempts: SECURITY_CONFIG.MAX_FAILED_ATTEMPTS,
    baseLockoutMinutes: SECURITY_CONFIG.BASE_LOCKOUT_MINUTES,
    maxLockoutMinutes: SECURITY_CONFIG.MAX_LOCKOUT_MINUTES,
    attemptWindowMinutes: SECURITY_CONFIG.ATTEMPT_WINDOW_MINUTES,
    progressiveMultiplier: SECURITY_CONFIG.PROGRESSIVE_MULTIPLIER,
    
    // Security features
    features: {
      bruteForceProtection: true,
      progressiveLockout: true,
      automaticUnlock: true,
      adminOverride: true,
      attemptLogging: true,
      ipTracking: false,
      automaticCleanup: true,
    }
  };
};
