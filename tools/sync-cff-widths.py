#!/usr/bin/env python3
"""Make every CFF charstring width equal the glyph's hmtx advance.

A CFF font stores each advance twice: in hmtx and as the optional first
operand of the glyph's charstring (relative to the Private dict's
nominalWidthX, omitted when it equals defaultWidthX). macOS CoreText lays out
with hmtx, but Chromium on Windows takes the charstring width. The KR subset
tools rewrote hmtx only (normalize-kr-sans-hmtx.py) or wrote the raw advance
into redrawn charstrings without subtracting nominalWidthX
(T2CharStringPen(adv) in normalize-kr-latin-metrics.py and friends), so on
Windows GenOffice Serif KR drew "C" 1.34em wide (0.708em + nominalWidthX 634)
and every Latin letter, digit and punctuation mark looked spaced out.

Run after any tool that edits hmtx or charstrings of a CFF font. Idempotent.

Usage: py -3 tools/sync-cff-widths.py <font.woff2|otf>...
"""

import sys
from pathlib import Path

from fontTools.misc.psCharStrings import T2WidthExtractor
from fontTools.ttLib import TTFont

HINT_OPS = {"hstem", "hstemhm", "vstem", "vstemhm", "hintmask", "cntrmask"}


def has_width_operand(program: list) -> tuple[bool, int]:
    """(width present, index of the first operator) of a top-level charstring"""
    for i, tok in enumerate(program):
        if not isinstance(tok, str):
            continue
        if tok in HINT_OPS:
            return i % 2 == 1, i
        if tok == "rmoveto":
            return i > 2, i
        if tok in ("hmoveto", "vmoveto"):
            return i > 1, i
        if tok == "endchar":
            return i in (1, 5), i
        raise ValueError(f"first operator {tok!r} hides the width (subroutine call)")
    raise ValueError("charstring has no operator")


def width_of(cs, cff) -> float:
    pr = cs.private
    ext = T2WidthExtractor(
        getattr(pr, "Subrs", None) or [], cff.GlobalSubrs, pr.nominalWidthX, pr.defaultWidthX
    )
    ext.execute(cs)
    return ext.width


def sync(path: Path) -> int:
    font = TTFont(str(path))
    cff = font["CFF "].cff
    charstrings = cff[cff.fontNames[0]].CharStrings
    hmtx = font["hmtx"]
    changed = 0
    for name in font.getGlyphOrder():
        cs = charstrings[name]
        adv = hmtx[name][0]
        if round(width_of(cs, cff)) == adv:
            continue
        cs.decompile()
        program = list(cs.program)
        present, _ = has_width_operand(program)
        if present:
            program.pop(0)
        if adv != cs.private.defaultWidthX:
            program.insert(0, adv - cs.private.nominalWidthX)
        cs.program = program
        cs.bytecode = None
        changed += 1
    if changed:
        font.save(str(path))
        # verify on a fresh read: the compiled charstrings must decode to hmtx
        check = TTFont(str(path))
        ccff = check["CFF "].cff
        ccs = ccff[ccff.fontNames[0]].CharStrings
        for name in check.getGlyphOrder():
            assert round(width_of(ccs[name], ccff)) == check["hmtx"][name][0], name
    print(f"{path.name}: {changed} charstring widths synced to hmtx")
    return changed


def main() -> None:
    for arg in sys.argv[1:]:
        sync(Path(arg))


if __name__ == "__main__":
    main()
