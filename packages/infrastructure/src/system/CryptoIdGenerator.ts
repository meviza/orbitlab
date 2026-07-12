import type { IdGeneratorPort } from "@orbitlab/domain";

/**
 * Generates opaque ids using Web Crypto when available.
 */
export class CryptoIdGenerator implements IdGeneratorPort {
  nextId(): string {
    const bytes = randomBytes(12);
    return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
  }
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  const cryptoObj =
    typeof globalThis !== "undefined"
      ? (globalThis as { crypto?: Crypto }).crypto
      : undefined;

  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(out);
    return out;
  }

  for (let i = 0; i < length; i++) {
    out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}
