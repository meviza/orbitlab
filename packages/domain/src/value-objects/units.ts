/** Minimal unit helpers for mass, length, and force at the domain edge. */

export type MassUnit = "kg" | "g" | "lb";
export type LengthUnit = "m" | "cm" | "mm" | "in" | "ft";
export type ForceUnit = "N" | "lbf";

const LB_TO_KG = 0.45359237;
const IN_TO_M = 0.0254;
const FT_TO_M = 0.3048;
const LBF_TO_N = 4.4482216152605;

/** Convert mass to kilograms. */
export function toKilograms(value: number, unit: MassUnit): number {
  switch (unit) {
    case "kg":
      return value;
    case "g":
      return value / 1000;
    case "lb":
      return value * LB_TO_KG;
  }
}

/** Convert length to metres. */
export function toMetres(value: number, unit: LengthUnit): number {
  switch (unit) {
    case "m":
      return value;
    case "cm":
      return value / 100;
    case "mm":
      return value / 1000;
    case "in":
      return value * IN_TO_M;
    case "ft":
      return value * FT_TO_M;
  }
}

/** Convert force to newtons. */
export function toNewtons(value: number, unit: ForceUnit): number {
  switch (unit) {
    case "N":
      return value;
    case "lbf":
      return value * LBF_TO_N;
  }
}
