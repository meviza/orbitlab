# How advanced math works in OrbitLab

This answers: *“İleri seviye matematiksel hesaplamaları nasıl yapacağız?”*

**Short answer:** The database never “does calculus.” Physics and numerics live in **versioned calculation modules** inside `packages/sim-core` (and later optional WASM). PocketBase only stores users, designs, run metadata, files, and entitlements (which modules a plan may use).

---

## Separation of concerns

| Layer | Responsibility | Example |
|-------|----------------|---------|
| **UI** | Pick parts, params, which modules to run, show charts/3D | “Run with drag + RK4” |
| **sim-core modules** | Equations, integrators, stability, optimizers | \(\dot{\mathbf{x}} = f(t,\mathbf{x})\) |
| **report engine** | Turn module *trace* into human steps (PDF/CSV) | Exam-style writeup |
| **PocketBase** | Auth, plan flags, save design JSON, store PDF/CSV, sensor logs | `plan = pro` |
| **Desktop** | Same sim-core offline | Lab without internet |

If math lived only in SQL, you could not do real ODE integration, step-by-step proofs, or offline desktop. So: **compute in code, persist results in DB**.

---

## Module contract (every calculation)

Each module is a small, testable unit:

```ts
interface CalcModule<I, O> {
  id: string;                 // e.g. "aero.barrowman.cp"
  title: { tr: string; en: string };
  tier: "free" | "pro";
  references: string[];       // papers / textbooks (not GPL code)
  assumptions: string[];      // for the report
  equations: EquationStep[];  // LaTeX + prose for report engine
  run(input: I, ctx: SimContext): O | Promise<O>;
}
```

**Rules:**

1. **Inputs/outputs have units** (SI preferred; convert at edges).
2. **Deterministic** given the same seed (Monte Carlo uses explicit RNG seed).
3. **No network I/O** inside modules (keeps tests + desktop pure).
4. **Trace optional:** modules can emit intermediate steps for the report.
5. **Tier gate** is checked by the app using PocketBase entitlement — module code may ship in free builds but refuse to run without pro flag *or* pro modules are code-split.

---

## How “sınav çözümü” reports are produced

```
User design + selected modules
        │
        ▼
   sim-core.runPipeline()
        │  each module returns { result, steps[], series[] }
        ▼
   report engine
        │  KaTeX/Markdown templates fill numbers into formulas
        ▼
   CSV (time series) + PDF/HTML (step-by-step)
        │
        ▼
   optional upload to PocketBase file storage
```

Example step (conceptual):

1. State assumption: constant mass \(m\), 1D vertical motion.  
2. Newton II: \( m a = T - mg - D \).  
3. Drag: \( D = \tfrac12 \rho v^2 C_D A \).  
4. Integrate with RK4, \(\Delta t = 0.01\,\mathrm{s}\).  
5. Table of \(t, h, v\).

The student sees **the same math the code used**, not a black box.

---

## Free vs pro math (product mapping)

| Tier | What we implement | Techniques |
|------|-------------------|------------|
| **Free** | Model-rocket class flight | Algebraic mass props, simple drag, Euler/RK4 3DOF, Barrowman-class CP, thrust-curve interpolation |
| **Pro** | HPR / sounding / research-oriented | 6DOF rigid body, better atmosphere/wind, sensitivity, Monte Carlo, parameter optimization, stiffer ODE solvers, optional higher-fidelity aero tables |

“Limit, türev, integral, diferansiyel denklem, sayısal yöntemler” are not separate marketing checkboxes alone — they appear **inside modules**:

- **Derivative / Jacobian** → linearization, sensitivity, optimization  
- **Integral** → impulse \(I = \int T\,dt\), work, accumulated error metrics  
- **ODE / DE** → trajectory \(\dot x = f(x,t)\)  
- **Numerical methods** → Euler, RK4, adaptive step, root-finding for apogee time  

Community can **request** new modules (issue template); maintainers implement under this contract + golden tests.

---

## Implementation phases for math

1. **TS pure functions + unit tests** with known analytic cases (e.g. no-drag vertical flight).  
2. **Web Worker** so UI/3D never freezes.  
3. **Golden trajectories** checked in CI (JSON fixtures).  
4. **Optional C/Rust → WASM** only for hot loops (Monte Carlo, fine \(\Delta t\)).  
5. **Pro pack** as separate package or feature flag build.

---

## What PocketBase does *not* do

- Solve ODEs  
- Generate formula steps  
- Validate flight safety  

PocketBase **does**:

- Who is logged in and which plan they have  
- Store design + last sim summary  
- Host exported PDF/CSV  
- Ingest sensor rows (pro) for later comparison to sim  

---

## Trust model

- Open formulas + tests → academic trust  
- Pro claims must cite methods in module `references`  
- Disclaimer: educational / engineering aid, not certification  

See also [ARCHITECTURE.md](./ARCHITECTURE.md) and [FEATURE-MATRIX.md](./FEATURE-MATRIX.md).
