/**
 * Classical RK4 step for 1D ODE: y' = f(t, y).
 */
export function rk4Step(
  f: (t: number, y: number) => number,
  t: number,
  y: number,
  dt: number
): number {
  const k1 = f(t, y);
  const k2 = f(t + dt / 2, y + (dt / 2) * k1);
  const k3 = f(t + dt / 2, y + (dt / 2) * k2);
  const k4 = f(t + dt, y + dt * k3);
  return y + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

/**
 * Integrate a first-order 1D ODE with fixed-step RK4.
 */
export function integrateRk41D(
  f: (t: number, y: number) => number,
  y0: number,
  t0: number,
  tEnd: number,
  dt: number,
  shouldStop?: (t: number, y: number) => boolean
): Array<{ t: number; y: number }> {
  const samples: Array<{ t: number; y: number }> = [{ t: t0, y: y0 }];
  let t = t0;
  let y = y0;

  while (t < tEnd) {
    const step = Math.min(dt, tEnd - t);
    y = rk4Step(f, t, y, step);
    t += step;
    samples.push({ t, y });
    if (shouldStop?.(t, y)) break;
  }

  return samples;
}

/**
 * RK4 for the 2-state vertical system:
 *   h' = v
 *   v' = a(t, h, v)
 */
export function rk4VerticalStep(
  accel: (t: number, h: number, v: number) => number,
  t: number,
  h: number,
  v: number,
  dt: number
): { h: number; v: number } {
  // state s = [h, v]; s' = [v, a]
  const a1 = accel(t, h, v);
  const dh1 = v;
  const dv1 = a1;

  const a2 = accel(t + dt / 2, h + (dt / 2) * dh1, v + (dt / 2) * dv1);
  const dh2 = v + (dt / 2) * dv1;
  const dv2 = a2;

  const a3 = accel(t + dt / 2, h + (dt / 2) * dh2, v + (dt / 2) * dv2);
  const dh3 = v + (dt / 2) * dv2;
  const dv3 = a3;

  const a4 = accel(t + dt, h + dt * dh3, v + dt * dv3);
  const dh4 = v + dt * dv3;
  const dv4 = a4;

  return {
    h: h + (dt / 6) * (dh1 + 2 * dh2 + 2 * dh3 + dh4),
    v: v + (dt / 6) * (dv1 + 2 * dv2 + 2 * dv3 + dv4),
  };
}
