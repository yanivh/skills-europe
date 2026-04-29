# Subject, Winner, and Repair Logic

This reference mirrors the current project logic in:
- `supabase/functions/ted-search/index.ts`
- `supabase/functions/extract-notices/index.ts`
- `supabase/functions/repair-notices/index.ts`
- `supabase/functions/debug-discrepancies/index.ts`

Use this as the authoritative extraction behavior.

## Field Targets

- Subject field: `scope_summary`
- Winner fields: `winner_name` (primary), `winner_names` (all unique winners)
- Related quality fields: `buyer_name`, `country`, `cpv_codes`, `estimated_value`, `data_complete_financial`

## Subject (`scope_summary`) Extraction

### 1) Ingestion in `ted-search`

At ingestion time, `scope_summary` is seeded from parsed description text:
- eForms detail path:
  - Prefer lot description: `lots[0].description`
  - Fallback procedure description: `procedure.description`
- Legacy/minimal path:
  - `BT-24-Lot` or `description-lot`
- Stored as:
  - `scope_summary: description ? description.substring(0, 1000) : null`

### 2) AI enrichment in `extract-notices`

`extract-notices` processes notices where `scope_summary IS NULL`:
- Builds prompt input from `raw_data` fields:
  - `CONTENT`, `content`, `description-lot`, `BT-24-Lot`, `short-description`
  - plus title fields (`TI`, `title-proc`, `title-lot`)
- Requests AI output including `scope_summary` (2-3 sentences) and tags
- Fallback guard to prevent re-processing loops:
  - If AI misses, set `scope_summary` to `Procurement notice ${title}`

### 3) Repair-time summary in `repair-notices`

When summary is missing/placeholder:
- Build summary input by combining:
  - notice title
  - JSON detail descriptions (procedure + lots)
  - XML descriptions (`legacy` or `eForms` parser)
- If assembled input length >= `MIN_SUMMARY_INPUT_LENGTH` (100):
  - queue AI 4-5 sentence summary generation
- Else:
  - fallback `scope_summary = "Procurement notice: ${title}"`

## Winner Extraction

### 1) Ingestion in `ted-search` (JSON first)

For eForms full details:
- Collect parties with role `contractor` or `tenderer`
- Extract organization names (`officialName` / `name`)
- Deduplicate into `winner_names`
- Set `winner_name = winner_names[0]`
- Guard:
  - If all winner candidates equal `buyer_name`, discard as suspicious

For legacy/incomplete notices:
- Attempt XML fallback parsing and fill winner if still missing

### 2) XML winner parser in `ted-search`

Winner extraction precedence:
1. eForms organization with explicit `winner` role
2. eForms LotResult `selec-w` chain:
   - `LotResult -> LotTender -> TenderingParty -> Tenderer -> Organization`
3. eForms `tenderer` role fallback
4. Legacy contractor patterns:
   - `CONTRACTOR / OFFICIALNAME`
   - `ECONOMIC_OPERATOR_NAME`
5. Deduplicate and return first as `winner_name`
6. Guard:
   - Remove winners matching buyer name

### 3) Winner repair in `repair-notices`

Repair is triggered when:
- winner missing/placeholder, or
- winner equals buyer (suspicious)

Repair order:
1. JSON detail extraction from contractor/tenderer parties
2. If unresolved (or legacy), XML extraction:
   - `parseLegacyXmlWinner` for legacy TED XML
   - `parseEformsXmlWinner` for eForms XML
3. Always filter out winner values equal to buyer name
4. Persist both:
   - `winner_name` (first)
   - `winner_names` (all unique)

Cycle guard:
- For suspicious winner=buyer cases, set `raw_data._winner_buyer_checked = true`

## Missing-Data Repair Behavior

`repair-notices` treats placeholders as missing.

### Placeholder rules

String placeholders include:
- `unknown`, `not specified`, `not available`, `n/a`, `na`, `-`, `none`, `tbd`, `not applicable`

Other missing conditions:
- `cpv_codes` empty or non-8-digit entries only
- `estimated_value` null, NaN, or <= `1.0` (token threshold)

### Notice eligibility

A notice is considered for repair when it has:
- missing buyer/country/cpv/value/summary/winner, or
- suspicious winner=buyer

But it skips already-enriched notices unless critical gaps remain:
- critical: buyer, country, winner

### Extraction precedence per notice

1. JSON detail fetch from TED notice endpoint
2. Fill missing fields from JSON (buyer/country/cpv/value/winner)
3. If gaps remain or notice is legacy: XML fallback
4. For country only: final fallback from `raw_data['organisation-country-buyer']`
5. Validate before write:
- country must be ISO-like 2/3 uppercase letters
- cpv must be 8 digits (dedupe)
- value must be > 1
6. Stamp metadata:
- `raw_data._repair_attempted_at` each attempt
- preserve/merge existing raw_data flags

## Practical Guidance for Skill Use

When the user asks how subject/winner fields are produced:
- Explain three phases explicitly:
  1. `ted-search` ingestion extraction
  2. `extract-notices` AI enrichment
  3. `repair-notices` placeholder-aware repair

When recommending fixes:
- Keep existing precedence and guards unchanged
- Avoid introducing winner extraction that can reinsert buyer as winner
- Keep token-value threshold behavior (`<= 1`) consistent with current logic

## Diagnostics and Missing-Value Fix Flow

The diagnostics UI (`src/pages/Diagnostics.tsx`) and hook (`src/hooks/useDiagnostics.ts`) call:
- `debug-discrepancies` for root-cause classification
- optional repair trigger (`triggerRepair=true`) which calls `repair-notices`

Diagnosis categories used in UI:
- `detail_fetch_failed`
- `legacy_xml_or_mapping_gap`
- `token_value_filtered`
- `mapping_parser_gap`
- `upstream_api_field_absent_or_unknown`

Recommended fix sequence:
1. Run diagnostics on latest completed query run.
2. Trigger one repair batch (`repair-notices`) from diagnostics.
3. Re-run diagnostics and compare category counts.
4. For persistent `mapping_parser_gap`, inspect `raw_data` sample paths and patch extraction in `repair-notices`.
5. For persistent `legacy_xml_or_mapping_gap`, extend legacy/eForms XML parser patterns in `repair-notices`.
