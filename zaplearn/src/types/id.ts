import { z } from "zod";

// IDs are used as keys in progress records. Reject inherited object keys.
export const IdSchema = z
  .string()
  .min(1)
  .refine(
    (id) => id !== "prototype" && !Object.hasOwn(Object.prototype, id),
    "This ID is reserved; omit it to generate a safe ID",
  );
