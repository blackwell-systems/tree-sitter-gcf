# Changelog

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
