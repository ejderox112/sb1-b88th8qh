export function generateHash(input: string): string {
  const hash = new TextEncoder().encode(input);
  let result = 0;
  for (let i = 0; i < hash.length; i++) {
    result = (result << 5) - result + hash[i];
    result |= 0;
  }
  return Math.abs(result).toString();
}