import { stableHash } from "@/lib/hash";

function seedNumber(value: string): number {
  return Number.parseInt(stableHash(value).slice("card-".length), 16) >>> 0;
}

function nextRandom(state: number): number {
  let value = state;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

export function shuffleOptions(
  options: readonly string[],
  seed: string,
): string[] {
  const shuffled = [...options];
  let state = seedNumber(seed) || 0x9e3779b9;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = nextRandom(state);
    const target = state % (index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}
