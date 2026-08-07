# Changelog

## v1.4.0 (2026-08-07)

### Spec v3.5.0 support (keyed-tabular maps, wider value positions)

Built against GCF spec v3.5.0.

- Keyed-tabular map encoding (SPEC 7.2a). The `[N:]` and `[?:]` count brackets (new `keyed_marker` node) now parse in section headers, attachment arrays, and streaming sections, in the anonymous (`## [2:]{key,cpu}`), named (`## servers [2:]{key,cpu}`), and empty-name (`## "" [2:]{key,a}`) wrapper forms. Keyed rows carry a leading key cell followed by the member's value cells; single-value-column and `@id`-prefixed attachment rows are covered.
- Single-cell tabular data rows whose value is a quoted string (`"true"`, `"^{a}"`, `"a|b"`) now parse as a new `quoted_data_row` node, and bare single-word data rows (including non-ASCII values such as `café`) parse as `text_line` instead of dead-ending against an identifier token.
- The graph symbol line's `kind` and `provenance` fields, and the edge line's `status` field, accept quoted and non-ASCII values in more positions. `kind` and `provenance` are matched as whitespace-delimited tokens (GCF structural tokens are matched at the code-point level, SPEC 1), so a leading grapheme-extending scalar parses; `status` is matched verbatim rather than a closed `added`/`removed` set (SPEC 6).
- The `@N ^` / `@N ^{fields}` caret attachment-marker row (SPEC 7.4.4) now parses as an `expanded_item` with a new `attachment_cell` node, including empty-key flatten cases (`## [1]{""}` with `@0 ^` and a `."" {}` attachment).
- Field declarations continue to accept quoted and empty-quoted field names (`{key,""}`, `{""}`, `{"loc>city"}`) in these new keyed and flatten contexts.
- Every payload in the sibling conformance suite (now at spec v3.5.0, 201 parsed payloads) parses with zero `ERROR` nodes; the `npm run test:conformance` allow-list stays empty. Added corpus tests for the keyed-map, caret-row, quoted/non-ASCII value, and non-ASCII graph-field forms.

## v1.3.3 (2026-07-13)

### Full conformance-parse coverage (generic-profile edge cases)

- Quoted keys in key-value lines now parse as `kv_line` instead of falling to the text rule: `"first name"=Alice`, `""=value`, `"123"=value`, `"a.b"=value`, `"line\none"=value`. `text_content` no longer begins with a `"`.
- Section headers accept leading indentation, so nested section headers (`  ## level2`) parse.
- Root and section primitive arrays (`## [3]: a,b,c`) parse.
- Scalar attachments (`.field =value`, e.g. a flattened field name that itself contains `>`, SPEC 7.4.6.1.4) parse.
- With these, every one of the 148 GCF payloads in the sibling conformance suite parses with zero `ERROR` nodes; the `npm run test:conformance` allow-list is now empty. Added corpus tests for each form.

## v1.3.2 (2026-07-13)

### Unknown kinds pass through verbatim (SPEC Section 5)

- The graph symbol line's `kind` field now accepts any identifier, not just the standard abbreviations, so an unknown kind (e.g. `@1 widget pkg.Custom 0.80 ast`) parses and highlights instead of producing an `ERROR` node. SPEC Section 5 requires decoders to accept unknown kind abbreviations verbatim. The `## removed` line keeps the closed kind set (it is not `@`-anchored, so an open set would over-match plain text). Resolves the two remaining graph conformance-parse gaps (`graph-encode/002`, `graph-decode/002`).
- Added a corpus test for an unknown kind.

## v1.3.1 (2026-07-13)

### Graph delta edge and removed lines; conformance parse test

- The graph delta `## edges_added` / `## edges_removed` lines (`source -> target type`) and `## removed` lines (`kind qname`) now parse as `delta_edge_line` and `removed_line` nodes and highlight consistently, instead of falling back to the generic text rule. Both are matched as atomic tokens (the edge form requires `->`, the removed form begins with a known kind abbreviation) so they do not disturb the `@`-prefixed local IDs or keyword tokens.
- New `scripts/parse-conformance.mjs` (`npm run test:conformance`): parses every GCF payload in the sibling `../gcf` conformance suite (~150 real graph, generic, delta, session, and streaming payloads) and ratchets against a known-gaps allow-list, so a new parse regression fails the run. Soft-skips when the spec repo is not checked out alongside.
- Added a corpus test for the delta removed and edge lines.

## v1.3.0 (2026-07-13)

### Spec v3.4.1 support (graph delta distance field, Section 10.1)

- The graph delta `## added` node line carries a trailing `distance` field (e.g. `@0 fn pkg.NewHandler 0.85 lsp 0`); `symbol_line` now accepts the optional sixth field. Previously the trailing distance produced an `ERROR` node. Full-payload symbol lines (five fields) are unaffected.
- New `distance` node, highlighted as `@number`.
- Added a corpus test covering the delta added line with a trailing distance.

## v1.2.0 (2026-07-11)

### Spec v3.3 support (generic-profile delta, Section 10a)

- Field declarations now accept the `@`-prefixed identity column introduced by generic-profile delta, e.g. `## added [1]{@id,total,status,customer}`, `## removed [1]{@id}`, and the delta-participating full base `## orders [3]{@id,...}`. Previously the leading `@` produced an `ERROR` node.
- New `identity_field` node wraps the `@` marker and the field name; highlighted with the `@` as `@punctuation.special` (consistent with local IDs) and the name as `@property`.
- The generic delta/full headers (`delta=true`, `base_root=`, `new_root=`, `key=`, `pack_root=`, `savings=`) already parse as generic `header_pair`s; no header change needed.
- Added a corpus test covering a generic-profile delta payload (added/removed with identity fields).

## v1.1.0 (2026-06-22)

### Spec v3.2 support

- Flattened path columns (`"customer>name"`) parse correctly as quoted field names (no grammar change needed)
- Fixed indented attachment body rows (`    A1`) that previously caused parse errors
- Added `indented_data` rule for bare values under attachments
- Added highlight for indented data as `@string`

## v1.0.0 (2026-06-12)

Spec-compliant grammar for GCF v2.0.0 (inline schema format).

### New Features

- Parse inline schema attachment lines (`.fieldname [N]{fields}`)
- Parse root scalar (`=value`)
- Parse expanded array items (`@N =scalar`, `@N {}`, `@N [N]`)
- Parse quoted field names in field declarations
- Parse summary trailer (`##! summary counts=...`)
- Proper priority ordering prevents fallback rules from consuming structured lines

### Breaking Changes

- Grammar restructured for full spec compliance
- `nested_field` replaced by `attachment_line` (richer AST)
- `text_line` no longer matches lines with `=` or `|` characters
- Bump to v1.0.0 (stable, spec-aligned)

## v0.2.0 (2026-06-10)

- Update for `##! summary` trailer format

## v0.1.0 (2026-06-09)

- Initial release with graph and generic profile parsing
