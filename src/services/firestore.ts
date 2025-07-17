import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  GeoPoint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VetClinic, Pet, MedicalRecord, VaccinationRecord } from '@/types';

// Vet Clinics
export const getVetClinics = async (): Promise<VetClinic[]> => {
  const querySnapshot = await getDocs(collection(db, 'vet_clinics'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as VetClinic[];
};

export const getNearbyVetClinics = async (lat: number, lng: number, radiusKm: number = 10): Promise<VetClinic[]> => {
  // For demo purposes - in production you'd use GeoQuery
  const clinics = await getVetClinics();
  return clinics.filter(clinic => {
    const distance = calculateDistance(lat, lng, clinic.latitude, clinic.longitude);
    return distance <= radiusKm;
  });
};

// Pets
export const getUserPets = async (ownerId: string): Promise<Pet[]> => {
  const q = query(
    collection(db, 'pets'),
    where('owner_id', '==', ownerId),
    orderBy('name')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Pet[];
};

export const addPet = async (pet: Omit<Pet, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'pets'), pet);
  return docRef.id;
};

export const updatePet = async (petId: string, updates: Partial<Pet>): Promise<void> => {
  const petRef = doc(db, 'pets', petId);
  await updateDoc(petRef, updates);
};

export const deletePet = async (petId: string): Promise<void> => {
  await deleteDoc(doc(db, 'pets', petId));
};

// Medical Records
export const getPetMedicalRecords = async (petId: string): Promise<MedicalRecord[]> => {
  const q = query(
    collection(db, 'medical_records'),
    where('pet_id', '==', petId),
    orderBy('date', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as MedicalRecord[];
};

export const addMedicalRecord = async (record: Omit<MedicalRecord, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'medical_records'), record);
  return docRef.id;
};

// Vaccination Records
export const getPetVaccinationRecords = async (petId: string): Promise<VaccinationRecord[]> => {
  const q = query(
    collection(db, 'vaccination_records'),
    where('pet_id', '==', petId),
    orderBy('date_given', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as VaccinationRecord[];
};

export const addVaccinationRecord = async (record: Omit<VaccinationRecord, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'vaccination_records'), record);
  return docRef.id;
};

// Utility functions
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI/180);
};