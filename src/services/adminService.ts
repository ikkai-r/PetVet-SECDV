import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  updateDoc,
  addDoc,
  deleteField,
  limit as fsLimit
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { UserRole } from '@/types';
import { time } from 'console';

// Types
export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string;
  createdAt: Timestamp;
  assignedVet?: string;
  assignedPetOwners?: string[];
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  ownerId: string;
  ownerEmail: string;
  medicalHistory?: string;
  createdAt: Timestamp;
}

export interface VetAssignment {
  petOwnerId: string;
  petOwnerEmail: string;
  vetId: string;
  vetEmail: string;
  assignedAt: Timestamp;
}

export interface Log {
  id: string;
  action: string;
  details: string;
  userEmail?: string;
  timestamp: string;
  success: boolean;
}

/**
 * Create a new user account (Admin only)
 */
export const createUserAccount = async (
  email: string, 
  password: string, 
  role: UserRole, 
  displayName?: string
): Promise<void> => {
  try {
    console.log('🔧 Creating new user account:', { email, role, displayName });
    
    // Create the user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the user's display name if provided
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Create user document in Firestore
    const userDoc: any = {
      email: email.toLowerCase(),
      role,
      displayName: displayName || '',
      createdAt: Timestamp.now(),
    };
    
    // Add role-specific fields only for the roles that need them
    if (role === 'pet_owner') {
      userDoc.assignedVet = null;
    } else if (role === 'vet') {
      userDoc.assignedPetOwners = [];
    }
    // Admin role doesn't need any additional fields
    
    await setDoc(doc(db, 'users', user.uid), userDoc);
    
    console.log('✅ User account created successfully');
  } catch (error) {
    console.error('❌ Error creating user account:', error);
    throw error;
  }
};

/**
 * Get all users in the system
 */
export const getAllUsers = async (): Promise<AdminUser[]> => {
  try {
    console.log('📋 Fetching all users...');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const users: AdminUser[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AdminUser));
    
    console.log(`✅ Found ${users.length} users`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
};

/**
 * Get all pets in the system
 */
export const getAllPets = async (): Promise<Pet[]> => {
  try {
    console.log('🐾 Fetching all pets...');
    
    const petsRef = collection(db, 'pets');
    const snapshot = await getDocs(petsRef);
    
    const pets: Pet[] = await Promise.all(
      snapshot.docs.map(async (petDoc) => {
        const petData = petDoc.data();
        
        // Get owner information
        let ownerEmail = 'Unknown';
        if (petData.ownerId) {
          try {
            const ownerDoc = await getDoc(doc(db, 'users', petData.ownerId));
            if (ownerDoc.exists()) {
              ownerEmail = ownerDoc.data().email;
            }
          } catch (error) {
            console.warn('Could not fetch owner for pet:', petDoc.id);
          }
        }
        
        return {
          id: petDoc.id,
          ...petData,
          ownerEmail
        } as Pet;
      })
    );
    
    console.log(`✅ Found ${pets.length} pets`);
    return pets;
  } catch (error) {
    console.error('❌ Error fetching pets:', error);
    throw error;
  }
};

/**
 * Assign a vet to a pet owner
 */
export const assignVetToPetOwner = async (petOwnerId: string, vetId: string): Promise<void> => {
  try {
    console.log('🔗 Assigning vet to pet owner:', { petOwnerId, vetId });
    
    // Get both user documents to verify they exist and have correct roles
    const [petOwnerDoc, vetDoc] = await Promise.all([
      getDoc(doc(db, 'users', petOwnerId)),
      getDoc(doc(db, 'users', vetId))
    ]);
    
    if (!petOwnerDoc.exists()) {
      throw new Error('Pet owner not found');
    }
    
    if (!vetDoc.exists()) {
      throw new Error('Veterinarian not found');
    }
    
    const petOwnerData = petOwnerDoc.data();
    const vetData = vetDoc.data();
    
    if (petOwnerData.role !== 'pet_owner') {
      throw new Error('Selected user is not a pet owner');
    }
    
    if (vetData.role !== 'vet') {
      throw new Error('Selected user is not a veterinarian');
    }
    
    // Update pet owner's assigned vet
    await updateDoc(doc(db, 'users', petOwnerId), {
      assignedVet: vetId
    });
    
    // Update vet's assigned pet owners list
    const currentAssignedPetOwners = vetData.assignedPetOwners || [];
    if (!currentAssignedPetOwners.includes(petOwnerId)) {
      await updateDoc(doc(db, 'users', vetId), {
        assignedPetOwners: [...currentAssignedPetOwners, petOwnerId]
      });
    }
    
    // Create assignment record
    const assignmentDoc = {
      petOwnerId,
      petOwnerEmail: petOwnerData.email,
      vetId,
      vetEmail: vetData.email,
      assignedAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'vetAssignments', `${vetId}_${petOwnerId}`), assignmentDoc);
    
    console.log('✅ Vet assignment completed successfully');
  } catch (error) {
    console.error('❌ Error assigning vet:', error);
    throw error;
  }
};

/**
 * Get all vet assignments
 */
