import { z } from 'zod';

// Pet validation schema
export const petSchema = z.object({
  name: z.string()
    .min(1, "Pet name is required")
    .max(50, "Pet name must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Pet name can only contain letters, spaces, hyphens, and apostrophes"),
  age: z.number()
    .min(0, "Age must be positive")
    .max(50, "Age must be realistic"),
  gender: z.string()
    .min(1, "Gender is required"),
  species: z.string()
    .min(1, "Species is required")
    .max(30, "Species must be less than 30 characters"),
  breed: z.string()
    .max(50, "Breed must be less than 50 characters")
    .optional(),
  weight: z.number()
    .min(0, "Weight must be positive")
    .max(1000, "Weight must be realistic")
    .optional(),
  date_of_birth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
});

// Medical record validation schema
export const medicalRecordSchema = z.object({
  highlight: z.string()
    .min(1, "Highlight is required")
    .max(100, "Highlight must be less than 100 characters"),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  temperature: z.number()
    .min(90, "Temperature seems too low")
    .max(110, "Temperature seems too high")
    .optional(),
  symptoms: z.array(z.string().max(100, "Each symptom must be less than 100 characters"))
    .max(10, "Too many symptoms listed"),
  treatment: z.string()
    .min(1, "Treatment is required")
    .max(500, "Treatment description must be less than 500 characters"),
});

// Vaccination record validation schema
export const vaccinationRecordSchema = z.object({
  name: z.string()
    .min(1, "Vaccine name is required")
    .max(100, "Vaccine name must be less than 100 characters"),
  date_given: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  next_due: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

// Appointment validation schema
export const appointmentSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
  type: z.string()
    .min(1, "Appointment type is required")
    .max(50, "Type must be less than 50 characters"),
  notes: z.string()
    .max(1000, "Notes must be less than 1000 characters"),
});

// User profile validation schema
export const userProfileSchema = z.object({
  displayName: z.string()
    .min(1, "Display name is required")
    .max(50, "Display name must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Display name can only contain letters, spaces, hyphens, and apostrophes"),
  phoneNumber: z.string()
    .regex(/^\+?[\d\s-()]+$/, "Invalid phone number format")
    .max(20, "Phone number must be less than 20 characters")
    .optional(),
});

// Sanitization function to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// File upload validation
export const validateImageFile = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
};