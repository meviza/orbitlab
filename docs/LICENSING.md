# Licensing & OpenRocket

## OrbitLab code

Unless noted otherwise, original source in this repository is licensed under the **Apache License 2.0** (see `/LICENSE`).

## OpenRocket

[OpenRocket](https://github.com/openrocket/openrocket) is free software under the **GNU General Public License v3** (or later), with additional permission for non-compilable data files (thrust curves, component databases).

### What that means for us

| Action | Implication |
|--------|-------------|
| Study published algorithms, papers, and UI concepts | Generally OK; reimplement clean-room |
| Copy OpenRocket Java source into this repo | Makes that code (and often the combined work) **GPL-3.0** obligations |
| Distribute a desktop binary that links/embeds GPL code | Source offer + GPL compliance required |
| SaaS-only use of GPL libraries | GPL’s “convey” trigger differs from AGPL; still get legal review before shipping |
| Ship OR data files with GPL extra permission | Possible under OR’s section-7 style permission — verify current LICENSE |

### OrbitLab policy

1. **Default path:** clean-room implementations in TypeScript/WASM under Apache-2.0.
2. **No vendored OpenRocket sources** in this tree without an explicit ADR + license header change for that package.
3. **Attribution:** document inspiration and scientific references in module docs.
4. **Contributors:** do not paste GPL code from OpenRocket or other copyleft projects without maintainers’ written OK.

This is not legal advice. Before commercial launch or any GPL-derived module, run a short counsel review.
