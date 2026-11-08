# Text and layers

- `type.create` {x: px, y: px (the baseline of point text), text: str, box?: [x, y, w, h] (paragraph text), align?: "left|center|right", font?: str, size?: pt = 12, color?: "#rrggbb", name?: str} → {layer, bounds}. Korean text needs a font with Hangul: use "NanumGothic".
- `type.fonts` {family?: str} lists the fonts the app has.
- `type.edit` {layer?: id, text?: str (replace all, styles kept), move?: [dx, dy]}.
- `type.setStyle` {layer?: id, range?: [start, end], font, size: pt, color, weight: 100..900, italic, tracking, leading}.
- Layers: `layer.new.layer` {name?, opacity?: 0..1, mode?, position?: "above|below"}, `layer.duplicate` {layer?: id, name?}, `layer.delete` {layer?: id}, `layer.select` {layer: id}, `layer.moveTo` {layer: id, target: id, position: "above|below"}.
- `layer.setProps` {layer?: id, name?, visible?: bool, opacity?: 0..1, blend?: "Multiply|Screen|…", locked?: bool}.
- `layer.mergeDown` {layer?: id} and `layer.flattenImage` {} remove layers for good: only when asked.
