import { z } from 'zod'

export const childSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  gender: z.enum(['male', 'female', 'other']),
  birth_date: z.string().min(1, 'Birth date is required'),
  birth_time: z.string().optional(),
  birth_weight_kg: z.coerce.number().positive().optional().nullable(),
  birth_place: z.string().min(2, 'Birth place is required'),
})

export const parentSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  occupation: z.string().optional(),
  phone: z.string().min(9, 'Valid phone number is required'),
  address: z.string().min(5, 'Address is required'),
  id_number: z.string().optional(),
})

export const fatherSchema = z.object({
  full_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  occupation: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  id_number: z.string().optional(),
})

export const declarationFormSchema = z.object({
  civil_status_center_id: z.string().uuid('Select a civil status center'),
  mother_marital_status: z.enum(['married', 'single', 'widowed', 'divorced']),
  paternity_recognized: z.boolean(),
  mother_email: z.string().email().optional().or(z.literal('')),
  child: childSchema,
  mother: parentSchema,
  father: fatherSchema.optional(),
})

export type DeclarationFormData = z.infer<typeof declarationFormSchema>

export const hospitalSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
  region: z.string().min(2),
  division: z.string().min(2),
  address: z.string().min(5),
  contact_phone: z.string().min(9),
  contact_email: z.string().email(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
})

export const civilCenterSchema = z.object({
  name: z.string().min(2),
  reference_number: z.string().min(2),
  region: z.string().min(2),
  division: z.string().min(2),
  subdivision: z.string().optional(),
  address: z.string().min(5),
  officer_name: z.string().min(2),
  contact_phone: z.string().min(9),
  contact_email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional().default('active'),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const profileSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().optional(),
  locale: z.enum(['en', 'fr']),
})
