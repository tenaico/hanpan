# Background and selections

Removing a background keeps the original pixels: it adds a layer mask that hides the background.

- `layer.removeBackground` {layer?: id, sampleAllLayers?: bool = false, refine?: bool = true} → {layer, bounds}. Adds a layer mask from Select Subject; the Background layer becomes a normal layer. It fails with "no subject found" on a picture without a clear subject (a flat colour, a texture): say so instead of trying again.
- `select.subject` {sampleAllLayers?: bool = false, mode?: "replace|add|subtract|intersect" = "replace"} selects the main subject of the selected layer.
- `select.colorRange` {select?: "sampledColors|reds|yellows|greens|cyans|blues|magentas|highlights|midtones|shadows|skinTones", color?: "#rrggbb", fuzziness?: 0..200 = 40} selects by colour.
- `select.all` {}, `select.deselect` {}, `select.inverse` {}.
- With a selection: `layer.layerMask.revealSelection` {layer?: id} or `layer.layerMask.hideSelection` {layer?: id} adds a mask from it; `layer.layerMask.edit` {layer?: id, feather?: 0..1000 px} softens the mask's edge.
- `layer.layerMask.delete` {layer?: id} drops a mask (the hidden pixels come back); `layer.layerMask.apply` {layer?: id} makes it permanent: avoid it unless asked.
- A new background behind a cut-out subject: `layer.new.layer` {name: "Background colour", position: "below"} then `edit.fill` {contents: "color", color: "#rrggbb"} on it.
