import {z} from "zod";

const TrimmedString = z.string().transform((s) => s.trim().replace(/\s+/g, " "))

export const DifficultSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

function stableHash(input: string){
    let h = 2166136261 >>> 0;
    for(let i = 0; i < input.length; i++){
        h ^= input.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8)
}

const CardBaseSchema = z.object({
    id: z.string().min(1).optional(),
    question: z.string().trim().min(1, "Question is required"),
    answer: z.string().trim().min(1, "Answer is required"),
    category: TrimmedString.optional(),
    tags: z.array(TrimmedString).optional().default([]),
    difficulty: DifficultSchema.optional()
})

//preprocessing, adds defualt values if missing
export const CardSchema = z.preprocess((raw) => {
    const c = raw as z.input<typeof CardBaseSchema>

    //defualt difficulty = 2 (normal)
    if(c && (c as any).difficulty == null){
        (c as any).difficulty = 2;
    }

    //generate id if missing: q+::+a
    if(c && !(c as any).id){
        const q = (c as any).question ?? "";
        const a = (c as any).answer ?? "";
        (c as any).id = stableHash(`${q}::${a}`)
    }

    // uniq tags
    if(c && Array.isArray((c as any).tags)){
        (c as any).tags = Array.from(new Set((c as any).tags.map(String)));
    }

    return c;
}, CardBaseSchema)

export type Card = z.infer<typeof CardSchema>;

/** Metadata for game **/
export const DeckMeta = z.object({
    title: z.string().trim().min(1, "Title is required"),
    lang: z.string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use BCP-47 like 'sv' or 'sv-SE'")
    .optional()
    .default("sv")
})