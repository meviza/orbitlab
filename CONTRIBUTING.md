# Contributing to OrbitLab

Thanks for helping build a transparent, educational rocket design platform.

## Ways to contribute

- **Physics / numerics** — new calculation modules with tests + formula docs
- **Frontend** — 3D editor, charts, accessibility, i18n
- **Backend** — Workers API, D1 schema, security of sensor protocol
- **Docs** — tutorials, worked examples, translations (TR/EN first)
- **QA** — edge cases, golden trajectory tests

## Ground rules

1. Read [docs/PRODUCT.md](docs/PRODUCT.md) and [docs/LICENSING.md](docs/LICENSING.md).
2. **No OpenRocket source dumps** without maintainer approval.
3. Prefer small PRs with tests for sim-core changes.
4. Every new calculation module should include:
   - inputs / outputs / units
   - assumptions
   - formula references
   - free vs pro tier proposal
   - unit tests with known values

## Development (as code lands)

```bash
# will be filled when monorepo tooling lands
git clone https://github.com/meviza/orbitlab.git
cd orbitlab
```

## Issue templates

- Bug report
- Feature request
- **Calculation request** (community math modules)

## Code of conduct

Be respectful. Rocketry has real safety stakes — don’t encourage illegal or unsafe flight operations in docs or issues.

## License of contributions

By contributing, you agree your contributions are licensed under Apache-2.0 unless otherwise stated in the PR.
