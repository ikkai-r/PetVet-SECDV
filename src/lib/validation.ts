import { z } from 'zod';
import { validateSecurityPolicy } from './validationSecurity';

// Verify our validation security policy on module load
validateSecurityPolicy();

// Pet validation schema
export const petSchema = z.object({
  name: z.string()
    .min(1, "Pet name is required")
    .max(50, "Pet name must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Pet name can only contain letters, spaces, hyphens, and apostrophes"),
  species: z.string()
    .min(1, "Species is required")
    .max(30, "Species must be less than 30 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Species can only contain letters, spaces, hyphens, and apostrophes"),
  breed: z.string()
    .max(50, "Breed must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Pet breed can only contain letters, spaces, hyphens, and apostrophes")
    .optional(),
  weight: z.number()
    .min(0, "Weight must be positive")
    .max(1000, "Weight must be realistic")
    .refine(val => /^\d+(\.\d{1,2})?$/.test(val.toString()), {
      message: "Weight must be a number with up to 2 decimal places"
    })
  .optional(),
  date_of_birth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  notes: z.string()
    .max(500, "Notes must be less than 500 characters")
    .optional(),
});


export const medicalRecordFieldSchemas = {
  visitType: z.string().min(1, "Visit type is required"),
  weight: z.string()
    .refine(val => val === '' || (/^\d+(\.\d{1,2})?$/.test(val) && parseFloat(val) > 0 && parseFloat(val) < 1000), {
      message: "Weight must be a positive number with up to 2 decimal places and less than 1000"
    }),
  temperature: z.string()
    .refine(val => val === '' || (/^\d+(\.\d{1,2})?$/.test(val) && parseFloat(val) >= 90 && parseFloat(val) <= 110), {
      message: "Temperature must be between 90 and 110°C"
    }),
  heartRate: z.string()
    .refine(val => val === '' || (/^\d+$/.test(val) && parseInt(val) > 0 && parseInt(val) < 400), {
      message: "Heart rate must be a positive integer less than 400"
    }),
  symptoms: z.string().max(500, "Symptoms must be less than 500 characters"),
  diagnosis: z.string().min(1, "Diagnosis is required").max(500, "Diagnosis must be less than 500 characters"),
  treatment: z.string().min(1, "Treatment is required").max(500, "Treatment must be less than 500 characters"),
  medications: z.string().max(500, "Medications must be less than 500 characters"),
  notes: z.string().max(1000, "Notes must be less than 1000 characters"),
  cost: z.string()
    .refine(val => val === '' || (/^\d+(\.\d{1,2})?$/.test(val) && parseFloat(val) >= 0), {
      message: "Cost must be a positive number with up to 2 decimal places"
    }),
};

// Medical record validation schema
// export const medicalRecordSchema = z.object({
//   highlight: z.string()
//     .min(1, "Highlight is required")
//     .max(100, "Highlight must be less than 100 characters"),
//   date: z.string()
//     .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
//   temperature: z.number()
//     .min(90, "Temperature seems too low")
//     .max(110, "Temperature seems too high")
//     .optional(),
//   symptoms: z.array(z.string().max(100, "Each symptom must be less than 100 characters"))
//     .max(10, "Too many symptoms listed"),
//   treatment: z.string()
//     .min(1, "Treatment is required")
//     .max(500, "Treatment description must be less than 500 characters"),
// });

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

// Strict input validation - REJECT invalid input, do NOT sanitize
// Security policy: All validation failures result in input rejection
export const validateStrictInput = (input: string, fieldName: string = "Input"): { isValid: boolean; error?: string } => {
  // Check for potentially malicious content
  if (input.includes('<') || input.includes('>')) {
    return { isValid: false, error: `${fieldName} contains invalid characters (< >)` };
  }
  
  if (input.toLowerCase().includes('javascript:')) {
    return { isValid: false, error: `${fieldName} contains invalid content` };
  }
  
  if (/on\w+=/i.test(input)) {
    return { isValid: false, error: `${fieldName} contains invalid event handlers` };
  }
  
  // Check for script tags
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(input)) {
    return { isValid: false, error: `${fieldName} contains script tags` };
  }
  
  // Check for other potentially dangerous tags
  if (/<(iframe|object|embed|link|style|meta)\b/i.test(input)) {
    return { isValid: false, error: `${fieldName} contains potentially dangerous HTML tags` };
  }
  
  return { isValid: true };
};

// Email validation with strict security checks
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Invalid email format" };
  }
  
  // Additional security check
  const securityCheck = validateStrictInput(email, "Email");
  if (!securityCheck.isValid) {
    return securityCheck;
  }
  
  return { isValid: true };
};

// File upload validation with strict security checks
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 1 * 1024 * 1024; // 1MB

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed. Only JPEG, PNG, and WebP are supported.' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size too large. Maximum size is 1MB.' };
  }
  
  // Validate filename for malicious content
  const fileNameCheck = validateStrictInput(file.name, 'Filename');
  if (!fileNameCheck.isValid) {
    return fileNameCheck;
  }
  
  return { isValid: true };
};