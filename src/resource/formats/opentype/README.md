# OpenType format

Reads OpenType (`.otf`) and TrueType (`.ttf`) font files into plain data. This is
not a port: Carbon reads fonts through FreeType, which cannot run in the browser
without WASM. The browser font manager uses this reader to hint CFF glyphs
itself.

## What it reads

- **sfnt container:** the table directory, `head`, `maxp`, `hhea`, `hmtx`, `OS/2`
  vertical metrics, and the Unicode `cmap` (format 12 first, then format 4).
- **CFF outlines** (`OTTO` fonts): the Top DICT and Private DICTs, name-keyed or
  CID-keyed (FDArray and FDSelect), and the global and local subroutines.
- **Type 2 charstrings**, one glyph at a time (`CjsOpenTypeFormat.readGlyph`):
  the outline in font units, the advance width, the declared stems, and where
  each hintmask changes the active stems.

TrueType outlines (`glyf`) and CFF2 are not read: a TrueType font returns its
metrics and character map, with `cff` set to null.

## Specifications

Written from the specifications, not from other implementations:

- Adobe Technical Note #5176, *The Compact Font Format Specification*.
- Adobe Technical Note #5177, *The Type 2 Charstring Format*.
- The OpenType specification (Microsoft Typography).
