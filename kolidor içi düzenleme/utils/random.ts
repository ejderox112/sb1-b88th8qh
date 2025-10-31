
// A simple seedable pseudo-random number generator (PRNG) known as mulberry32.
// This ensures that we can generate the same "random" corridor layout every time
// we visit the same corridor ID.

export function mulberry32(a: number) {
  return function() {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// A simple hashing function to convert any string (like a corridor ID)
// into a 32-bit integer seed for the PRNG.
export function stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
