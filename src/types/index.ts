export interface VetClinic {
  id: string;
  trade_name: string;
  business_address: string;
  region: string;
  facebook_page: string;
  contact: string;
  latitude: number;
  longitude: number;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  age: number;
  gender: string;
  photo_url: string;
  species?: string;
  breed?: string;
  weight?: number;
  date_of_birth?: string;
}

export interface MedicalRecord {
  id: string;
  pet_id: string;
  highlight: string;
  date: string;
  temperature?: number;
  symptoms: string[];
  treatment: string;
}

export interface VaccinationRecord {
  id: string;
  pet_id: string;
  name: string;
  date_given: string;
  next_due: string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface Appointment {
  id?: string; // Optional for new appointments before they are saved
  petId: string;
  title: string;
  date: string; // Assuming 'YYYY-MM-DD' format
  time: string; // Assuming 'HH:MM' format
  type: string;
  vet: Partial<VetClinic>; // 'vet' object might not contain all clinic details
  vetId: string;
  notes: string;
  userId: string;
  createdAt?: string; // ISO date string
  petName?: string;
  vetName?: string;
  address?: string;
  status?: string; // e.g., "pending", "confirmed", "cancelled"
}