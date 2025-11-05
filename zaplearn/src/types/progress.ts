import z from "zod";

/** 0=nytt, 1=lärs, 2=behärskat (MVP) */
export const BucketSchema = z.union([z.literal(0), z.literal(1), z.literal(2)])

export const IsoDateString = z.string().refine((s) => !Number.isNaN(Date.parse(s)), {message: "Invalid ISO date"})

export const DeckProgressSchema = z.object({
    bucket: BucketSchema,
    ease: z.number().min(1.3).max(3.0).default(2.3),
    intervalDays: z.number().min(0).default(0),
    dueAt: IsoDateString,
    reps: z.number().min(0).default(0),
    lapses: z.number().min(0).default(0),
})

// kolla https://zod.dev/api#records om det blir fel
export const ProgressMapSchema = z.record(z.string(), DeckProgressSchema)

export type CardProgress = z.infer<typeof DeckProgressSchema>
export type ProgressMap = z.infer<typeof ProgressMapSchema>