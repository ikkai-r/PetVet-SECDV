
import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { validatePassword } from '@/lib/passwordValidation';

// Security Questions with examples of good random answers
export const SECURITY_QUESTIONS = [
  {
    id: 'childhood_address',
    question: 'What was the house number and street name of your first childhood home?',
    example: 'e.g., "1847 Maple Grove Lane" (specific address is unique)'
  },
  {
    id: 'first_pet_detail',
    question: 'What was your first pet\'s name and the month you got them?',
    example: 'e.g., "Whiskers March" (combination is unique)'
  },
  {
    id: 'memorable_teacher',
    question: 'What was the full name of your most memorable teacher and what grade/subject?',
    example: 'e.g., "Mrs. Elizabeth Rodriguez 7th Grade Math" (full name + context)'
  },
  {
    id: 'childhood_friend',
    question: 'What was your childhood best friend\'s full name and their middle initial?',
    example: 'e.g., "Sarah M. Thompson" (full name with middle initial)'
  },
  {
    id: 'first_job_detail',
    question: 'What was your first job title and the name of your supervisor?',
    example: 'e.g., "Cashier under Manager David Kim" (specific details)'
  },
  {
    id: 'birth_hospital',
    question: 'What was the name of the hospital where you were born and the city?',
    example: 'e.g., "St. Mary\'s General Hospital Portland" (specific location)'
  },
  {
    id: 'dream_vacation',
    question: 'What was your dream vacation destination as a child and why?',
    example: 'e.g., "Japan because of anime culture" (personal + specific reason)'
  },
  {
    id: 'unique_talent',
    question: 'What unique skill or talent did you have as a child that few people knew about?',
    example: 'e.g., "Could solve Rubik\'s cube in 45 seconds" (specific achievement)'
  },
  {
    id: 'childhood_fear',
    question: 'What was your biggest childhood fear and how old were you when you overcame it?',
    example: 'e.g., "Heights until age 12 at summer camp" (specific age + context)'
  },
  {
    id: 'first_concert',
    question: 'What was the first concert or live performance you attended and who did you go with?',
    example: 'e.g., "Coldplay with my cousin Jessica" (specific event + person)'
  }
] as const;

export interface SecurityQuestion {
  questionId: string;
  question: string;
  hashedAnswer: string; // We'll store hashed answers for security
  createdAt: Date;
}

export interface UserSecurityProfile {
  userId: string;
  securityQuestions: SecurityQuestion[];
  lastPasswordChange: Date;
  passwordChangeHistory: Date[]; // Track password change frequency
  passwordHashes: string[]; // Store hashed versions of last 5 passwords to prevent reuse
  lastLoginAttempt?: Date;
  lastSuccessfulLogin?: Date;
  accountRecoveryEnabled: boolean;
}

