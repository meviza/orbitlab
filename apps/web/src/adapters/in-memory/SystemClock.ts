import type { ClockPort } from "@orbitlab/domain";

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
