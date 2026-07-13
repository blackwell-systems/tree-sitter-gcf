; Header
(gcf_keyword) @keyword
(header_pair (header_key) @property)
(header_pair (header_value) @number)

; Section headers
"##" @keyword
(section_name) @type
(count_bracket "[" @punctuation.bracket)
(count_bracket "]" @punctuation.bracket)
(count_number) @number
(deferred_marker) @operator
(field_decl "{" @punctuation.bracket)
(field_decl "}" @punctuation.bracket)
(field_name) @property
; Identity field marker (generic-profile delta, Section 10a)
(identity_field "@" @punctuation.special)
(identity_field (field_name) @property)

; Symbol lines
(local_id "@" @punctuation.special)
(id_number) @number
(symbol_line (kind) @type.builtin)
(symbol_line (qualified_name) @function)
(symbol_line (score) @number.float)
(symbol_line (provenance) @attribute)
; Graph delta `## added` node lines carry a trailing distance (SPEC 3.4.1)
(symbol_line (distance) @number)

; Edge lines
"<" @operator
(edge_type) @label
(edge_status) @keyword

; Graph delta `## removed` (kind qname) and `## edges_*` (source -> target type) lines
(removed_line) @function
(delta_edge_line) @function

; Bare references
(ref_line) @comment

; Key-value pairs
(kv_line (kv_key) @property)
(kv_line (kv_value) @string)
"=" @operator

; Summary
"##!" @keyword
"summary" @keyword
(summary_line (kv_pair (kv_key) @property))
(summary_line (kv_pair (kv_value) @number))

; Root scalar
(root_scalar (scalar_value) @string)

; Attachment lines
(attachment_line "." @punctuation.special)
(attachment_name) @property
(attachment_object) @punctuation.bracket

; Expanded items
(expanded_item (local_id) @punctuation.special)

; Tabular rows
(tabular_row) @string

; Comments
(comment) @comment

; Indented data (attachment body rows)
(indented_data) @string

; Text fallback
(text_content) @string
