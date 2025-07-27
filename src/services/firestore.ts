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
  serverTimestamp,
  GeoPoint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VetClinic, Pet, MedicalRecord, VaccinationRecord, Appointment } from '@/types';

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
export const getUserPets = async (userId) => {
  try {
    console.log('Fetching pets for userId:', userId);

    const petsQuery = query(
      collection(db, 'pets'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(petsQuery);

    console.log('Query snapshot size:', querySnapshot.size);

    const pets = [];
    querySnapshot.forEach((doc) => {
      const petData = doc.data();
      console.log('Pet data:', petData);

      // Calculate age from dateOfBirth if needed
      let age = petData.age;
      if (!age && petData.dateOfBirth) {
        const birthDate = new Date(petData.dateOfBirth);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
      }

      // Handle vaccines array
      const vaccines = Array.isArray(petData.vaccines)
        ? petData.vaccines.map(v => ({
            name: v.name || '',
            date: v.date || '',
            nextDue: v.nextDue || '',
            id: v.id || null
          }))
        : [];

      // Handle records array (medical history)
      const records = Array.isArray(petData.records)
        ? petData.records.map(r => ({
            title: r.title || '',
            description: r.description || '',
            date: r.date || '',
            id: r.id || null
          }))
        : [];

      pets.push({
        id: doc.id,
        name: petData.name,
        species: petData.species,
        breed: petData.breed,
        age: age || 0,
        weight: petData.weight,
        notes: petData.notes,
        dateOfBirth: petData.dateOfBirth,
        userId: petData.userId,
        photo: petData.photo || '',
        vaccines,
        records
      });
    });

    return pets;
  } catch (error) {
    console.error('Error fetching user pets:', error);
    return [];
  }
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
    // Delete all medical records for this pet
  const medQuery = query(
    collection(db, 'medical_records'),
    where('pet_id', '==', petId)
  );
  const medSnapshot = await getDocs(medQuery);
  const medDeletes = medSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'medical_records', docSnap.id)));
  await Promise.all(medDeletes);

  // Delete all vaccination records for this pet
  const vaxQuery = query(
    collection(db, 'vaccination_records'),
    where('pet_id', '==', petId)
  );
  const vaxSnapshot = await getDocs(vaxQuery);
  const vaxDeletes = vaxSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'vaccination_records', docSnap.id)));
  await Promise.all(vaxDeletes);

  // Delete all appointments for this pet
  const aptQuery = query(
    collection(db, 'schedules'),
    where('petId', '==', petId)
  );
  const aptSnapshot = await getDocs(aptQuery);
  const aptDeletes = aptSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'schedules', docSnap.id)));
  await Promise.all(aptDeletes);

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

// Appointments
export const addAppointment = async (
  appointmentData: Omit<Appointment, 'id' | 'createdAt'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'schedules'), {
    ...appointmentData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateAppointment = async (
  id: string,
  data: Partial<Appointment>
): Promise<void> => {
  const appointmentRef = doc(db, 'schedules', id);
  // Remove fields you don't want to update
  const { createdAt, ...updateData } = data;
  await updateDoc(appointmentRef, updateData);
};

export const deleteAppointment = async (
  id: string,
): Promise<void> => {
  const appointmentRef = doc(db, 'schedules', id);
  await deleteDoc(appointmentRef);
};

export const getUserAppointments = async (
  userId: string
): Promise<Appointment[]> => {
  const q = query(
    collection(db, 'schedules'),
    where('userId', '==', userId),
    orderBy('date', 'asc'), // Order by date
    orderBy('time', 'asc') // Then by time
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      } as Appointment)
  );
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

