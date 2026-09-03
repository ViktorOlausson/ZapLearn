import { z } from "zod";

export const BucketSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

export const CardProgressSchema = z.object({
  cardId: z.string().min(1),
  bucket: BucketSchema,
  correctCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  intervalMinutes: z.number().nonnegative(),
  ease: z.number().min(1.3).max(3).default(2.3),
  dueAt: z.string().datetime(),
  lastReviewedAt: z.string().datetime().optional(),
});

export const ProgressDocumentSchema = z.object({
  schemaVersion: z.number().int().positive(),
  deckId: z.string().min(1),
  cards: z.record(z.string(), CardProgressSchema),
  updatedAt: z.string().datetime(),
});

export type Bucket = z.infer<typeof BucketSchema>;
export type CardProgress = z.infer<typeof CardProgressSchema>;
export type ProgressDocument = z.infer<typeof ProgressDocumentSchema>;

export const PROGRESS_SCHEMA_VERSION = 2;
