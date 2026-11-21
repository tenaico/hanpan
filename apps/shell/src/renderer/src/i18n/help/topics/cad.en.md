# AI Drawing

AI Drawing is a tab for simple 3D models and drawings. Open a drawing someone sent you and check its sizes, build a small model by hand or by asking the AI, and put a dimension sheet into a Hangul or Word document. Drawings are saved as .ttukcad files, and every length is in millimetres.

## Opening a drawing

- For a new drawing, go to Home, open **All apps** and press **AI Drawing**. The tab starts as **Untitled Drawing**.
- To open a file, use **File › Open…** (Ctrl+O) or drag the file onto the window. AI Drawing opens .ttukcad, DXF, DWG, STL, OBJ, 3MF, GLB and PLY files. DWG opens from the AutoCAD R14 format to the 2018 format.
- A file that is not .ttukcad opens as a new untitled drawing named after the file. The original file is never changed: saving always asks for a new .ttukcad file.
- STEP, IGES and BREP files are 3D files from professional CAD programs and cannot be read. AI Drawing shows **How to open this file** instead: ask the person who sent it for an STL (a 3D model).
- A file over 100 MB, or a model with more than 2 million triangles, does not open.

## Placing shapes

- **Home › Place shapes** holds the four shapes used most; **More** opens the gallery of all 15: box, cylinder, sphere, cone, pyramid, wedge, hemisphere, tube, torus, triangular prism, hexagonal prism, rounded box, star prism, roof and text.
- A new shape appears at the centre of the workplane, the floor plate the model stands on. Click a part to select it; Shift-click or Ctrl-click adds more parts to the selection.
- **View › Handles** chooses what the handles on the selected part do: **Move**, **Rotate** or **Size**. Dragging snaps to 1 mm and 15°; hold Alt while you drag to turn snapping off.
- The **Properties** panel on the right shows the selected part: name, kind (solid or hole), size, position (mm), rotation (°) and colour. Type a number to change it. **Hide** and **Lock** keep a part out of the way.
- **View › Views** turns the camera to **Top**, **Front** or **Side**, and **Show all** fits the whole model. Drag in the view to turn it, and use the mouse wheel to zoom.
- The status line at the bottom shows the workplane size, the snap and the grid, and the width × depth × height of the selected part.

## Holes, groups and align

- A hole is a shape that cuts. Select a shape and press **Hole** (or H) to make it a hole; press again to make it solid.
- A hole cuts only inside a group. Select the hole and the solids it should cut, then press **Group** (Ctrl+G): the group is the solids minus the holes. **Ungroup** (Ctrl+Shift+G) takes it apart.
- **Align** lines the selected parts up with the part you selected first: left, centre or right; front, centre or back; bottom, centre or top.
- For example, a cylinder 80 mm across, a hole cylinder 68 mm across raised by 5 mm, both selected and grouped, make a cup with a 5 mm floor.

## Sketch and text

- **Sketch** draws an outline of your own. Click on the workplane to place at least 3 points; **Undo point** takes back the last one.
- Enter the **Height (mm)** and press **Close shape**: the outline stands up as a solid. **Cancel** leaves without making anything.
- Lines that cross each other are refused. Undo points until they no longer cross.
- **Text** asks for the words to place and turns them into solid letters, using the font that comes with GenOffice.

## Editing the lines and text of a drawing you received

- Open a DXF or DWG and press **Edit lines**. Click a line, circle, arc or text of the drawing to pick it (it turns the highlight colour); Shift-click picks more.
- In the bar below, **Delete** (or the Delete key) removes the pick, **Move** shifts it by the X and Y you enter in mm, and with one text picked you type the new words and press **Change text**. Esc clears the pick; pressing it again ends Edit lines.
- Each change comes back with one **Undo** (Ctrl+Z). A locked drawing is not changed.
- You can also ask the AI assistant, for example: "Delete everything on the dimension layer", "Change the text 'Meeting room' to 'Large meeting room'", "Move the door layer 500 mm to the right".
- The result is saved as .ttukcad. The original DXF or DWG file is never changed.

## Measuring and the dimension sheet

- **Measure** shows the distance between two points you click, the length of a line or the diameter of a circle. Points snap to corners, line ends and circle centres. Esc clears the reading.
- **Dimension sheet** draws the model from the front, the top and the side on an A4 sheet, with the overall width, depth and height, a scale that fits (1:1, 1:2, 1:5, 1:10 …) and a title block with the name, the date and the scale. A drawing that came from a DXF file shows only the view from the top.
- In the sheet, **Copy picture** puts it on the clipboard. Paste it into a Hangul, Word or PowerPoint tab.
- **Send to Hangul** opens a new Hangul document with the sheet and a table of the parts and their sizes. When **Korean document features** is off in Settings, the button reads **Send to Word** and makes a Word document instead.

## The AI assistant

- The AI panel beside the drawing places shapes, changes sizes and positions, makes holes, groups, aligns, sets the workplane size and sums up the model. Some requests to try:
  - "Make a pencil holder 80 mm wide and 100 mm tall, hollow inside with a 68 mm diameter"
  - "Make the workplane a 5 × 4 m room and place four desks"
  - "Align the selected parts to the left"
- Everything one request changed comes back with one **Undo** (Ctrl+Z), however many parts it touched.
- The AI receives your request and a summary of the model (each part's name, kind, size and position). It cannot save, open, export or send; those stay with you.
- To give the AI a spec sheet or a sketch, attach it with the paper-clip button under the input, drag it onto the panel or paste a picture (Ctrl+V). The AI reads it and builds from it; the file never goes into the drawing, and the request is still one undo step.

## Saving and recovery

- **Save** (Ctrl+S) writes a .ttukcad file. AI Drawing saves only in this format; **Save As…** (Ctrl+Shift+S) picks a new name or place.
- **Auto save** at the top saves every 30 seconds and when the window loses focus, once the drawing has a file of its own.
- If GenOffice closes unexpectedly, the next start lists the drawing under **Documents with unsaved content**. Press **Restore** to get it back.

## Exporting

- **File › Export STL** and **Export OBJ** write the model for a 3D printer or another program. **Export picture (PNG)** saves what the view shows, on a light background.
- An export never replaces the file the drawing came from.

## Keyboard shortcuts

| Keys                   | What it does                 |
| ---------------------- | ---------------------------- |
| Ctrl+Z                 | Undo                         |
| Ctrl+Y or Ctrl+Shift+Z | Redo                         |
| Ctrl+S                 | Save                         |
| Ctrl+A                 | Select all                   |
| Delete                 | Delete                       |
| Ctrl+D                 | Duplicate                    |
| Ctrl+G                 | Group                        |
| Ctrl+Shift+G           | Ungroup                      |
| H                      | Hole ↔ solid                 |
| Arrow keys             | Move 1 mm (with Shift 10 mm) |
| Alt while dragging     | Turn snapping off            |

**Help › Shortcuts** shows the same list inside the tab.

## What it cannot do

- Open STEP, IGES or BREP files directly. Ask for STL instead.
- Save back to DXF or DWG. An edited drawing is saved as .ttukcad.
- Constraints, design history or assemblies as in professional CAD programs. Each part is set by its own numbers.
- Print. Send the dimension sheet to a Hangul or Word document and print from there.
