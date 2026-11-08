# Image trace

Turns a placed picture into vector paths. The picture must be selected (or pass its id). Use makeAndExpand to get plain editable paths; imageTrace.presets lists preset names.

- `imageTrace.make` {id?: image or Image Trace group (default: selection), preset?: name (imageTrace.presets), savedPreset?: {settings} (a saved preset's settings, which the journal records so a replay traces with them after the preset is changed, renamed or deleted; used in place of the saved preset `preset` names), enhanced?: false (the preset's enhanced version: with Auto Grouping, and with Shapes in all but High Fidelity Photo; Flat Logo has none and is traced as it is), params?: {mode: "blackAndWhite"|"grayscale"|"color"|"logo", threshold: 0-255, palette: "limited"|"fullTone"|"automatic"|"documentLibrary" (color mode; limited: the `colors` best colours, fullTone: as many as the tones need, more with colorD
- `imageTrace.makeAndExpand` {…as imageTrace.make} same as imageTrace.make, then expand → {id, paths, anchors, colors}
- `imageTrace.presets` {} → {presets: [{name, builtIn, params, enhanced: the params of the preset's enhanced version, null if it has none}], revision: grows each time the saved presets change} the built-in presets, then the saved ones (builtIn false, enhanced null); any of these names works as imageTrace.make's `preset`
