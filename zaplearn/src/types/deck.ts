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