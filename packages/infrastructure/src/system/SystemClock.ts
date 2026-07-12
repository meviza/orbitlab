import type { ClockPort } from "@orbitlab/domain";

/** Production clock using the host environment's wall time. */
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
