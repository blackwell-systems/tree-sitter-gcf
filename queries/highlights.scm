; Header
(gcf_keyword) @keyword
(header (kv_pair (key) @property))
(header (kv_pair (kv_value) @number))

; Section headers
"##" @keyword
(section_name) @type
(count_bracket "[" @punctuation.bracket)
(count_bracket "]" @punctuation.bracket)
(count_bracket (number) @number)
(deferred) @operator
(field_decl "{" @punctuation.bracket)
(field_decl "}" @punctuation.bracket)
(field_name) @property

; Symbol lines
(symbol_line (local_id) @variable)
(symbol_line (kind) @type.builtin)
(symbol_line (qualified_name) @function)
(symbol_line (score) @number.float)
(symbol_line (provenance) @attribute)

; Edge lines
(target_id) @variable
(arrow) @operator
(source_id) @variable
(edge_type) @label
(status) @keyword

; Bare references
(ref_line) @comment

; Key-value pairs
(kv_line (key) @property)
(kv_line (kv_value) @string)
"=" @operator

; Summary
(summary_keyword) @keyword
(summary_line (kv_pair (key) @property))
(summary_line (kv_pair (kv_value) @number))

; Inline arrays
(inline_array) @string

; Tabular rows
(tabular_row) @string

; Nested fields
(nested_field) @property

; Comments
(comment) @comment

; Text fallback
(text_content) @string
