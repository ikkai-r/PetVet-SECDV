import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  AuthError
} from 'firebase/auth';
import { auth, db} from '@/lib/firebase';
import { User, UserRole } from '@/types';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { validatePassword } from '@/lib/passwordValidation';
import { verifyPasswordSecurity } from '@/lib/passwordSecurity';
import { 
  isAccountLocked, 
  recordFailedAttempt, 
  clearFailedAttempts,
  getSecurityAudit 
} from '@/lib/accountSecurity';
import { recordLoginAttempt } from '@/services/passwordManagement';
import { logEvent } from '@/services/adminService';
import { add } from 'date-fns';

// Verify our security implementation on module load
verifyPasswordSecurity();

// Log security configuration
console.log('🔐 Account Security Configuration:', getSecurityAudit());

interface SignUpData {
  email: string;
  password: string;
  role: UserRole;
  displayName?: string;
  vetLicenseNumber?: string;
  specialization?: string;
}

function addLog(action: string, details: string, userEmail: string) {
  if (!details) return;
  const timestamp = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
  const success = details.includes("successfully") || details.includes("successful");
  
  logEvent(action, timestamp, details, userEmail, success);
}


export const signUp = async (data: SignUpData): Promise<User> => {
  const { email, password, role, displayName, vetLicenseNumber, specialization } = data;
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.errors[0]); 
  }
  
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const userData = {
    email: user.email,
    displayName: displayName || user.displayName || email.split("@")[0],
    photoURL: user.photoURL || "",
    createdAt: new Date().toISOString(),
    phoneNumber: "",
    role,
    isVerified: true, // All roles are now auto-verified
    ...(role === 'vet' && {
      vetLicenseNumber: vetLicenseNumber || '',
      specialization: specialization || '',
      isVerified: true, // Vets are auto-verified
    }),
    ...(role === 'admin' && {
      permissions: ['user_management'], // Default admin permissions
      isVerified: true, // Admins are now auto-verified
    })
  };

  await setDoc(doc(db, "users", user.uid), userData);

  addLog("User Registration", "Register successful", user.email!);

  return {
    uid: user.uid,
    email: user.email!,
    displayName: userData.displayName,
    photoURL: userData.photoURL,
    role,
    ...(role === 'vet' && {
      vetLicenseNumber: userData.vetLicenseNumber,
      specialization: userData.specialization,
    }),
    isVerified: userData.isVerified,
  };
};

const getUserFromFirestore = async (uid: string): Promise<Partial<User> | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data() as Partial<User>;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

export const signIn = async (email: string, password: string): Promise<User> => {
  // Check if account is locked before attempting sign in
  const lockStatus = await isAccountLocked(email);

  console.log(lockStatus);
  if (lockStatus.isLocked) {
    const error = {
      code: 'auth/account-locked',
      message: `Account is temporarily locked due to multiple failed login attempts. ` +
               `Please try again in ${lockStatus.remainingMinutes} minutes.`
    };
    // Log lockout as failure
    addLog("Login Attempt", error.message, email);
    throw error;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    // Clear any failed attempts on successful login
    await clearFailedAttempts(email);
    // Record successful login attempt
    await recordLoginAttempt(firebaseUser.uid, true);
    // Log successful login
    addLog("Login Attempt", "Login successful", email);
    // Get user data from Firestore
    const userData = await getUserFromFirestore(firebaseUser.uid);
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || userData?.displayName,
      photoURL: firebaseUser.photoURL || userData?.photoURL,
      role: userData?.role || 'pet_owner', // Default to pet_owner if no role found
      ...(userData?.role === 'vet' && {
        vetLicenseNumber: userData.vetLicenseNumber,
        specialization: userData.specialization,
      }),
      isVerified: userData?.isVerified || false,
      permissions: userData?.permissions,
    };
  } catch (error: any) {
    console.log('🔍 Auth Error:', error.code, error.message);
    // Record failed attempt for authentication errors
    if (error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/invalid-email') {
      console.log('📝 Recording failed attempt for:', email);
      await recordFailedAttempt(email);
      // Also record in login tracking system
      try {
        // Try to get user ID for failed attempt tracking, but don't block on it
        const userData = await getUserFromFirestore(email);
        if (userData?.uid) {
          await recordLoginAttempt(userData.uid, false);
        }
      } catch (trackingError) {
        console.log('Failed to record login attempt in tracking system:', trackingError);
      }
      // Log failed login
      addLog("Login Attempt", "Authentication failed", email);
      // Check if this failed attempt triggers a lockout
      const newLockStatus = await isAccountLocked(email);
      console.log('🔒 Lock status after failed attempt:', newLockStatus);
      if (newLockStatus.isLocked) {
        const lockoutError = {
          code: 'auth/account-locked',
          message: `Too many failed login attempts. Account is now locked for ${newLockStatus.remainingMinutes} minutes.`
        };
        console.log('🚫 Throwing lockout error:', lockoutError);
        // Log lockout as failure
        addLog("Login Attempt", lockoutError.message, email);
        throw lockoutError;
      }
    }
    // Handle Firebase rate limiting with custom message
    if (error.code === 'auth/too-many-requests') {
      throw {
        code: 'auth/too-many-requests',
        message: 'Error: Too many requests, please try again later. Firebase has temporarily blocked further attempts from your location for security reasons.'
      };
    }
    throw error;
  }
};

