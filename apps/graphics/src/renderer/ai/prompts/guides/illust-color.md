# Color

paint.setFill and paint.setStroke paint the selection (or ids). Colors as "#rrggbb".

- `paint.setFill` {color?: "#rrggbb"|[r,g,b]|{c,m,y,k}|{gray}|{l,a,b} (CIE Lab), none?: true, swatch?: name (a global or spot colour stays linked, so swatch edits recolour it; a tint swatch links to its base at its tint; a gradient swatch is recorded as the gradient's swatch and fits each object, keeping its aspect; the built-in "[Registration]" prints on every plate), tint?: 0..100 (% of a global or spot `swatch`; default 100, or a tint swatch's own), gradient?: {kind?: linear|radial|freeform, method?: classic|perceptual (as paint.editGradient; default classic), stops?: [{offset 0..1, color, opacity? 0..1 (or 0..100), midpoint? 0.13..0.87, swatch?: global or spot colour (or tint) swatch the stop links to (it
- `paint.setStroke` {…as paint.setFill, item?: the stroke item to set} same as paint.setFill, for the stroke
