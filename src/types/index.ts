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