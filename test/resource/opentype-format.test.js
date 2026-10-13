import assert from "node:assert/strict";
import test from "node:test";
import { CjsOpenTypeFormat } from "../../src/resource/formats/opentype/index.js";
import { clientResources } from "../support/clientResources.js";

// The client's own fonts, read through tools-core. Counts are cross-checked
// against data the charstrings do not produce: every charstring's width
// operand must equal the font's hmtx advance.

const EVE_SANS_NEUE = [
    "regular", "bold", "italic", "bolditalic",
    "condensed", "condensedbold", "condenseditalic", "condensedbolditalic",
    "expanded", "expandedbold", "expandeditalic", "expandedbolditalic"
];

async function Font(t, name)
{
    const resources = await clientResources();
    if (resources.skip)
    {
        t.skip(resources.skip);
        return null;
    }
    const path = `res:/ui/fonts/${name}`;
    return CjsOpenTypeFormat.read(await resources.Read(path), { source: path });
}

test("every EVE Sans Neue face is CFF, and every glyph runs to the hmtx advance", async t =>
{
    for (const face of EVE_SANS_NEUE)
    {
        const font = await Font(t, `evesansneue-${face}.otf`);
        if (!font) return;
        assert.equal(font.outlineFormat, "cff", face);
        assert.equal(font.cff.cidKeyed, false, face);
        assert.equal(font.numGlyphs, 573, face);
        assert.equal(font.unitsPerEm, 1000, face);
        assert.equal(font.cmap.format, 4, face);

        let hinted = 0;
        for (let glyph = 0; glyph < font.numGlyphs; glyph++)
        {
            const outline = CjsOpenTypeFormat.readGlyph(font, glyph, face);
            assert.equal(outline.advanceWidth, font.advanceWidths[glyph], `${face} glyph ${glyph} advance`);
            if (outline.hStems.length + outline.vStems.length) hinted++;
        }
        assert.ok(hinted >= 560, `${face}: ${hinted} glyphs declare stems`);
    }
});

test("EVE Sans Neue Regular: Private DICT, cmap and the H outline", async t =>
{
    const font = await Font(t, "evesansneue-regular.otf");
    if (!font) return;
    const { private: hints } = font.cff.fontDicts[0];
    assert.deepEqual(hints.blueValues, [ -5, 0, 540, 545, 690, 695 ]);
    assert.deepEqual(hints.otherBlues, [ -185, -180 ]);
    assert.equal(hints.stdHW, 80);
    assert.equal(hints.stdVW, 80);
    assert.equal(hints.blueScale, 0.039813);
    assert.deepEqual(font.cff.fontMatrix, [ 0.001, 0, 0, 0.001, 0, 0 ]);

    const glyph = CjsOpenTypeFormat.lookupGlyphIndex(font, "H".codePointAt(0));
    assert.equal(glyph, 37);
    assert.equal(CjsOpenTypeFormat.lookupGlyphIndex(font, 0x4e2d), 0, "no CJK glyphs");
    assert.notEqual(CjsOpenTypeFormat.lookupGlyphIndex(font, 0x20ac), 0, "euro sign");

    const outline = CjsOpenTypeFormat.readGlyph(font, glyph);
    assert.deepEqual(outline.vStems, [ { edge: 75, width: 80 }, { edge: 381, width: 80 } ]);
    assert.deepEqual(outline.hStems, [ { edge: 21, width: -21 }, { edge: 334, width: 68 }, { edge: 690, width: -20 } ]);
    assert.equal(outline.path.length, 12);
    assert.deepEqual(outline.path[0], { type: "M", x: 461, y: 690 });
    assert.ok(outline.path.every(command => command.type !== "C"), "H is all straight lines");
});

test("EVE Sans Neue Bold has bold stems", async t =>
{
    const font = await Font(t, "evesansneue-bold.otf");
    if (!font) return;
    assert.equal(font.cff.fontDicts[0].private.stdVW, 120);
});

test("Noto Sans CJK KR is CID-keyed, with a format 12 cmap and per-glyph Font DICTs", async t =>
{
    const font = await Font(t, "notosanscjkkr-regular.otf");
    if (!font) return;
    assert.equal(font.outlineFormat, "cff");
    assert.equal(font.cff.cidKeyed, true);
    assert.equal(font.cmap.format, 12);
    assert.ok(font.cff.fontDicts.length > 1);
    assert.equal(font.cff.fdSelect.length, font.numGlyphs);

    for (const codePoint of [ 0x48, 0x4e2d, 0xd55c, 0xae00, 0x20ac ])
    {
        const glyph = CjsOpenTypeFormat.lookupGlyphIndex(font, codePoint);
        assert.notEqual(glyph, 0, `U+${codePoint.toString(16)}`);
        const outline = CjsOpenTypeFormat.readGlyph(font, glyph);
        assert.equal(outline.advanceWidth, font.advanceWidths[glyph], `U+${codePoint.toString(16)} advance`);
        assert.equal(outline.fontDictIndex, font.cff.fdSelect[glyph]);
        assert.ok(outline.path.length > 0);
    }
});

test("TrueType fonts read their metrics and cmap, not their outlines", async t =>
{
    const font = await Font(t, "notosans-regular.ttf");
    if (!font) return;
    assert.equal(font.outlineFormat, "truetype");
    assert.equal(font.cff, null);
    assert.notEqual(CjsOpenTypeFormat.lookupGlyphIndex(font, "H".codePointAt(0)), 0);
    assert.throws(() => CjsOpenTypeFormat.readGlyph(font, 1), TypeError);
});

test("bytes that are not an sfnt font are rejected", () =>
{
    assert.throws(() => CjsOpenTypeFormat.read(new Uint8Array(16)), /not an sfnt font/);
    assert.throws(() => CjsOpenTypeFormat.read(new Uint8Array(4)), /too short/);
});
