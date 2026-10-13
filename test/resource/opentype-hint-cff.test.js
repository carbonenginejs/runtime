import assert from "node:assert/strict";
import test from "node:test";
import { CjsOpenTypeFormat } from "../../src/resource/formats/opentype/index.js";
import { clientResources } from "../support/clientResources.js";

// Expected outlines are FreeType 2.13.2's, measured with FT_LOAD_DEFAULT
// (FT_Set_Pixel_Sizes(0, size), FT_Load_Glyph) on the client's own
// evesansneue-regular.otf: the 26.6 outline points, contour ends and advance.
// Carbon loads glyphs the same way (Tr2FontManager.cpp:91, m_loadflag).
// The hinter was compared against FreeType over every glyph of five EVE Sans
// Neue faces at nine sizes, and 2000 Noto Sans CJK KR glyphs, with no
// difference; these cases pin the parts that broke on the way there.

const FREETYPE = {
    // "H" at 10 px: cap height and baseline captured by blue zones; the
    // crossbar (334..402) keeps its scaled width with its top on a pixel.
    "H@10": {
        advance: 320,
        contours: [ 11 ],
        points: "294,448 243,448 243,256 99,256 99,448 47,448 47,0 99,0 99,212 243,212 243,0 294,0"
    },
    "H@11": {
        advance: 384,
        contours: [ 11 ],
        points: "324,512 268,512 268,303 109,303 109,512 52,512 52,0 109,0 109,256 268,256 268,0 324,0"
    },
    // "%" at 11 px: five hintmasks; one stem's two pixel moves tie, and only
    // 16.16 arithmetic breaks the tie FreeType's way (inner ring of the
    // upper circle, y 298..476).
    "%@11": {
        advance: 512,
        contours: [ 13, 27, 41, 55, 59 ],
        points: "224,411 224,460 218,512 138,512 59,512 52,460 52,411 52,386 52,337 60,284 138,284 218,284 224,337 224,386 "
            + "181,375 181,339 178,298 138,298 98,298 95,339 95,375 95,400 95,436 98,476 138,476 178,476 181,436 181,400 "
            + "466,126 466,176 460,227 380,227 301,227 295,176 295,126 295,101 295,52 302,0 380,0 460,0 466,52 466,101 "
            + "423,103 423,71 421,35 380,35 340,35 337,71 337,103 337,124 337,157 340,192 380,192 421,192 423,157 423,124 "
            + "349,512 107,0 165,0 409,512"
    }
};

/** Our hinted path as FreeType's outline points: 26.6, control points included, no repeated closing point. */
function Outline(hinted)
{
    const points = [];
    const contours = [];
    let start = 0;
    for (const command of hinted.path)
    {
        if (command.type === "M")
        {
            if (points.length) contours.push(points.length - 1);
            start = points.length;
            points.push([ command.x, command.y ]);
        }
        else if (command.type === "L")
        {
            points.push([ command.x, command.y ]);
        }
        else
        {
            points.push([ command.x1, command.y1 ], [ command.x2, command.y2 ], [ command.x, command.y ]);
        }
        const last = points[points.length - 1];
        if (points.length - 1 > start && last[0] === points[start][0] && last[1] === points[start][1]) points.pop();
    }
    contours.push(points.length - 1);
    return { contours, points: points.map(([ x, y ]) => `${x * 64},${y * 64}`).join(" ") };
}

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

test("hinted EVE Sans Neue glyphs match FreeType's FT_LOAD_DEFAULT outlines", async t =>
{
    const font = await Font(t, "evesansneue-regular.otf");
    if (!font) return;
    for (const [ key, expected ] of Object.entries(FREETYPE))
    {
        const [ character, size ] = key.split("@");
        const glyph = CjsOpenTypeFormat.readGlyph(font, CjsOpenTypeFormat.lookupGlyphIndex(font, character.codePointAt(0)));
        const hinted = CjsOpenTypeFormat.hintGlyph(font, glyph, Number(size), Number(size));
        assert.equal(hinted.advanceWidth * 64, expected.advance, `${key} advance`);
        assert.deepEqual(Outline(hinted), { contours: expected.contours, points: expected.points }, key);
    }
});

test("advances round as FreeType's quantised scale does, not as the exact product", async t =>
{
    const font = await Font(t, "evesansneue-regular.otf");
    if (!font) return;
    // Advance 812 at 8 px is 6.496 px exactly, but FreeType's 26.6 scale makes it 6.5 and rounds it to 7.
    const glyph = CjsOpenTypeFormat.readGlyph(font, 52);
    assert.equal(glyph.advanceWidth, 812);
    assert.equal(CjsOpenTypeFormat.hintGlyph(font, glyph, 8, 8).advanceWidth, 7);
});

test("hinting moves y only: x is the scaled outline", async t =>
{
    const font = await Font(t, "evesansneue-regular.otf");
    if (!font) return;
    const glyph = CjsOpenTypeFormat.readGlyph(font, CjsOpenTypeFormat.lookupGlyphIndex(font, "o".codePointAt(0)));
    const hinted = CjsOpenTypeFormat.hintGlyph(font, glyph, 12, 12);
    const scale = 12 / font.unitsPerEm;
    glyph.path.forEach((command, i) =>
    {
        assert.ok(Math.abs(hinted.path[i].x - command.x * scale) <= 1 / 32, `command ${i} x`);
    });
});
