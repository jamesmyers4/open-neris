# NERIS dispatch call timestamp order: arrival, answering, create

## Question

`vendor/neris-framework/core_schemas/modules/csv/dispatch/core_mod_dispatch.csv` defines
three dispatch-call timestamps (`dispatch_time_call_arrival`, `dispatch_time_call_answering`,
`dispatch_time_call_create`). The raw module CSV/YML don't state their intended chronological
order directly, and the two derived "computed" duration fields reference them inconsistently.
This doc establishes the correct order and its evidentiary basis.

## Answer

**`dispatch_time_call_arrival` → `dispatch_time_call_answering` → `dispatch_time_call_create`**
(earliest to latest). Equivalently: `call_arrival <= call_answered <= call_create`.

## Primary evidence (definitive)

The **NERIS Technical Reference Guide (DRAFT, March 2025)**, published by FSRI and linked from
the official NERIS technical-reference page, states this explicitly as an API validation rule:

> **7. API Validation Rules**
> **Incident Response General**
> 1. *call_arrival* must **not be after** *call_create*.
> 2. *call_arrival* must **not be after** *call_answered*.
> 3. *call_answered* must **not be after** *call_create*.

Source: `NERIS-Technical-Reference-Guide-DRAFT.pdf`, page 10 (rule 1) / page 11 (rules 2–3),
section "7. API Validation Rules" → "Incident Response General".
URL: https://neris-prod-public.s3.us-east-2.amazonaws.com/docs/NERIS-Technical-Reference-Guide-DRAFT.pdf
(linked from the "Draft Technical Guide" entry on https://neris.fsri.org/technical-reference).

These three inequalities are jointly equivalent to `call_arrival ≤ call_answered ≤ call_create`
— i.e. the call arrives at the PSAP/dispatch center first, is then answered, and the CAD/dispatch
record is created last. This is a Pydantic-model-validator-enforced rule in the live NERIS API
(per the guide's "Data Quality" framing, this falls under "Suspenders Only" — API-validator
enforced, not necessarily DB-enforced), so it is the authoritative ordering, not merely a
convention.

## Corroborating evidence

### 1. Example values embedded in the vendor CSV/YML themselves

`vendor/neris-framework/core_schemas/modules/csv/dispatch/core_mod_dispatch.csv:14-16`
(same content in `core_schemas/modules/yml/dispatch/core_mod_dispatch.yml:229-284`):

| field | map_orm_landing | example |
|---|---|---|
| `dispatch_time_call_arrival` | `dispatch.call_arrival` | `2024-05-03T18:56:56+00:00` |
| `dispatch_time_call_answering` | `dispatch.call_answering` | `2024-05-03T18:56:57+00:00` |
| `dispatch_time_call_create` | `dispatch.call_open` | `2024-05-03T18:56:58+00:00` |

The example timestamps are already in arrival < answering < create order (56s, 57s, 58s),
consistent with the validation rule above. Given the PDF confirms this is the real intended
order (not filler), this corroborates rather than merely coincides.

### 2. General 911/PSAP call-handling convention

Independent of NERIS, standard CAD/PSAP workflow is: a 911 call **arrives** at the PSAP (hits
the queue/ringing), is then **answered** by a call-taker, and the formal incident/CAD **record
is created** (opened) as the call-taker enters details — sometimes with call creation trailing
answering by seconds as data entry begins. This matches the NERIS-mandated order and is also
consistent with NFIRS's legacy analog, where "PSAP Call Date/Time" (call received) precedes the
"Alarm Date/Time" (dispatch center notified/CAD entry). This is background convention, not a
NERIS-specific citation, but it is consistent with, and does not contradict, the definitive rule
found above.

## Notes on the inconsistent "computed" duration fields (why they don't cleanly resolve this on their own)

`core_mod_dispatch.csv:17-18` define two computed Time Delta fields whose `map_app`/`comments`
columns are internally sloppy about which field is "call open time":

- `dispatch_time_alarm_answering`: `map_orm_landing = dispatch.call_answering - dispatch.call_arrival`,
  `definition = "Time between call being opened and when call was answered."`,
  `comments = "call_open_time - psap_call_answering_time"`.
  The `map_orm_landing` formula actually subtracts *arrival* from *answering* (not "call_open"/create
  at all) — the `definition` and `comments` text sloppily use "call being opened"/"call_open_time" to
  mean *call_arrival*, not `dispatch_time_call_create` (whose landing field is literally
  `dispatch.call_open`). This is very likely a documentation/comment error — conflating the informal
  phrase "call opened" (the call started/arrived) with the distinct field
  `dispatch_time_call_create` → `dispatch.call_open`.
- `dispatch_time_alarm_processing`: `map_orm_landing = dispatch.call_arrival - unit_response.time_dispatch`,
  `definition = "Time between call open time and first unit dispatch."`,
  `comments = "dispatch_time - call_open_time"`.
  Same issue: "call open time" in the definition/comments refers to `call_arrival`, again colliding
  in wording (but not in landing column) with the `call_open` name used for `dispatch_time_call_create`.

Because both computed fields use the informal phrase "call open(ed)" to mean *call_arrival* while a
differently-named field (`dispatch_time_call_create`) is the one actually mapped to the DB column
literally called `call_open`, these two rows cannot be used to resolve the ordering question — they
are corroborating evidence of sloppy internal terminology, not a reliable signal. The PDF's explicit
`call_arrival ≤ call_answered ≤ call_create` validation rule is the tie-breaker.

## Sources checked

- `vendor/neris-framework/core_schemas/modules/csv/dispatch/core_mod_dispatch.csv` (local submodule checkout)
- `vendor/neris-framework/core_schemas/modules/yml/dispatch/core_mod_dispatch.yml` (local submodule checkout)
- `vendor/neris-framework/README.md` (points to Swagger/Redoc API docs and the GitHub wiki)
- `git log --oneline -- core_schemas/modules/csv/dispatch/core_mod_dispatch.csv` inside the submodule — only
  one commit (`76e8dcb add secondary schema yaml and csv files`), no incremental history to mine for intent.
- `https://github.com/ulfsri/neris-framework/wiki` and `.../wiki/ERD` — wiki pages largely failed to render
  via fetch (image-based ERD diagrams; text extraction found no relevant timestamp-order content).
- `https://github.com/ulfsri/neris-framework/discussions` — no discussion threads specifically address
  dispatch timestamp ordering (checked; closest are #34, #33, #16, none relevant).
- `https://neris.fsri.org/technical-reference` — landing page linking to the Draft Technical Guide PDF and
  Data Dictionary.
- `https://neris.fsri.org/data-dictionary` — dynamic module-selector app; could not be queried directly for
  the dispatch module via fetch (no static URL for the dispatch module content).
- **`https://neris-prod-public.s3.us-east-2.amazonaws.com/docs/NERIS-Technical-Reference-Guide-DRAFT.pdf`
  — definitive source, see above.**
- `https://api.neris.fsri.org/v1/docs` / `/v1/redoc` / `/v1/openapi.json` — attempted; OpenAPI schema
  descriptions did not surface cross-field ordering constraints in fetched excerpts (cross-field validators
  generally aren't expressed in OpenAPI schema text, consistent with the PDF's note that these are enforced
  via Pydantic model validators rather than field-level schema).
