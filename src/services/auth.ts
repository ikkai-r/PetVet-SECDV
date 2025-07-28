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
import { User } from '@/types';
import { doc, setDoc } from "firebase/firestore";

// export const signUp = async (email: string, password: string): Promise<User> => {
//   const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//   return {
//     uid: userCredential.user.uid,
//     email: userCredential.user.email!,
//     displayName: userCredential.user.displayName || undefined,
//     photoURL: userCredential.user.photoURL || undefined,
//   };
// };

export const signUp = async (email: string, password: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    displayName: user.displayName || email.split("@")[0],
    photoURL: user.photoURL || "",
    createdAt: new Date().toISOString(),
    phoneNumber: "",
    role: "user", // Default role
  });

  return {
    uid: user.uid,
    email: user.email!,
    displayName: user.displayName || undefined,
    photoURL: user.photoURL || undefined,
    role: "user", // Default role
  };
};

export const signIn = async (email: string, password: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return {
    uid: userCredential.user.uid,
    email: userCredential.user.email!,
    displayName: userCredential.user.displayName || undefined,
    photoURL: userCredential.user.photoURL || undefined,
    role: "user", // Default role for existing users
  };
};

export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  
  // Create user document for Google sign-in users if it doesn't exist
  await setDoc(doc(db, "users", userCredential.user.uid), {
    email: userCredential.user.email,
    displayName: userCredential.user.displayName || userCredential.user.email?.split("@")[0],
    photoURL: userCredential.user.photoURL || "",
    createdAt: new Date().toISOString(),
    phoneNumber: "",
    role: "user",
  }, { merge: true });

  return {
    uid: userCredential.user.uid,
    email: userCredential.user.email!,
    displayName: userCredential.user.displayName || undefined,
    photoURL: userCredential.user.photoURL || undefined,
    role: "user",
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
          role: "user", // Default role
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
        role: "user", // Default role
      });
    } else {
      callback(null);
    }
  });
};