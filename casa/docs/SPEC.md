# casa — technical spec (LLM reference)

Rebuild target: SvelteKit. The existing vanilla HTML/JS app
(`casa_input_1.html`, `casa_input.js`) is the source of truth for behaviour —
its logic works correctly today and should be ported, not reinvented.
`intent.prompt` is the original brief; its content is folded into this file
and it does not need to be re-read once this spec is current.

Status: RESOLVED — all open questions answered below. Still waiting on an
explicit "OK" before any scaffolding/build work starts.

## Project Structure

```
casa-svelte
├── package.json
├── src
│   ├── app.d.ts
│   ├── app.html
│   ├── lib
│   │   ├── api.ts            # PocketBase fetch wrappers (auth, CRUD)
│   │   ├── auth.ts            # session store, persistence, refresh
│   │   ├── validation.ts      # validateForCreate / validateForUpdate stubs
│   │   ├── derive.ts           # status derivation, countdown, coord parsing
│   │   ├── format.ts          # money/date formatting
│   │   └── components/
│   │       ├── LoginPanel.svelte
│   │       ├── PropertyForm.svelte
│   │       ├── PropertyCard.svelte
│   │       ├── PropertyDetail.svelte   # read-only view (task 12)
│   │       └── DryRunPanel.svelte
│   └── routes/
│       └── +page.svelte       # single route, component-level view state
├── static
│   ├── favicon.png
│   └── robots.txt
├── tsconfig.json
└── vite.config.ts
```

Single route, kept as close to the current SPA feel as possible. Form / list
/ detail are component-level view state (a local `view` variable), same
pattern as today's `.active` class toggling — just done in Svelte instead of
manual DOM classlist manipulation. No SvelteKit routing overhead for a
localhost-only, single-user tool.

## Deployment

Localhost only. No CORS concerns to design around, no SSR/adapter concerns
beyond what SvelteKit does by default. `BASE_URL` stays a plain constant
(`https://api.alj.cx`) as today.

## Auth

Single hardcoded user: `x@alj.cx`. Only a password is prompted. Password is
never stored; only the returned token + user record are persisted.

```
POST https://api.alj.cx/api/collections/users/auth-with-password
Content-Type: application/json
{ "identity": "x@alj.cx", "password": "<password>" }

→ 200 { "token": "<JWT>", "record": { id, email, name, ... } }
```

Session refresh on load:

```
POST https://api.alj.cx/api/collections/users/auth-refresh
Authorization: <token>

→ 200 { "token": "<JWT>", "record": {...} }
```

- Persist `{ token, record }` in `localStorage` under `casa_auth` (guard all
  access behind a `browser` check — SvelteKit SSR has no `window`).
- On refresh failure, clear persisted auth and fall back to unauthenticated.
- Unauthenticated users can still fill out and "submit" the form; submit
  becomes a dry run that renders the payload instead of POSTing.

## CRUD API