export const getUserAssignments = async (): Promise<VetAssignment[]> => {
  try {
    console.log('📋 Fetching vet assignments...');
    
    const assignmentsRef = collection(db, 'vetAssignments');
    const snapshot = await getDocs(assignmentsRef);
    
    const assignments: VetAssignment[] = snapshot.docs.map(doc => ({
      ...doc.data()
    } as VetAssignment));
    
    console.log(`✅ Found ${assignments.length} assignments`);
    return assignments;
  } catch (error) {
    console.error('❌ Error fetching assignments:', error);
    throw error;
  }
};

/**
 * Update a user's role
 */
export const updateUserRole = async (userId: string, newRole: UserRole): Promise<void> => {
  try {
    console.log('🔄 Updating user role:', { userId, newRole });
    
    const userRef = doc(db, 'users', userId);
    
    // First get the current user data to check what fields exist
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const currentUserData = userDoc.data();
    const updateData: any = { role: newRole };
    
    if (newRole === 'pet_owner') {
      updateData.assignedVet = null;
      
      if (currentUserData.assignedPetOwners !== undefined) {
        updateData.assignedPetOwners = deleteField();
      }
    } else if (newRole === 'vet') {
      updateData.assignedPetOwners = [];
      
      if (currentUserData.assignedVet !== undefined) {
        updateData.assignedVet = deleteField();
      }
    } else if (newRole === 'admin') {
      if (currentUserData.assignedVet !== undefined) {
        updateData.assignedVet = deleteField();
      }
      if (currentUserData.assignedPetOwners !== undefined) {
        updateData.assignedPetOwners = deleteField();
      }
    }
    
    await updateDoc(userRef, updateData);
    
    console.log('✅ User role updated successfully');
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    throw error;
  }
};

/**
 * Delete a user account (Admin only)
 */
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting user:', userId);
    
    // Get user data before deletion for cleanup
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Clean up assignments if this is a vet
    if (userData.role === 'vet') {
      const assignedPetOwners = userData.assignedPetOwners || [];
      
      // Remove vet assignment from pet owners
      for (const petOwnerId of assignedPetOwners) {
        try {
          await updateDoc(doc(db, 'users', petOwnerId), {
            assignedVet: null
          });
        } catch (error) {
          console.warn('Could not update pet owner assignment:', petOwnerId);
        }
      }
      
      // Delete assignment records
      for (const petOwnerId of assignedPetOwners) {
        try {
          await deleteDoc(doc(db, 'vetAssignments', `${userId}_${petOwnerId}`));
        } catch (error) {
          console.warn('Could not delete assignment record:', `${userId}_${petOwnerId}`);
        }
      }
    }
    
    // Clean up if this is a pet owner
    if (userData.role === 'pet_owner' && userData.assignedVet) {
      try {
        const vetDoc = await getDoc(doc(db, 'users', userData.assignedVet));
        if (vetDoc.exists()) {
          const vetData = vetDoc.data();
          const updatedAssignedPetOwners = (vetData.assignedPetOwners || []).filter(
            (id: string) => id !== userId
          );
          
          await updateDoc(doc(db, 'users', userData.assignedVet), {
            assignedPetOwners: updatedAssignedPetOwners
          });
        }
        
        // Delete assignment record
        await deleteDoc(doc(db, 'vetAssignments', `${userData.assignedVet}_${userId}`));
      } catch (error) {
        console.warn('Could not clean up vet assignment:', error);
      }
    }
    
    // Delete user document
    await deleteDoc(doc(db, 'users', userId));
    
    console.log('✅ User deleted successfully');
    
    // Note: We cannot delete the Firebase Auth user from the client side
    // This would need to be done server-side with Admin SDK
    console.warn('⚠️ Firebase Auth user still exists - requires server-side deletion');
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw error;
  }
};

/**
 * Get user statistics for dashboard
 */
export const getUserStatistics = async () => {
  try {
    const users = await getAllUsers();
    const pets = await getAllPets();
    const assignments = await getUserAssignments();
    
    return {
      totalUsers: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      vets: users.filter(u => u.role === 'vet').length,
      petOwners: users.filter(u => u.role === 'pet_owner').length,
      totalPets: pets.length,
      totalAssignments: assignments.length
    };
  } catch (error) {
    console.error('❌ Error getting statistics:', error);
    throw error;
  }
};

export const getSystemLogs = async (logLimit: number = 50) => {
  try { 
    console.log('📋 Fetching system logs...');

    const logsRef = collection(db, 'logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), fsLimit(logLimit));
    const snapshot = await getDocs(q);

    const logs: Log[] = await Promise.all(
      snapshot.docs.map(async (logDoc) => {
        const logData = logDoc.data();
        return {
          id: logDoc.id,
          action: logData.action,
          details: logData.details,
          userEmail: logData.userEmail,
          timestamp: logData.timestamp,
          success: logData.success
        } as Log;
      })
    );

    console.log(`✅ Found ${logs.length} logs`);
    return logs;
  } catch (error) {
    console.error('❌ Error getting system logs:', error);
    throw error;
  }
};

export async function logEvent(action: string, timestamp: string, 
                              details: string, userEmail: string, 
                              success: boolean) {
  const docRef = await addDoc(collection(db, 'logs'), {
      action,
      details,
      userEmail: userEmail || null,
      timestamp: timestamp,
      success: success
    });
    return docRef.id;
}
