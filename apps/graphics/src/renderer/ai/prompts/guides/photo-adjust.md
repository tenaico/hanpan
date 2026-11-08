# Tone and colour

The adjustments change the pixels of the selected pixel layer (inside the selection, if there is one).

- One-step fixes: `image.autoTone` {}, `image.autoContrast` {}, `image.autoColor` {}.
- `image.adjustments.brightnessContrast` {brightness: -150..150 = 0, contrast: -50..100 = 0}. "A little brighter" is about brightness 20 to 30.
- `image.adjustments.levels` {inBlack: 0..253 = 0, gamma: 0.01..9.99 = 1, inWhite: 2..255 = 255, outBlack, outWhite}.
- `image.adjustments.curves` {points: [[in, out], …] in 0..255, 2 to 19 points}. A gentle S curve for contrast: [[0,0],[64,54],[192,202],[255,255]].
- `image.adjustments.exposure` {exposure: -20..20 = 0, offset: -0.5..0.5, gamma}.
- `image.adjustments.hueSaturation` {hue: -180..180, saturation: -100..100, lightness: -100..100, colorize?: bool}.
- `image.adjustments.vibrance` {vibrance: -100..100, saturation: -100..100}.
- `image.adjustments.colorBalance` {shadows, midtones, highlights: each [cyan-red, magenta-green, yellow-blue] in -100..100}. Warmer: midtones [10, 0, -10].
- Sharpen and clean: `filter.sharpen.unsharpMask` {amount: 1..500 = 50, radius: 0.1..1000 = 1, threshold: 0..255}, `filter.sharpen.smartSharpen` {amount, radius, reduceNoise}, `filter.noise.reduceNoise` {strength: 0..10 = 6, preserveDetails: 0..100}, `filter.blur.gaussianBlur` {radius: 0.1..1000 = 1}.
