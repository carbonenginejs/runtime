import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDollDefinition } from "../../../npm/dist/character/index.js";

const colors = value => [ 0, 1, 2 ].map(() => Float32Array.of(value, value, value, 1));

test("a garment option selects the palette it names; custom colours are kept", () =>
{
    const doll = new CjsPaperDollDefinition();
    const palettes = new Map([ [ "a/amarr.color", colors(0.1) ], [ "c/achura.color", colors(0.7) ] ]);
    doll.bottomOuter.Configure([
        { id: "pantsa_amarr", path: "bottomouter/a", occludes: [], colorAreas: [ 1, 2, 3 ], defaultPalette: "a/amarr.color", palettes: [ { path: "a/amarr.color", label: "amarr" } ] },
        { id: "pantsc_achura", path: "bottomouter/c", occludes: [], colorAreas: [ 1, 2, 3 ], defaultPalette: "c/achura.color", palettes: [ { path: "c/achura.color", label: "achura" } ] }
    ], palettes, { option: "" });

    doll.bottomOuter.option = "pantsa_amarr";
    assert.equal(doll.bottomOuter.palette, "a/amarr.color");
    doll.bottomOuter.option = "pantsc_achura";
    assert.equal(doll.bottomOuter.palette, "c/achura.color");
    assert.equal(doll.bottomOuter.GetColors()[0][0], Math.fround(0.7));

    doll.bottomOuter.customColors = true;
    doll.bottomOuter.color1 = Float32Array.of(0.3, 0.3, 0.3, 1);
    doll.bottomOuter.option = "pantsa_amarr";
    assert.equal(doll.bottomOuter.customColors, true);
    assert.equal(doll.bottomOuter.GetColors()[0][0], Math.fround(0.3));
});

test("a garment option naming no palette resets it rather than keeping the previous one", () =>
{
    const doll = new CjsPaperDollDefinition();
    doll.bottomOuter.Configure([
        { id: "pantsa_amarr", path: "bottomouter/a", occludes: [], colorAreas: [ 1 ], defaultPalette: "a/amarr.color", palettes: [ { path: "a/amarr.color", label: "amarr" } ] },
        { id: "pantsx", path: "bottomouter/x", occludes: [], colorAreas: [ 1 ], palettes: [] }
    ], new Map([ [ "a/amarr.color", colors(0.1) ] ]), { option: "" });
    doll.bottomOuter.option = "pantsa_amarr";
    doll.bottomOuter.option = "pantsx";
    assert.equal(doll.bottomOuter.palette, "");
});

test("hair keeps the picked swatch across styles", () =>
{
    const doll = new CjsPaperDollDefinition();
    const palettes = new Map([ [ "01_a.color", colors(0.9) ], [ "10_a.color", colors(0.2) ] ]);
    const swatches = [ { path: "01_a.color", label: "01" }, { path: "10_a.color", label: "10" } ];
    doll.hair.Configure([
        { id: "long", path: "hair/long", occludes: [], colorAreas: [ 1 ], defaultPalette: "01_a.color", palettes: swatches },
        { id: "short", path: "hair/short", occludes: [], colorAreas: [ 1 ], defaultPalette: "01_a.color", palettes: swatches }
    ], palettes, { option: "" });

    doll.hair.option = "long";
    doll.hair.palette = "10_a.color";
    doll.hair.option = "short";
    assert.equal(doll.hair.palette, "10_a.color");
});
