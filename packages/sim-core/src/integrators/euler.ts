/**
 * Explicit Euler step for 1D ODE: y' = f(t, y).
 * y_{n+1} = y_n + dt * f(t_n, y_n)
 */
export function eulerStep(
  f: (t: number, y: number) => number,
  t: number,
  y: number,
  dt: number
): number {
  return y + dt * f(t, y);
}

/**
 * Integrate a first-order 1D ODE with fixed-step Euler.
 * Returns samples of { t, y } including the initial state.
 */
export function integrateEuler1D(
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
    y = eulerStep(f, t, y, step);
    t += step;
    samples.push({ t, y });
    if (shouldStop?.(t, y)) break;
  }

  return samples;
}

/**
 * 1D vertical flight state: [altitude h, velocity v].
 * a = f(t, h, v) — acceleration.
 * Explicit Euler: v += a*dt, h += v*dt (semi-implicit on h uses updated v).
 */
export function eulerVerticalStep(
  accel: (t: number, h: number, v: number) => number,
  t: number,
  h: number,
  v: number,
  dt: number
): { h: number; v: number } {
  const a = accel(t, h, v);
  const vNext = v + a * dt;
  const hNext = h + vNext * dt; // semi-implicit (symplectic-ish) for stability
  return { h: hNext, v: vNext };
}
