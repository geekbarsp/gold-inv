import { z } from "zod";
import { CATEGORIES } from "./types";

const optionalText = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .nullable()
  .transform((v) => v || null);
export const itemSchema = z.object({
  barcode: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(
      /^[A-Za-z0-9._\-\/]+$/,
      "Use letters, numbers, dots, dashes, slashes or underscores",
    ),
  item_name: z.string().trim().min(2).max(150),
  category: z.enum(CATEGORIES),
  karat: z.string().trim().min(1).max(20),
  grams: z.coerce.number().positive().max(999999999),
  description: optionalText,
  supplier: optionalText,
  design_code: optionalText,
  notes: optionalText,
  status: z.enum(["available", "sold"]).default("available"),
});
const updateOptionalText = z
  .string()
  .trim()
  .max(1000)
  .nullable()
  .optional()
  .transform((value) => (value === "" ? null : value));
export const updateItemSchema = z
  .object({
    item_name: z.string().trim().min(2).max(150).optional(),
    category: z.enum(CATEGORIES).optional(),
    karat: z.string().trim().min(1).max(20).optional(),
    grams: z.coerce.number().positive().max(999999999).optional(),
    description: updateOptionalText,
    supplier: updateOptionalText,
    design_code: updateOptionalText,
    notes: updateOptionalText,
    status: z.enum(["available", "sold"]).optional(),
  })
  .strict();
export const passcodeSchema = z.object({
  passcode: z.string().min(1).max(128),
});
const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
export const settingsSchema = z.object({
  store_name: z.string().trim().min(2).max(100).optional(),
  session_timeout_minutes: z.coerce.number().int().min(5).max(10080).optional(),
  barcode_format: z.literal("CODE128").optional(),
  label_show_karat: z.boolean().optional(),
  label_show_grams: z.boolean().optional(),
  current_passcode: z.preprocess(
    blankToUndefined,
    z.string().max(128).optional(),
  ),
  new_passcode: z.preprocess(
    blankToUndefined,
    z.string().min(4).max(128).optional(),
  ),
});
