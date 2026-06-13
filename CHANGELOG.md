# Changelog

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