export const signInWithGoogle = async (role: UserRole = 'pet_owner'): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const firebaseUser = userCredential.user;
  
  // Check if user already exists
  const existingUserData = await getUserFromFirestore(firebaseUser.uid);
  
  if (existingUserData) {
    // Return existing user
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || existingUserData.displayName,
      photoURL: firebaseUser.photoURL || existingUserData.photoURL,
      role: existingUserData.role || 'pet_owner',
      ...(existingUserData.role === 'vet' && {
        vetLicenseNumber: existingUserData.vetLicenseNumber,
        specialization: existingUserData.specialization,
      }),
      isVerified: existingUserData.isVerified || false,
      permissions: existingUserData.permissions,
    };
  }
  
  // Create new user document for Google sign-in users
  const userData = {
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
    photoURL: firebaseUser.photoURL || "",
    createdAt: new Date().toISOString(),
    phoneNumber: "",
    role,
    isVerified: true, // All roles are now auto-verified
    ...(role === 'vet' && {
      vetLicenseNumber: '',
      specialization: '',
      isVerified: true, // Vets are auto-verified
    }),
    ...(role === 'admin' && {
      permissions: ['user_management'],
      isVerified: true, // Admins are now auto-verified
    })
  };

  await setDoc(doc(db, "users", firebaseUser.uid), userData, { merge: true });

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email!,
    displayName: userData.displayName,
    photoURL: userData.photoURL,
    role,
    ...(role === 'vet' && {
      vetLicenseNumber: userData.vetLicenseNumber,
      specialization: userData.specialization,
    }),
    isVerified: userData.isVerified,
    permissions: userData.permissions,
  };
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();
      if (firebaseUser) {
        const userData = await getUserFromFirestore(firebaseUser.uid);
        resolve({
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || userData?.displayName,
          photoURL: firebaseUser.photoURL || userData?.photoURL,
          role: userData?.role || 'pet_owner',
          ...(userData?.role === 'vet' && {
            vetLicenseNumber: userData.vetLicenseNumber,
            specialization: userData.specialization,
          }),
          isVerified: userData?.isVerified || false,
          permissions: userData?.permissions,
        });
      } else {
        resolve(null);
      }
    });
  });
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userData = await getUserFromFirestore(firebaseUser.uid);
      callback({
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || userData?.displayName,
        photoURL: firebaseUser.photoURL || userData?.photoURL,
        role: userData?.role || 'pet_owner',
        ...(userData?.role === 'vet' && {
          vetLicenseNumber: userData.vetLicenseNumber,
          specialization: userData.specialization,
        }),
        isVerified: userData?.isVerified || false,
        permissions: userData?.permissions,
      });
    } else {
      callback(null);
    }
  });
};