import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  QueryConstraint
} from 'firebase/firestore';
import { User, UserRole } from '@/types';

export interface UserManagementFilters {
  role?: UserRole;
  isVerified?: boolean;
  searchTerm?: string;
}

export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
  try {
    const q = query(collection(db, "users"), where("role", "==", role));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error("Error fetching users by role:", error);
    throw new Error("Failed to fetch users");
  }
};

export const getAllUsers = async (filters?: UserManagementFilters): Promise<User[]> => {
  try {
    const constraints: QueryConstraint[] = [];
    
    if (filters?.role) {
      constraints.push(where("role", "==", filters.role));
    }
    
    if (filters?.isVerified !== undefined) {
      constraints.push(where("isVerified", "==", filters.isVerified));
    }
    
    constraints.push(orderBy("createdAt", "desc"));
    
    const q = query(collection(db, "users"), ...constraints);
    const querySnapshot = await getDocs(q);
    
    let users = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
    
    // Client-side filtering for search term
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      users = users.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.displayName?.toLowerCase().includes(searchLower)
      );
    }
    
    return users;
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw new Error("Failed to fetch users");
  }
};

export const verifyUser = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      isVerified: true,
      verifiedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error verifying user:", error);
    throw new Error("Failed to verify user");
  }
};

export const updateUserRole = async (userId: string, newRole: UserRole): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      role: newRole,
      // Reset verification status when changing roles
      isVerified: newRole === 'pet_owner',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    throw new Error("Failed to update user role");
  }
};

export const suspendUser = async (userId: string, reason?: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      isSuspended: true,
      suspendedAt: new Date().toISOString(),
      suspensionReason: reason || "No reason provided"
    });
  } catch (error) {
    console.error("Error suspending user:", error);
    throw new Error("Failed to suspend user");
  }
};

export const unsuspendUser = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      isSuspended: false,
      unsuspendedAt: new Date().toISOString(),
      suspensionReason: null
    });
  } catch (error) {
    console.error("Error unsuspending user:", error);
    throw new Error("Failed to unsuspend user");
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("Failed to delete user");
  }
};

export const getPendingVerifications = async (): Promise<User[]> => {
  try {
    const q = query(
      collection(db, "users"), 
      where("isVerified", "==", false),
      where("role", "in", ["vet", "admin"])
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error("Error fetching pending verifications:", error);
    throw new Error("Failed to fetch pending verifications");
  }
};
