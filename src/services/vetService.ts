import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy, 
  Timestamp,
  addDoc,
  DocumentReference
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Types
export interface VetPet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  dateOfBirth: string;
  gender: string;
  weight: number;
  color: string;
  ownerId: string;
  ownerEmail: string;
  ownerName?: string;
  microchipId?: string;
  allergies?: string[];
  medications?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MedicalRecord {
  id: string;
  petId: string;
  petName: string;
  vetId: string;
  vetName: string;
  date: Timestamp;
  visitType: 'routine' | 'emergency' | 'follow-up' | 'vaccination' | 'surgery' | 'other';
  symptoms: string;
  diagnosis: string;
  treatment: string;
  medications: string;
  notes: string;
  nextVisitDate?: Timestamp;
  weight?: number;
  temperature?: number;
  heartRate?: number;
  attachments?: string[];
  cost?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AssignedPetOwner {
  id: string;
  email: string;
  displayName?: string;
  assignedAt: Timestamp;
  petsCount: number;
}

/**
 * Get all pets assigned to the current vet
 */
export const getAssignedPets = async (vetId: string): Promise<VetPet[]> => {
  try {
    console.log('🐾 Fetching assigned pets for vet:', vetId);
    
    // First get the vet's assigned pet owners
    const vetDoc = await getDoc(doc(db, 'users', vetId));
    if (!vetDoc.exists()) {
      throw new Error('Veterinarian not found');
    }
    
    const vetData = vetDoc.data();
    const assignedPetOwnerIds = vetData.assignedPetOwners || [];
    
    if (assignedPetOwnerIds.length === 0) {
      console.log('No assigned pet owners found');
      return [];
    }
    
    // Get pets for all assigned pet owners
    const allPets: VetPet[] = [];
    
    for (const ownerId of assignedPetOwnerIds) {
      const petsRef = collection(db, 'pets');
      const petsQuery = query(petsRef, where('userId', '==', ownerId));
      const petsSnapshot = await getDocs(petsQuery);
      
      // Get owner info
      const ownerDoc = await getDoc(doc(db, 'users', ownerId));
      const ownerData = ownerDoc.exists() ? ownerDoc.data() : null;
      
      const ownerPets = petsSnapshot.docs.map(petDoc => ({
        id: petDoc.id,
        ...petDoc.data(),
        ownerId,
        ownerEmail: ownerData?.email || 'Unknown',
        ownerName: ownerData?.displayName || 'Unknown'
      } as VetPet));
      
      allPets.push(...ownerPets);
    }
    
    console.log(`✅ Found ${allPets.length} assigned pets`);
    return allPets;
  } catch (error) {
    console.error('❌ Error fetching assigned pets:', error);
    throw error;
  }
};

/**
 * Get assigned pet owners for a vet
 */
export const getAssignedPetOwners = async (vetId: string): Promise<AssignedPetOwner[]> => {
  try {
    console.log('👥 Fetching assigned pet owners for vet:', vetId);
    
    const vetDoc = await getDoc(doc(db, 'users', vetId));
    if (!vetDoc.exists()) {
      throw new Error('Veterinarian not found');
    }
    
    const vetData = vetDoc.data();
    const assignedPetOwnerIds = vetData.assignedPetOwners || [];
    
    const assignedOwners: AssignedPetOwner[] = [];
    
    for (const ownerId of assignedPetOwnerIds) {
      // Get owner info
      const ownerDoc = await getDoc(doc(db, 'users', ownerId));
      if (!ownerDoc.exists()) continue;
      
      const ownerData = ownerDoc.data();
      
      // Count pets for this owner
      const petsRef = collection(db, 'pets');
      const petsQuery = query(petsRef, where('userId', '==', ownerId));
      const petsSnapshot = await getDocs(petsQuery);
      
      // Get assignment date
      const assignmentDoc = await getDoc(doc(db, 'vetAssignments', `${vetId}_${ownerId}`));
      const assignedAt = assignmentDoc.exists() 
        ? assignmentDoc.data().assignedAt 
        : Timestamp.now();
      
      assignedOwners.push({
        id: ownerId,
        email: ownerData.email,
        displayName: ownerData.displayName,
        assignedAt,
        petsCount: petsSnapshot.docs.length
      });
    }
    
    console.log(`✅ Found ${assignedOwners.length} assigned pet owners`);
    return assignedOwners;
  } catch (error) {
    console.error('❌ Error fetching assigned pet owners:', error);
    throw error;
  }
};

/**
 * Update pet details (vet can update medical info)
 */
export const updatePetDetails = async (petId: string, updates: Partial<VetPet>): Promise<void> => {
  try {
    console.log('🔄 Updating pet details:', { petId, updates });
    
    const petRef = doc(db, 'pets', petId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(petRef, updateData);
    
    console.log('✅ Pet details updated successfully');
  } catch (error) {
    console.error('❌ Error updating pet details:', error);
    throw error;
  }
};

/**
 * Get medical records for a specific pet
 */
export const getPetMedicalRecords = async (petId: string): Promise<MedicalRecord[]> => {
  try {
    console.log('📋 Fetching medical records for pet:', petId);
    
    const recordsRef = collection(db, 'medicalRecords');
    const recordsQuery = query(
      recordsRef, 
      where('petId', '==', petId)
    );
    
    const snapshot = await getDocs(recordsQuery);
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MedicalRecord));
    
    // Sort by date on client side (newest first)
    records.sort((a, b) => {
      const dateA = a.date?.toDate?.() || new Date(0);
      const dateB = b.date?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`✅ Found ${records.length} medical records`);
    return records;
  } catch (error) {
    console.error('❌ Error fetching medical records:', error);
    throw error;
  }
};

/**
 * Create a new medical record
 */
export const createMedicalRecord = async (
  petId: string, 
  vetId: string, 
  recordData: Omit<MedicalRecord, 'id' | 'petId' | 'vetId' | 'createdAt' | 'updatedAt'>
): Promise<DocumentReference> => {
  try {
    console.log('📝 Creating medical record for pet:', petId);
    
    // Get pet and vet information
    const [petDoc, vetDoc] = await Promise.all([
      getDoc(doc(db, 'pets', petId)),
      getDoc(doc(db, 'users', vetId))
    ]);
    
    if (!petDoc.exists()) {
      throw new Error('Pet not found');
    }
    
    if (!vetDoc.exists()) {
      throw new Error('Veterinarian not found');
    }
    
    const petData = petDoc.data();
    const vetData = vetDoc.data();
    
    const medicalRecord = {
      petId,
      petName: petData.name,
      vetId,
      vetName: vetData.displayName || vetData.email,
      ...recordData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'medicalRecords'), medicalRecord);
    
    console.log('✅ Medical record created successfully');

    return docRef;
  } catch (error) {
    console.error('❌ Error creating medical record:', error);
    throw error;
  }
};

