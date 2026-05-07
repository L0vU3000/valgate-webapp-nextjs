import { z } from "zod";

export const idSchema = z.string().min(1);
export const userIdSchema = z.string().min(1);
export const propertyIdSchema = z.string().min(1);
export const timestampSchema = z.number().int().nonnegative();
