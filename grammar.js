/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "gcf",

  extras: ($) => [],

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
        $.kv_line,
        $.inline_array,
        $.nested_field,
        $.tabular_row,
        $.text_line,
        $.blank_line,
      ),

    blank_line: ($) => /\r?\n/,

    // GCF tool=... key=value ...
    header: ($) =>
      token(seq(
        "GCF ",
        /[^\n]+/,
        /\n/,
      )),

    // ## _summary ...
    summary_line: ($) =>
      token(seq(
        "## _summary",
        /[^\n]*/,
        /\n/,
      )),

    // ## name [N]{f1,f2} ...
    section_header: ($) =>
      token(seq(
        "## ",
        /[^\n]+/,
        /\n/,
      )),

    // @N<@N type [status]
    edge_line: ($) =>
      token(seq(
        /@\d+<@\d+/,
        / /,
        /[^\n]+/,
        /\n/,
      )),

    // @N  # previously transmitted
    ref_line: ($) =>
      token(seq(
        /@\d+/,
        /  # previously transmitted/,
        /\n/,
      )),

    // @N kind qname score provenance
    symbol_line: ($) =>
      token(seq(
        /@\d+ /,
        /[^\n]+/,
        /\n/,
      )),

    // # comment
    comment: ($) =>
      token(seq(
        "# ",
        /[^\n]*/,
        /\n/,
      )),

    // key=value (with optional leading whitespace)
    kv_line: ($) =>
      token(seq(
        /\s*/,
        /[a-zA-Z_][a-zA-Z0-9_]*/,
        "=",
        /[^\n]*/,
        /\n/,
      )),

    // name[N]: val1,val2
    inline_array: ($) =>
      token(seq(
        /[a-zA-Z_][a-zA-Z0-9_]*/,
        /\[\d+\]/,
        ": ",
        /[^\n]+/,
        /\n/,
      )),

    // .fieldname
    nested_field: ($) =>
      token(seq(
        /\s*/,
        ".",
        /[a-zA-Z_][a-zA-Z0-9_]*/,
        /\n/,
      )),

    // val1|val2|val3
    tabular_row: ($) =>
      token(seq(
        /[^\n]*\|[^\n]*/,
        /\n/,
      )),

    // Fallback: any other non-empty line
    text_line: ($) =>
      token(seq(
        /[^\n#@.][^\n]*/,
        /\n/,
      )),
  },
});
