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
        "##",
        $._ws,
        optional($.section_name),
        optional(seq(optional($._ws), $.count_bracket)),
        optional($.field_decl),
        $._newline,
      ),

    section_name: ($) => choice(
      $.quoted_string,
      /[a-zA-Z_][a-zA-Z0-9_]*/,
    ),

    count_bracket: ($) => seq("[", choice($.count_number, $.deferred_marker), "]"),
    count_number: ($) => /\d+/,
    deferred_marker: ($) => "?",

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
    // verbatim (Section 5), so this matches any identifier token rather than a
    // closed set. Safe here because the symbol line is anchored by its `@id` prefix.
    kind: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    qualified_name: ($) => /[^\s]+/,
    score: ($) => /\d+\.\d+/,
    provenance: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

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
    edge_status: ($) => choice("added", "removed"),

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
    // @N =scalar, @N {}, @N [N]: vals, @N [N]{fields}
    // ---------------------------------------------------------------
    expanded_item: ($) =>
      seq(
        optional($._indent),
        $.local_id,
        $._ws,
        choice(
          seq("=", $.scalar_value),
          "{}",
          $.attachment_array,
        ),
        $._newline,
      ),

    // ---------------------------------------------------------------
    // val1|val2|val3 (tabular row, may have @N prefix)
    // ---------------------------------------------------------------
    tabular_row: ($) =>
      token(seq(
        /[^\n]*\|[^\n]*/,
        /\n/,
      )),

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
    // Fallback for unrecognized lines
    // Lines not starting with GCF, ##, @, #, ., = and not containing |
    // ---------------------------------------------------------------
    text_line: ($) =>
      seq($.text_content, $._newline),

    text_content: ($) => /[^GCF@#.=|\n\r \t][^\n|=]*/,

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