Confirmed: id goes in the URL for PATCH and DELETE (the existing JS is
correct; `intent.prompt`'s omission of `/<id>` was a documentation typo).

```
GET    https://api.alj.cx/api/collections/casa_properties/records?sort=-created
       Authorization: <token>

POST   https://api.alj.cx/api/collections/casa_properties/records
       Authorization: <token>
       Content-Type: application/json
       <payload>

PATCH  https://api.alj.cx/api/collections/casa_properties/records/<id>
       Authorization: <token>
       Content-Type: application/json
       <payload>

DELETE https://api.alj.cx/api/collections/casa_properties/records/<id>
       Authorization: <token>
```

Validation hooks: `validateForCreate(payload)` and `validateForUpdate(payload,
id)` remain as extension points (currently no-ops returning
`{ valid: true, errors: [] }`), called before any authenticated POST/PATCH.
The dry-run path (unauthenticated) skips validation entirely, matching
current behaviour.

## Data model

PocketBase collection `casa_properties`.

| field              | type                                              | notes |
|--------------------|---------------------------------------------------|-------|
| id                 | string                                             | PB record id |
| address            | string, required                                   | |
| url                | string (url)                                       | listing URL |
| contact            | string                                             | free text; user types their own `tel:`/`mailto:` prefixes, see Contact below |
| coordinates        | `{ lat: number, lon: number }`                     | UI collects as a single normalized `"lat,lon"` text field, split on submit |
| distance_from_ref  | number, **read-only** (task 7)                     | computed client-side from a hardcoded reference point, see below |
| status             | enum: QUEUED / SCHEDULED / REJECTED / ACCEPTED, **derived, not directly user-edited** | see Status derivation below |
| verdict            | enum: UNDECIDED (default) / YES / NO / MAYBE, **user-editable** | drives `status` |
| tour_requested     | boolean                                             | placed near geo fields (task 4); forced `true` whenever `tour_date` is set |
| tour_date          | datetime (date **and** time)                        | placed near geo fields (task 4); drives countdown in list view (task 0) and `status` |
| navigation_url     | string, `mapfwd.com/<url>`                          | computed client-side by prepending `mapfwd.com/` to the `url` field value |
| has_parking        | boolean (chip)                                      | |
| parking_nearby     | boolean (chip)                                      | |
| has_storage        | boolean (chip)                                      | |
| has_gym            | boolean (chip)                                      | |
| has_pool           | boolean (chip)                                      | |
| is_furnished       | boolean (chip)                                      | |
| laundry_type       | enum: `coin-operated` / `in-unit` / `none`          | `shared` renamed to `coin-operated` |
| cost_base          | number, required                                    | moved to top of form near address (task 3) |
| cost_heat          | number, default 80                                  | |
| cost_water         | number, default 0                                   | |
| cost_power         | number, default 80                                  | |
| cost_internet      | number, default 65                                  | |
| cost_laundry       | number, default 35                                  | |
| cost_parking       | number, default 0                                   | |
| cost_other         | map `{ [label: string]: number }`                   | dynamic add/remove rows |
| reviews            | string                                               | hidden/expandable field in UI (task 8) |
| notes              | string (HTML)                                        | `assessment` is fully removed — no field, no fallback, no migration |
| nabila_rating      | number 1–10                                          | |
| score              | number, **read-only, server-computed**              | scoring polynomial not yet implemented server-side — out of scope for this rebuild, just render whatever the backend returns (or blank) |
| move_in            | date (no time component)                             | |
| created / updated  | datetime                                             | server-managed |

`assessment` is removed entirely — no field in the form, no read fallback for
old records that may still have it in the backend.

### Status derivation

`status` is not a user-editable field. It's computed client-side from
`verdict` and `tour_date`, and the computed value is included in the
POST/PATCH payload (so it's queryable server-side too). Precedence — verdict
checked first, then `tour_date`:

```
if verdict == 'NO':        status = REJECTED
else if verdict == 'YES':  status = ACCEPTED
else if tour_date is set:  status = SCHEDULED
else:                       status = QUEUED
```

Clearing `tour_date` (while verdict stays UNDECIDED/MAYBE) falls back to
QUEUED. `verdict` is a user-editable select on the form.

### `tour_requested` / `tour_date` coupling

Setting a `tour_date` client-side forces `tour_requested = true`. This is
enforced in the form logic (also acceptable to enforce again server-side, but
that's outside this rebuild's scope).

### Contact

Kept as a single free-text field, unchanged from today. Task 11's clickable
`tel:`/`mailto:` requirement is satisfied by detecting literal `tel:` /
`mailto:` substrings the user types into that field and wrapping just those
substrings in anchors — no parsing/guessing of phone numbers or emails out of
arbitrary text. If the user doesn't type the prefix, nothing gets linkified.

### `distance_from_ref`

Read-only, computed client-side (task 7) as straight-line distance between
the record's `coordinates` and a hardcoded reference point:

```
REF = { lat: 45.29803797253851, lon: -75.91102934582861 }
```

Haversine distance in km, rounded for display. Recomputed whenever the
`lat,lon` field changes; not sent as user input, but still included in the
payload as the computed value.

### `score`

Read-only, computed server-side by a scoring polynomial that does not exist
yet. Out of scope here — the field just displays whatever `score` comes back
on the record (or "—" if absent/null). No client-side formula to implement.

### Cost total

```
total = cost_base + cost_heat + cost_water + cost_power + cost_internet
        + cost_laundry + cost_parking + sum(cost_other.values())
```

Display thresholds (unchanged from current app): `warn` styling above $1300,
`over` styling above $1500.

### Coordinates normalization

Single text input, format `lat,lon`. On submit: strip whitespace, split on
`,`, `parseFloat` each side, build `{ lat, lon }`.

## Post-submission behaviour

After a successful create/update: land on the list view (most recent first),
same as current behaviour — no separate post-submit table. "+ New entry"
button returns to a blank form.

## List view — countdown

Card list shows a countdown to `tour_date` only when `status = SCHEDULED`
**and** `tour_date` is in the future. No countdown otherwise (past date,
non-SCHEDULED status, or no `tour_date`).

## Development tasks (tracked, from intent.prompt)

0. Countdown to `tour_date` in card list — SCHEDULED + future only.
1. `lat`/`lon` collapse into one `"lat,lon"` text field.
3. Move `cost_base` to top of form, right after address.
4. Move `tour_requested` / `tour_date` near the geo fields.
5. Remove `assessment` entirely; use `notes` instead.
6. `score` read-only (server-computed, not yet implemented server-side).
7. `distance_from_ref` read-only (client-computed via Haversine vs. hardcoded ref).
8. `reviews` becomes a hidden/expandable field.
9. "GO" button on cards opens `navigation_url` (`mapfwd.com/<url>`).
10. Link `favicon.png`.
11. `contact` renders clickable `tel:`/`mailto:` links (only literal prefixes the user typed).
12. Read-only property detail view (no edit mode).

Plus: `verdict` is a new user-editable select; `status` is derived, not a
form field.

## Final notes

- CSS is intentionally out of scope here; any styling supplied gets appended
  to the stylesheet, not restructured.
- No build/scaffold work happens until explicit sign-off ("OK") on this spec.
- Compiled Svelte output must behave like the current product (same views,
  same fields, same submit/dry-run/edit/delete flows) — this is a rebuild of
  implementation, not of product behaviour, except where the numbered
  Development Tasks explicitly change behaviour.