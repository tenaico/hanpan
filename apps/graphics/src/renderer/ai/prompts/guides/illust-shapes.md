# Shapes

Draw with these; each answers {id}. Sizes in pt. Fill and stroke come from the current paint unless set after (see the color guide).

- `shape.rectangle` {x, y, width, height, radius?: pt, rotation?: deg (about centre)} → {id}
- `shape.ellipse` {x, y, width, height, rotation?: deg (about centre)} → {id}
- `shape.polygon` {cx, cy, radius, sides=6, rotation?: deg} → {id}
- `shape.star` {cx, cy, radius1, radius2, points=5, rotation?: deg} → {id}
- `shape.line` {x1, y1, x2, y2, fill?: bool (Fill Line: the current fill, else none)} → {id}
- `shape.arc` {x1, y1, x2, y2, closed?, slope?} or {x, y, lengthX, lengthY, reference?, baseAlong?: x|y, slope?, closed?, fillArc?} → {id}
- `shape.spiral` {cx, cy, radius, decay=80 (%), segments=10, clockwise?} → {id}
- `shape.rectangularGrid` {x, y, width, height, rows=5, columns=5, rowSkew=0, columnSkew=0 (−500…500 %: + crowds the horizontal dividers toward the top, the vertical ones toward the right), frame=true (the outside as one rectangle, else its four sides), fill=false (the current fill, else none), rotation?: deg (about centre)} → {id}
