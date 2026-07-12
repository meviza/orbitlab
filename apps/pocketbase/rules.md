# PocketBase API rules — OrbitLab

Rules live in `pb_schema.json` and are enforced server-side. Clients must never be trusted for plan or ownership checks.

Auth field syntax uses modern PocketBase: `@request.auth.id`, `@request.auth.plan`, etc.

## users (auth)

| Action | Rule | Intent |
|--------|------|--------|
| list | `id = @request.auth.id` | Users only see themselves |
| view | `id = @request.auth.id` | Same |
| create | `""` (empty = public) | Open registration |
| update | self + **locked entitlement fields** | Profile edits only |
| delete | `id = @request.auth.id` | Account self-delete |

**Entitlement lock (updateRule):**

```
id = @request.auth.id
&& (@request.body.plan:isset = false || @request.body.plan = plan)
&& (@request.body.edu_verified:isset = false || @request.body.edu_verified = edu_verified)
```

- Clients cannot elevate `plan` or flip `edu_verified`.
- Ops change those fields via Admin UI or a trusted webhook / superuser script.

## designs

| Action | Rule |
|--------|------|
| list / view / update / delete | `owner = @request.auth.id` |
| create | `@request.auth.id != "" && owner = @request.auth.id` |

Owner-only CRUD. No public designs in MVP (add a `visibility` field later if sharing is needed).

## sim_runs

| Action | Rule |
|--------|------|
| list / view / update / delete | `owner = @request.auth.id` |
| create | `@request.auth.id != "" && owner = @request.auth.id` |

Owner-scoped. Do not allow updating another user's run summaries.

Optional hardening (hooks / future rule): require `design.owner = @request.auth.id` so a user cannot attach a sim_run to someone else's design id.

## sensor_devices (pro / edu)

| Action | Rule |
|--------|------|
| list / view / update / delete | `owner = @request.auth.id && (@request.auth.plan = "pro" \|\| @request.auth.plan = "edu")` |
| create | authenticated owner + pro/edu plan |

**Notes:**

- Free-tier users cannot list or create devices (API returns empty / 403).
- Store only `token_hash` (never raw device tokens in the DB).
- `token_hash` field is marked `hidden` in the schema so it is omitted from default API responses.

## sensor_samples (pro / edu)

| Action | Rule |
|--------|------|
| list / view | `device.owner = @request.auth.id` + pro/edu plan |
| create | pro/edu + `device.owner = @request.auth.id` |
| update | `null` (immutable after write) |
| delete | device owner + pro/edu |

**Notes:**

- Samples are append-mostly; updates disabled to protect audit integrity.
- Device-token ingest (unattended hardware) should **not** use end-user JWT long-term; prefer a small authenticated edge path or PB hook that validates a hashed token and creates samples as superuser. Documented as a follow-up in PRODUCT/ARCHITECTURE.

## Superuser / Admin

- PocketBase **superusers** (`_superusers`) bypass collection rules.
- Use Admin UI for ops: plan upgrades, edu verification, abuse cleanup.
- Never ship superuser credentials to `apps/web`.

## Checklist before production

1. Registration rate limits / captcha (proxy or PB hooks).
2. Payment webhook uses superuser token **server-side only** to set `plan`.
3. Confirm `plan` / `edu_verified` cannot be changed via browser DevTools.
4. Rotate any seed demo passwords.
5. Review sensor token hashing (e.g. SHA-256 of high-entropy secret).