/**
 * Update an existing medical record
 */
export const updateMedicalRecord = async (
  recordId: string, 
  updates: Partial<MedicalRecord>
): Promise<void> => {
  try {
    console.log('🔄 Updating medical record:', recordId);
    
    const recordRef = doc(db, 'medicalRecords', recordId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(recordRef, updateData);
    
    console.log('✅ Medical record updated successfully');
  } catch (error) {
    console.error('❌ Error updating medical record:', error);
    throw error;
  }
};

/**
 * Delete a medical record
 */
export const deleteMedicalRecord = async (recordId: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting medical record:', recordId);
    
    await deleteDoc(doc(db, 'medicalRecords', recordId));
    
    console.log('✅ Medical record deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting medical record:', error);
    throw error;
  }
};

/**
 * Get vet dashboard statistics
 */
export const getVetStatistics = async (vetId: string) => {
  try {
    const [assignedPets, assignedOwners] = await Promise.all([
      getAssignedPets(vetId),
      getAssignedPetOwners(vetId)
    ]);
    
    // Get total medical records for assigned pets
    let totalRecords = 0;
    for (const pet of assignedPets) {
      const records = await getPetMedicalRecords(pet.id);
      totalRecords += records.length;
    }
    
    // Get recent records (last 30 days) - using client-side filtering to avoid index requirement
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let recentRecords = 0;
    for (const pet of assignedPets) {
      const records = await getPetMedicalRecords(pet.id);
      // Filter records client-side to count recent ones
      const recentPetRecords = records.filter(record => {
        const recordDate = record.date?.toDate?.() || new Date(0);
        return recordDate > thirtyDaysAgo;
      });
      recentRecords += recentPetRecords.length;
    }
    
    return {
      totalPets: assignedPets.length,
      totalOwners: assignedOwners.length,
      totalRecords,
      recentRecords
    };
  } catch (error) {
    console.error('❌ Error getting vet statistics:', error);
    throw error;
  }
};
