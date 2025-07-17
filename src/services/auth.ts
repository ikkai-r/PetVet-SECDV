import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { User } from '@/types';

export const signUp = async (email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return {
    uid: userCredential.user.uid,
    email: userCredential.user.email!,
    displayName: userCredential.user.displayName || undefined,
    photoURL: userCredential.user.photoURL || undefined,
  };
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return {
    uid: userCredential.user.uid,
    email: userCredential.user.email!,
    displayName: userCredential.user.displayName || undefined,
    photoURL: userCredential.user.photoURL || undefined,
  };
};

export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return {
    uid: userCredential.user.uid,
    email: userCredential.user.email!,
    displayName: userCredential.user.displayName || undefined,
    photoURL: userCredential.user.photoURL || undefined,
  };
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve({
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
        });
      } else {
        resolve(null);
      }
    });
  });
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      callback({
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
      });
    } else {
      callback(null);
    }
  });
};