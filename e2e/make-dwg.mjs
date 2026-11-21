/**
 * Writes a 2018-format DWG for the AI Drawing e2e (the repo keeps no other
 * program's files): one line across the middle and a circle around it.
 * acad-ts is ESM-only, so the spec runs this with node instead of importing it.
 * Usage: node e2e/make-dwg.mjs <path>
 */
import { writeFileSync } from 'node:fs'
import { ACadVersion, CadDocument, Circle, DwgWriter, Line, XYZ } from '@node-projects/acad-ts'

const doc = new CadDocument()
doc.header.version = ACadVersion.AC1032
const line = new Line()
line.startPoint = new XYZ(-1000, 0, 0)
line.endPoint = new XYZ(1000, 0, 0)
doc.modelSpace.entities.add(line)
const circle = new Circle()
circle.center = new XYZ(0, 0, 0)
circle.radius = 600
doc.modelSpace.entities.add(circle)
const target = new Uint8Array(4 * 1024 * 1024)
writeFileSync(process.argv[2], target.slice(0, DwgWriter.writeToStream(target, doc)))
