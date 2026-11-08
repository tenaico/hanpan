# Crop and size

- `image.crop` {x, y, width, height (px), angle?: deg, deleteCroppedPixels?: bool = true, targetWidth?, targetHeight?} → {x, y, width, height, documentWidth, documentHeight}. A square from a 1600 × 1200 picture, centred: {x: 200, y: 0, width: 1200, height: 1200}.
- `image.trim` {basedOn: "transparent|topLeft|bottomRight" = "transparent"} cuts away an empty border.
- `image.imageSize` {width, height, units: "px" = "px", percent?: %, resample?: "automatic|preserveDetails|bicubicSmoother|…"} resamples the whole picture. Give one side and percent for a proportional change; both sides keep the ratio only when you compute it.
- `image.canvasSize` {width, height, units: "px|percent", relative?: bool, anchor?: "center|top|…", extensionColor?: "background|white|black|transparent|#rrggbb"} adds or removes canvas around the picture without resampling.
- Read the current size from the document summary before you compute a crop or a size.
