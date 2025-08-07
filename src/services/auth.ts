import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, db} from '@/lib/firebase';
import { User, UserRole } from '@/types';
import { doc, setDoc, getDoc } from "firebase/firestore";

interface SignUpData {
  email: string;
  password: string;
  role: UserRole;
  displayName?: string;
  vetLicenseNumber?: string;
  specialization?: string;
}

export const signUp = async (data: SignUpData): Promise<User> => {
  const { email, password, role, displayName, vetLicenseNumber, specialization } = data;
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
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  
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