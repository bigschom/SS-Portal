import * as z from 'zod';

export const serviceSchema = z.object({
  service_type: z.string({
    required_error: "Service type is required",
  }).min(1, 'Service type is required')
    .max(50, 'Service type must be less than 50 characters')
    .regex(
      /^[a-z][a-z0-9_]*$/,
      'Service type must be in snake_case format and start with a letter'
    ),
  description: z.string({
    required_error: "Description is required",
  }).min(1, 'Description is required')
    .max(200, 'Description must be less than 200 characters'),
  sla_hours: z.coerce.number({
    required_error: "SLA hours is required",
    invalid_type_error: "SLA hours must be a number",
  }).min(1, 'SLA hours must be at least 1')
    .max(168, 'SLA hours cannot exceed 168 (1 week)')
    .int('SLA hours must be a whole number'),
  is_visible: z.boolean().default(true)
});

export const serviceUpdateSchema = serviceSchema.extend({
  service_type: z.string({
    required_error: "Service type is required",
  }).min(1, 'Service type is required')
    .max(50, 'Service type must be less than 50 characters')
});
