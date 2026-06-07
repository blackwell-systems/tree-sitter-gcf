/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "gcf",

  extras: ($) => [],

  conflicts: ($) => [
    [$.tabular_row],
  ],

  rules: {
    source_file: ($) => repeat($._line),

    _line: ($) =>
      choice(
        $.header,
        $.summary_line,
        $.section_header,
        $.edge_line,
        $.ref_line,
        $.symbol_line,
        $.comment,
        $.inline_array,
        $.nested_field,
        $.kv_line,
        $.tabular_row,
        $.text_line,
        $.blank_line,
      ),

    blank_line: ($) => /\r?\n/,

    // ---------------------------------------------------------------
    // GCF tool=... budget=... tokens=... symbols=... edges=...
    // ---------------------------------------------------------------
    header: ($) =>
      seq(
        $.gcf_keyword,
        repeat1(seq(" ", $.kv_pair)),
        $._newline,
      ),

    gcf_keyword: ($) => "GCF",

    kv_pair: ($) => seq($.key, "=", $.kv_value),
    key: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    kv_value: ($) => /[^\n]+/,

    // ---------------------------------------------------------------
    // ## _summary symbols=3 edges=2 ...
    // ---------------------------------------------------------------
    summary_line: ($) =>
      seq(
        $._section_marker,
        $._ws,
        $._summary_keyword,
        repeat(seq(" ", $.kv_pair)),
        $._newline,
      ),

    _summary_keyword: ($) => alias("_summary", $.summary_keyword),

    // ---------------------------------------------------------------
    // ## targets, ## edges [N], ## name [N]{f1,f2}
    // ---------------------------------------------------------------
    section_header: ($) =>
      seq(
        $._section_marker,
        $._ws,
        $.section_name,
        optional(seq($._ws, $.count_bracket)),
        optional($.field_decl),
        optional(repeat(seq($._ws, $.kv_pair))),
        $._newline,
      ),

    _section_marker: ($) => "##",
    section_name: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    count_bracket: ($) => seq("[", choice($.number, $.deferred), "]"),
    deferred: ($) => "?",
    field_decl: ($) => seq("{", $.field_name, repeat(seq(",", $.field_name)), "}"),
    field_name: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // ---------------------------------------------------------------
    // @0 fn pkg.Auth 0.78 lsp_resolved
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
        $._newline,
      ),

    local_id: ($) => /@\d+/,
    kind: ($) =>
      choice(
        "fn", "type", "method", "iface", "var", "const",
        "resource", "table", "class", "selector", "field",
        "route", "ext", "file", "pkg", "svc",
      ),
    qualified_name: ($) => /[^\s]+/,
    score: ($) => /\d+\.\d+/,
    provenance: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // ---------------------------------------------------------------
    // @0<@1 calls [added|removed]
    // ---------------------------------------------------------------
    edge_line: ($) =>
      seq(
        $.target_id,
        $.arrow,
        $.source_id,
        $._ws,
        $.edge_type,
        optional(seq($._ws, $.status)),
        $._newline,
      ),

    target_id: ($) => /@\d+/,
    arrow: ($) => "<",
    source_id: ($) => /@\d+/,
    edge_type: ($) => /[a-zA-Z_]+/,
    status: ($) => choice("added", "removed"),

    // ---------------------------------------------------------------
    // @0  # previously transmitted
    // ---------------------------------------------------------------
    ref_line: ($) =>
      token(seq(
        /@\d+/,
        /  # previously transmitted/,
        /\n/,
      )),

    // ---------------------------------------------------------------
    // # comment text
    // ---------------------------------------------------------------
    comment: ($) =>
      token(seq("# ", /[^\n]*/, /\n/)),

    // ---------------------------------------------------------------
    // name[N]: val1,val2,val3
    // ---------------------------------------------------------------
    inline_array: ($) =>
      token(seq(
        /[a-zA-Z_][a-zA-Z0-9_]*/,
        /\[\d+\]/,
        ": ",
        /[^\n]+/,
        /\n/,
      )),

    // ---------------------------------------------------------------
    // .fieldname
    // ---------------------------------------------------------------
    nested_field: ($) =>
      token(seq(
        /\s*/,
        ".",
        /[a-zA-Z_][a-zA-Z0-9_]*/,
        /\n/,
      )),

    // ---------------------------------------------------------------
    //   key=value (indented)
    // ---------------------------------------------------------------
    kv_line: ($) =>
      seq(
        optional($._indent),
        $.key,
        "=",
        $.kv_value,
        $._newline,
      ),

    _indent: ($) => / +/,

    // ---------------------------------------------------------------
    // val1|val2|val3 (with optional @id prefix)
    // ---------------------------------------------------------------
    tabular_row: ($) =>
      token(seq(
        /[^\n]*\|[^\n]*/,
        /\n/,
      )),

    // ---------------------------------------------------------------
    // Fallback for unrecognized lines (delta payloads, etc.)
    // ---------------------------------------------------------------
    text_line: ($) =>
      seq($.text_content, $._newline),

    // Excludes lines starting with known prefixes (GCF, ##, @, #, .)
    // Uses negative lookahead-like approach: first char can't start a known rule
    text_content: ($) => /[a-fh-zA-FH-Z0-9][^\n]*/,

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------
    _ws: ($) => / +/,
    _newline: ($) => /\r?\n/,
    number: ($) => /\d+/,
  },
});
