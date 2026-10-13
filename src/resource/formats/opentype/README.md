# OpenType format

Reads OpenType (`.otf`) and TrueType (`.ttf`) font files into plain data, and
hints CFF glyphs as FreeType does. This is not a port of a Carbon class: Carbon
reads and hints fonts through FreeType, which cannot run in the browser
without WASM. The browser font manager uses this format to rasterise hinted
glyphs itself.

## What it reads

- **sfnt container:** the table directory, `head`, `maxp`, `hhea`, `hmtx`, `OS/2`
  vertical metrics, and the Unicode `cmap` (format 12 first, then format 4).
- **CFF outlines** (`OTTO` fonts): the Top DICT and Private DICTs, name-keyed or
  CID-keyed (FDArray and FDSelect), and the global and local subroutines.
- **Type 2 charstrings**, one glyph at a time (`CjsOpenTypeFormat.readGlyph`):
  the outline in font units, the advance width, the declared stems, and where
  each hintmask and cntrmask falls along the outline.

TrueType outlines (`glyf`) and CFF2 are not read: a TrueType font returns its
metrics and character map, with `cff` set to null.

## Hinting

`CjsOpenTypeFormat.hintGlyph` hints a CFF glyph at a pixel size the way
FreeType's default CFF engine does with `FT_LOAD_DEFAULT`, the flags Carbon
loads glyphs with: y follows the font's stem hints and alignment zones, x is
only scaled, and the advance is rounded to whole pixels. It keeps FreeType's
16.16 fixed-point arithmetic, so its outlines match FreeType's point for point.
Stem darkening, which FreeType's CFF driver leaves off by default, is not
implemented.

## Specifications and credits

The reader is written from the specifications:

- Adobe Technical Note #5176, *The Compact Font Format Specification*.
- Adobe Technical Note #5177, *The Type 2 Charstring Format*.
- The OpenType specification (Microsoft Typography).

The hinter (`core/hintCff.js`) is ported from the Adobe CFF engine in
FreeType's `src/psaux` (copyright 2007-2014 Adobe Systems Incorporated), and
the font-size scaling from FreeType's base code. Portions of this software are
copyright © The FreeType Project (https://freetype.org). All rights reserved.
They are used under the FreeType License, included as [`FTL.TXT`](FTL.TXT);
the changes from the original are listed at the top of `core/hintCff.js`.
