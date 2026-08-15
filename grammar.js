/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "gcf",

  extras: ($) => [],

  conflicts: ($) => [],

  rules: {
    source_file: ($) => repeat($._line),

    _line: ($) =>
      choice(
        prec(10, $.header),
        prec(9, $.summary_line),
        prec(8, $.section_header),
        prec(8, $.root_scalar),
        prec(7, $.edge_line),
        prec(7, $.delta_edge_line),
        prec(7, $.ref_line),
        prec(7, $.symbol_line),
        prec(7, $.removed_line),
        prec(6, $.comment),
        prec(5, $.attachment_line),
        prec(5, $.indented_data),
        prec(4, $.inline_array),
        prec(3, $.kv_line),
        prec(3, $.expanded_item),
        prec(2, $.tabular_row),
        prec(2, $.quoted_data_row),
        prec(1, $.text_line),
        $.blank_line,
      ),

    blank_line: ($) => /\r?\n/,

    // ---------------------------------------------------------------
    // GCF profile=generic key=value ...
    // ---------------------------------------------------------------
    header: ($) =>
      seq(
        $.gcf_keyword,
        repeat1(seq(" ", $.header_pair)),
        $._newline,
      ),

    gcf_keyword: ($) => "GCF",
    header_pair: ($) => seq($.header_key, "=", $.header_value),
    header_key: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    header_value: ($) => /[^ \n\r]+/,

    // ---------------------------------------------------------------
    // =scalar (root scalar value)
    // ---------------------------------------------------------------
    root_scalar: ($) =>
      seq("=", $.scalar_value, $._newline),

    // ---------------------------------------------------------------
    // ##! summary counts=3 key=val ...
    // ---------------------------------------------------------------
    summary_line: ($) =>
      seq(
        "##!",
        $._ws,
        "summary",
        repeat(seq($._ws, $.kv_pair)),
        $._newline,
      ),

    // ---------------------------------------------------------------
    // ## name [N]{f1,f2}, ## [N]{f1,f2}, ## name
    // ---------------------------------------------------------------
    section_header: ($) =>
      seq(
        optional($._indent),
        "##",
        $._ws,
        optional($.section_name),
        optional(seq(optional($._ws), $.count_bracket)),
        optional($.field_decl),
        // Root/section primitive array: `## [N]: a,b,c`
        optional(seq(":", optional($._ws), $.inline_values)),
        $._newline,
      ),

    section_name: ($) => choice(
      $.quoted_string,
      /[a-zA-Z_][a-zA-Z0-9_]*/,
    ),

    // Count brackets: `[N]`, `[?]` (deferred/streaming), and the keyed-tabular
    // map variants `[N:]` / `[?:]` (SPEC 7.2a). The trailing `:` marks the
    // section as a keyed map: the first field column (`key`) holds the member
    // key and the remaining columns are the member's value fields.
    count_bracket: ($) =>
      seq("[", choice($.count_number, $.deferred_marker), optional($.keyed_marker), "]"),
    count_number: ($) => /\d+/,
    deferred_marker: ($) => "?",
    keyed_marker: ($) => ":",

    // A field declaration lists the columns of a tabular/delta section. In the
    // generic-profile delta form (SPEC Section 10a) the identity column is marked
    // with a leading `@`, e.g. `{@id,total,status,customer}` or `{@id}`.
    field_decl: ($) =>
      seq(
        "{",
        choice($.identity_field, $.field_name),
        repeat(seq(",", choice($.identity_field, $.field_name))),
        "}",
      ),
    identity_field: ($) => seq("@", $.field_name),
    field_name: ($) => choice(
      $.quoted_string,
      /[a-zA-Z_][a-zA-Z0-9_]*/,
    ),

    // ---------------------------------------------------------------
    // @0 fn pkg.Auth 0.78 lsp_resolved (graph profile)
    // ---------------------------------------------------------------
    symbol_line: ($) =>
      seq(
        $.local_id,
        $._ws,
        $.kind,
        $._ws,
        $.qualified_name,
        $._ws,
        $.score,
        $._ws,
        $.provenance,
        optional(seq($._ws, $.distance)),
        $._newline,
      ),

    // Graph delta `## added` node lines carry a trailing distance field
    // (SPEC 3.4.1, Section 10.1); full-payload symbol lines omit it.
    distance: ($) => /\d+/,

    local_id: ($) => seq("@", $.id_number),
    id_number: ($) => /\d+/,
    // A kind abbreviation. The standard table (SPEC Section 5) is fn / type /
    // method / iface / var / const / ..., but decoders MUST accept unknown kinds
    // verbatim (Section 5), so this matches any whitespace-delimited token rather
    // than a closed set. Non-ASCII code points are ordinary content (GCF
    // structural tokens are matched at the code-point level, SPEC 1), so the
    // token is not restricted to ASCII. Safe here because the symbol line is
    // anchored by its `@id` prefix and each field is whitespace-delimited. A
    // leading `=`, `{`, `[`, `^` is excluded so an `@id`-prefixed expanded item
    // (`@0 =scalar`, `@0 {}`, `@0 [N]...`, `@0 ^{fields}`) is not mis-lexed as a
    // symbol line (kinds never begin with a GCF structural marker).
    kind: ($) => /[^\s={\[\^][^\s]*/,
    qualified_name: ($) => /[^\s]+/,
    score: ($) => /\d+\.\d+/,
    // A discovery-method string. Whitespace-delimited, may contain non-ASCII
    // content (e.g. a grapheme-extending leading scalar); see `kind`.
    provenance: ($) => /[^\s]+/,

    // ---------------------------------------------------------------
    // @0<@1 calls [added|removed]
    // ---------------------------------------------------------------
    edge_line: ($) =>
      seq(
        $.target_ref,
        "<",
        $.source_ref,
        $._ws,
        $.edge_type,
        optional(seq($._ws, $.edge_status)),
        $._newline,
      ),

    target_ref: ($) => seq("@", $.id_number),
    source_ref: ($) => seq("@", $.id_number),
    edge_type: ($) => /[a-zA-Z_]+/,
    // Optional trailing status. `added` / `removed` are the documented diff
    // values (SPEC 6), but decoders accept the status verbatim, so this matches
    // any identifier-like token (e.g. `active`) rather than a closed set.
    // Anchored as the final field of the edge line.
    edge_status: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // Graph delta `## edges_added` / `## edges_removed` lines: `source -> target type`.
    // Matched as an atomic token (requires `->` and includes the newline) so it wins
    // over the generic text fallback by length, without disturbing the `@`-prefixed
    // local IDs or keyword tokens the way a bare qualified-name token would.
    delta_edge_line: ($) =>
      token(seq(/[^\s@][^\s]*/, / +/, "->", / +/, /[^\s]+/, / +/, /[a-zA-Z_]+/, /\r?\n/)),

    // Graph delta `## removed` lines: `kind qname` (identity only). Atomic token that
    // begins with a known kind abbreviation followed by a single qualified name.
    removed_line: ($) =>
      token(
        seq(
          choice(
            "fn", "type", "method", "iface", "var", "const",
            "resource", "table", "class", "selector", "field",
            "route", "ext", "file", "pkg", "svc",
          ),
          / +/,
          /[^\s]+/,
          /\r?\n/,
        ),
      ),

    // ---------------------------------------------------------------
    // @0  # previously transmitted
    // ---------------------------------------------------------------
    ref_line: ($) =>
      token(seq(/@\d+/, /  # previously transmitted/, /\n/)),

    // ---------------------------------------------------------------
    // # comment text
    // ---------------------------------------------------------------
    comment: ($) =>
      token(seq("# ", /[^\n]*/, /\n/)),

    // ---------------------------------------------------------------
    // .fieldname {}, .fieldname [N]: vals, .fieldname [N]{fields}
    // ---------------------------------------------------------------
    attachment_line: ($) =>
      seq(
        optional($._indent),
        ".",
        $.attachment_name,
        $._ws,
        choice(
          $.attachment_object,
          $.attachment_array,
          // Scalar attachment: `.field =value` (e.g. a flattened field name that
          // itself contains `>`, which cannot be a path column: SPEC 7.4.6.1.4)
          seq("=", $.scalar_value),
        ),
        $._newline,
      ),

    attachment_name: ($) => choice(
      $.quoted_string,
      /[a-zA-Z_][a-zA-Z0-9_]*/,
    ),

    attachment_object: ($) => "{}",

    attachment_array: ($) => seq(
      $.count_bracket,
      optional(choice(
        seq($.field_decl, optional(seq(optional($._ws), $.tabular_row_inline))),
        seq(":", optional(seq($._ws, $.inline_values))),
      )),
    ),

    inline_values: ($) => /[^\n]+/,
    tabular_row_inline: ($) => /[^\n]+/,

    // ---------------------------------------------------------------
    // name[N]: val1,val2,val3
    // ---------------------------------------------------------------
    inline_array: ($) =>
      seq(
        optional($._indent),
        $.inline_array_name,
        $.count_bracket,
        ":",
        optional(seq($._ws, $.inline_values)),
        $._newline,
      ),

    inline_array_name: ($) => choice(
      $.quoted_string,
      /[a-zA-Z_][a-zA-Z0-9_]*/,
    ),

    // ---------------------------------------------------------------
    // @N =scalar, @N {}, @N [N]: vals, @N [N]{fields}, @N ^, @N ^{fields}
    // ---------------------------------------------------------------
    // The `@N ^` / `@N ^{fields}` forms are a single-column tabular row whose
    // sole cell is an attachment-marker caret (SPEC 7.4.4: `attachment-cell =
    // "^" / "^" field-decl`). A row with a `^` cell requires the `@{id}` prefix
    // (SPEC 7.4.4), so this is matched here rather than as a bare `tabular_row`.
    expanded_item: ($) =>
      seq(
        optional($._indent),
        $.local_id,
        $._ws,
        choice(
          seq("=", $.scalar_value),
          "{}",
          $.attachment_array,
          $.attachment_cell,
          // Bare positional value for a section with named fields: `@0 0`,
          // `@0 -1`, `@0 "@x"`. It reuses the same `kind` / `quoted_string`
          // tokens the graph `symbol_line` consumes, so the lexer emits one
          // token and the declared [symbol_line, expanded_item] conflict lets
          // the GLR parser keep both alive until the newline decides: a lone
          // value + `\n` completes the expanded row; a following field means a
          // symbol line. Pipe rows never reach here (matched atomically by the
          // longer `tabular_row` token). The shared `kind` token is aliased to
          // `expanded_value` so the node reads correctly in the generic profile.
          alias($.kind, $.expanded_value),
          $.quoted_string,
        ),
        $._newline,
      ),

    // A caret attachment marker: bare `^`, or `^{fields}` declaring an inline
    // object schema for the cell (SPEC 7.4.4a).
    attachment_cell: ($) => seq("^", optional($.field_decl)),

    // ---------------------------------------------------------------
    // val1|val2|val3 (tabular row, may have @N prefix)
    // ---------------------------------------------------------------
    tabular_row: ($) =>
      token(seq(
        /[^\n]*\|[^\n]*/,
        /\n/,
      )),

    // ---------------------------------------------------------------
    // A single-column tabular data row whose cell is a quoted string, e.g.
    // `"true"`, `"^{a}"`, `"a|b"` (SPEC 2.4: any value that would otherwise
    // collide with a structural form is quoted). Single-cell rows carry no
    // pipe, so they are not caught by `tabular_row`, and a leading `"` is
    // excluded from `text_content`. Matched as an atomic token so the quoted
    // cell (which may contain `|`, `=`, `{`) is not re-lexed.
    quoted_data_row: ($) =>
      token(seq(/"(?:[^"\\]|\\.)*"/, /\r?\n/)),

    // ---------------------------------------------------------------
    // key=value (with optional indentation)
    // ---------------------------------------------------------------
    kv_line: ($) =>
      seq(
        optional($._indent),
        $.kv_key,
        "=",
        $.kv_value,
        $._newline,
      ),

    kv_pair: ($) => seq($.kv_key, "=", $.kv_value),
    kv_key: ($) => choice(
      $.quoted_string,
      /[a-zA-Z_][a-zA-Z0-9_]*/,
    ),
    kv_value: ($) => /[^\n]+/,

    // ---------------------------------------------------------------
    // Indented data lines (attachment body rows, bare values)
    // Matches indented content that isn't an attachment, kv, or inline array.
    // ---------------------------------------------------------------
    indented_data: ($) =>
      token(seq(/ {2,}/, /[^.@#\n][^\n]*/, /\n/)),

    // ---------------------------------------------------------------
    // Fallback for unrecognized lines, including single-cell tabular data rows
    // whose value is a bare word (e.g. `plain`, `foo`). Lines not starting with
    // GCF, ##, @, #, ., = and not containing | or =. Matched as an atomic,
    // whole-line token so a bare alphabetic value wins maximal munch over the
    // shorter identifier tokens (inline_array_name, section_name) it would
    // otherwise tie with and dead-end against.
    // ---------------------------------------------------------------
    text_line: ($) => $.text_content,

    text_content: ($) =>
      token(seq(/[^GCF@#.=|"\n\r \t][^\n|=]*/, /\r?\n/)),

    // ---------------------------------------------------------------
    // Shared tokens
    // ---------------------------------------------------------------
    scalar_value: ($) => /[^\n]+/,
    cell_values: ($) => /[^\n]+/,
    quoted_string: ($) => /"(?:[^"\\]|\\.)*"/,

    _ws: ($) => / +/,
    _indent: ($) => / +/,
    _newline: ($) => /\r?\n/,
  },
});