export interface LoginRecord {
  userId: string;
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Hash security question answer for secure storage
 */
const hashAnswer = async (answer: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(answer.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Verify security question answer
 */
const verifyAnswer = async (answer: string, hashedAnswer: string): Promise<boolean> => {
  const hashedInput = await hashAnswer(answer);
  return hashedInput === hashedAnswer;
};

/**
 * Change user password with current password verification and security checks
 */
export const changePassword = async (
  user: FirebaseUser,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  try {
    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if user can change password (24 hour minimum age)
    const canChange = await canChangePassword(user.uid);
    if (!canChange.allowed) {
      throw new Error(canChange.reason);
    }

    // Check for password reuse
    const isReused = await isPasswordReused(user.uid, newPassword);
    if (isReused) {
      throw new Error('Cannot reuse any of your last 5 passwords. Please choose a different password.');
    }

    // Re-authenticate user with current password
    const credential = EmailAuthProvider.credential(user.email!, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

    // Update password change history and store hash
    await updatePasswordHistory(user.uid, newPassword);

    console.log('✅ Password changed successfully');
  } catch (error: any) {
    console.error('❌ Password change failed:', error);
    if (error.code === 'auth/wrong-password') {
      throw new Error('Current password is incorrect');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('New password is too weak');
    } else {
      throw new Error('Failed to change password: ' + error.message);
    }
  }
};

/**
 * Set up security questions for a user
 */
export const setupSecurityQuestions = async (
  userId: string,
  questionAnswers: Array<{
    questionId: string;
    answer: string;
  }>
): Promise<void> => {
  try {
    if (questionAnswers.length < 3) {
      throw new Error('Please answer at least 3 security questions');
    }

    const securityQuestions: SecurityQuestion[] = [];

    for (const qa of questionAnswers) {
      const questionData = SECURITY_QUESTIONS.find(q => q.id === qa.questionId);
      if (!questionData) {
        throw new Error(`Invalid question ID: ${qa.questionId}`);
      }

      if (qa.answer.trim().length < 5) {
        throw new Error(`Answer for "${questionData.question}" is too short. Please provide a detailed answer.`);
      }

      const hashedAnswer = await hashAnswer(qa.answer);
      
      securityQuestions.push({
        questionId: qa.questionId,
        question: questionData.question,
        hashedAnswer,
        createdAt: new Date()
      });
    }

    const securityProfile: UserSecurityProfile = {
      userId,
      securityQuestions,
      lastPasswordChange: new Date(),
      passwordChangeHistory: [new Date()],
      passwordHashes: [], // Initialize empty password hash history
      accountRecoveryEnabled: true
    };

    await setDoc(doc(db, 'userSecurity', userId), securityProfile);
    console.log('✅ Security questions setup completed');
  } catch (error: any) {
    console.error('❌ Security questions setup failed:', error);
    throw error;
  }
};

/**
 * Verify security questions for account recovery
 */
export const verifySecurityQuestions = async (
  email: string,
  answers: Array<{
    questionId: string;
    answer: string;
  }>
): Promise<boolean> => {
  try {
    // Get user by email first
    // Note: In production, you'd want a more secure way to map email to userId
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', email));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      throw new Error('User not found');
    }

    const userId = userSnapshot.docs[0].id;
    const securityDoc = await getDoc(doc(db, 'userSecurity', userId));
    
    if (!securityDoc.exists()) {
      throw new Error('Security questions not set up for this account');
    }

    const securityProfile = securityDoc.data() as UserSecurityProfile;
    
    if (answers.length < 2) {
      throw new Error('Please answer at least 2 security questions');
    }

    let correctAnswers = 0;
    
    for (const answer of answers) {
      const securityQuestion = securityProfile.securityQuestions.find(
        sq => sq.questionId === answer.questionId
      );
      
      if (securityQuestion && await verifyAnswer(answer.answer, securityQuestion.hashedAnswer)) {
        correctAnswers++;
      }
    }

    // Require at least 2 correct answers out of provided answers
    return correctAnswers >= 2;
  } catch (error: any) {
    console.error('❌ Security question verification failed:', error);
    throw error;
  }
};

/**
 * Get user's security questions (without answers)
 */
export const getUserSecurityQuestions = async (email: string): Promise<Array<{
  questionId: string;
  question: string;
}>> => {
  try {
    // Get user by email
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', email));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      throw new Error('User not found');
    }

    const userId = userSnapshot.docs[0].id;
    const securityDoc = await getDoc(doc(db, 'userSecurity', userId));
    
    if (!securityDoc.exists()) {
      throw new Error('Security questions not set up for this account');
    }

    const securityProfile = securityDoc.data() as UserSecurityProfile;
    
    return securityProfile.securityQuestions.map(sq => ({
      questionId: sq.questionId,
      question: sq.question
    }));
  } catch (error: any) {
    console.error('❌ Failed to get security questions:', error);
    throw error;
  }
};

/**
 * Update password change history
 */
const updatePasswordHistory = async (userId: string, newPassword?: string): Promise<void> => {
  try {
    const securityDoc = await getDoc(doc(db, 'userSecurity', userId));
    
    if (securityDoc.exists()) {
      const profile = securityDoc.data() as UserSecurityProfile;
      const updatedHistory = [...profile.passwordChangeHistory, new Date()];
      
      // Keep only last 10 password changes
      if (updatedHistory.length > 10) {
        updatedHistory.splice(0, updatedHistory.length - 10);
      }

      let updatedHashes = profile.passwordHashes || [];
      
      // If new password provided, add its hash
      if (newPassword) {
        const newHash = await hashAnswer(newPassword);
        updatedHashes = [newHash, ...updatedHashes];
        
        // Keep only last 5 password hashes
        if (updatedHashes.length > 5) {
          updatedHashes = updatedHashes.slice(0, 5);
        }
      }

      await updateDoc(doc(db, 'userSecurity', userId), {
        lastPasswordChange: new Date(),
        passwordChangeHistory: updatedHistory,
        passwordHashes: updatedHashes
      });
    } else {
      // Create initial security profile if it doesn't exist
      const initialProfile: UserSecurityProfile = {
        userId,
        securityQuestions: [],
        lastPasswordChange: new Date(),
        passwordChangeHistory: [new Date()],
        passwordHashes: newPassword ? [await hashAnswer(newPassword)] : [],
        accountRecoveryEnabled: false
      };
      
      await setDoc(doc(db, 'userSecurity', userId), initialProfile);
    }
  } catch (error) {
    console.error('❌ Failed to update password history:', error);
    // Don't throw - this is not critical for password change
  }
};

/**
 * Check if user can change password (24 hour minimum age requirement)
 */
export const canChangePassword = async (userId: string): Promise<{allowed: boolean, reason?: string}> => {
  try {
    const securityDoc = await getDoc(doc(db, 'userSecurity', userId));
    
    if (!securityDoc.exists()) {
      return { allowed: true }; // First time changing password
    }

    const profile = securityDoc.data() as UserSecurityProfile;
    const lastChange = profile.lastPasswordChange;
    
    if (lastChange) {
      const lastChangeDate = lastChange instanceof Date ? lastChange : new Date(lastChange);
      const now = new Date();
      const hoursSinceChange = (now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceChange < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceChange);
        return { 
          allowed: false, 
          reason: `Password can only be changed once every 24 hours. Please wait ${hoursRemaining} more hour(s).`
        };
      }
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('❌ Error checking password change eligibility:', error);
    return { allowed: true }; // Allow change if check fails
  }
};

/**
 * Check if password is being reused (prevent last 5 passwords)
 */
const isPasswordReused = async (userId: string, newPassword: string): Promise<boolean> => {
  try {
    const securityDoc = await getDoc(doc(db, 'userSecurity', userId));
    
    if (!securityDoc.exists()) {
      return false; // No history, so not reused
    }

    const profile = securityDoc.data() as UserSecurityProfile;
    const passwordHashes = profile.passwordHashes || [];
    
    if (passwordHashes.length === 0) {
      return false; // No password history
    }

    const newPasswordHash = await hashAnswer(newPassword);
    
    return passwordHashes.includes(newPasswordHash);
  } catch (error) {
    console.error('❌ Error checking password reuse:', error);
    return false; // Allow change if check fails
  }
};

/**
 * Record login attempt for security tracking
 */
export const recordLoginAttempt = async (
  userId: string, 
  success: boolean, 
  ipAddress?: string, 
  userAgent?: string
): Promise<void> => {
  try {
    // Record in login history
    const loginRecord: LoginRecord = {
      userId,
      timestamp: new Date(),
      success,
      ipAddress,
      userAgent
    };
    
    await setDoc(doc(db, 'loginHistory', `${userId}_${Date.now()}`), loginRecord);
    
    // Update user security profile
    const securityDoc = await getDoc(doc(db, 'userSecurity', userId));
    const updateData: any = {
      lastLoginAttempt: new Date()
    };
    
    if (success) {
      updateData.lastSuccessfulLogin = new Date();
    }
    
    if (securityDoc.exists()) {
      await updateDoc(doc(db, 'userSecurity', userId), updateData);
    } else {
      // Create initial profile if it doesn't exist
      const initialProfile: UserSecurityProfile = {
        userId,
        securityQuestions: [],
        lastPasswordChange: new Date(),
        passwordChangeHistory: [],
        passwordHashes: [],
        lastLoginAttempt: new Date(),
        lastSuccessfulLogin: success ? new Date() : undefined,
        accountRecoveryEnabled: false
      };
      
      await setDoc(doc(db, 'userSecurity', userId), initialProfile);
    }
  } catch (error) {
    console.error('❌ Failed to record login attempt:', error);
  }
};

/**
 * Get last login information for user
 */
export const getLastLoginInfo = async (userId: string): Promise<{
  lastSuccessfulLogin?: Date;
  lastFailedAttempt?: Date;
  recentFailedAttempts: number;
}> => {
  try {
    const securityDoc = await getDoc(doc(db, 'userSecurity', userId));
    
    if (!securityDoc.exists()) {
      return { recentFailedAttempts: 0 };
    }

    const profile = securityDoc.data() as UserSecurityProfile;
    
    // Get recent failed attempts (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const loginHistoryRef = collection(db, 'loginHistory');
    const recentAttemptsQuery = query(
      loginHistoryRef,
      where('userId', '==', userId),
      where('timestamp', '>', Timestamp.fromDate(twentyFourHoursAgo)),
      where('success', '==', false)
    );
    
    const recentFailedSnapshot = await getDocs(recentAttemptsQuery);
    
    return {
      lastSuccessfulLogin: profile.lastSuccessfulLogin,
      recentFailedAttempts: recentFailedSnapshot.size
    };
  } catch (error) {
    console.error('❌ Error getting last login info:', error);
    return { recentFailedAttempts: 0 };
  }
};

/**
 * Reset password using security questions
 */
export const resetPasswordWithSecurityQuestions = async (
  email: string,
  answers: Array<{ questionId: string; answer: string; }>,
  newPassword: string
): Promise<void> => {
  try {
    // Verify security questions first
    const verified = await verifySecurityQuestions(email, answers);
    if (!verified) {
      throw new Error('Security question verification failed');
    }

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }

    // Note: In a real implementation, you'd use Firebase Admin SDK on the server
    // to reset the password. For demo purposes, we'll just update the security profile
    console.log('✅ Password reset verified through security questions');
    
    // In production, implement server-side password reset here
    throw new Error('Password reset functionality requires server-side implementation with Firebase Admin SDK');
  } catch (error: any) {
    console.error('❌ Password reset failed:', error);
    throw error;
  }
};
