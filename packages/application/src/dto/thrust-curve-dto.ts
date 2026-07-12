/**
 * Thrust-curve import DTOs (CSV motor table → samples + derived metrics).
 */

/** One thrust sample: time [s], thrust [N]. */
export interface ThrustSampleDto {
  readonly t: number;
  readonly n: number;
}

export interface ThrustCurveDto {
  readonly samples: readonly ThrustSampleDto[];
  /** Total impulse via trapezoidal integration ∫ T dt [N·s]. */
  readonly impulseNs: number;
  /** Burn duration: last sample time − first sample time [s]. */
  readonly burnTimeS: number;
  /** Peak thrust on the curve [N]. */
  readonly peakThrustN: number;
  /** Optional label from the import command (e.g. design / motor name). */
  readonly designTitle?: string;
}

export interface ImportThrustCurveCommand {
  /** Raw CSV text: columns `t,n` or `time,thrust` (header optional). */
  readonly csvText: string;
  readonly designTitle?: string;
}
