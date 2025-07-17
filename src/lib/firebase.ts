import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration - user needs to replace with their config
const firebaseConfig = {
  apiKey: "AIzaSyCx3_y94Yh1k3r-BHd_zLwHAzA8uLx5uwQ",
  authDomain: "petvet-21e39.firebaseapp.com",
  projectId: "petvet-21e39",
  storageBucket: "petvet-21e39.firebasestorage.app",
  messagingSenderId: "176853098536",
  appId: "1:176853098536:web:88994d53c10d9c872cd51d",
  measurementId: "G-N40RV0FP6Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;