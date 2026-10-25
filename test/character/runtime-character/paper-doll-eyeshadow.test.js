import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDollDefinition } from "../../../npm/dist/character/index.js";

const swatch = value => [ 0, 1, 2 ].map(() => Float32Array.of(value, value, value, 1));

/** A doll with one eye shadow style and two A and two BC swatches. */
function Doll()
{
    const doll = new CjsPaperDollDefinition();
    doll.eyeshadow.Configure([ {
        id: "eyeshadow_01", colorAreas: [ 1, 2, 3 ],
        defaultPalette: "blue_a", palettes: [ { path: "blue_a", label: "Blue" }, { path: "red_a", label: "Red" } ],
        secondaryPalettes: [ { path: "blue_bc", label: "Blue" }, { path: "red_bc", label: "Red" } ], defaultSecondaryPalette: "blue_bc"
    } ], new Map([ [ "blue_a", swatch(.1) ], [ "red_a", swatch(.2) ], [ "blue_bc", swatch(.3) ], [ "red_bc", swatch(.4) ] ]), { option: "" });
    return doll;
}

const areas = doll => doll.eyeshadow.GetColors().map(color => Number(color[0].toFixed(2)));

test("eye shadow's Colour and Secondary colour are independent swatch picks", () =>
{
    const doll = Doll();
    doll.eyeshadow.option = "eyeshadow_01";
    assert.deepEqual(areas(doll), [ .1, .3, .3 ], "a chosen style starts from the default A and BC swatches");

    doll.eyeshadow.palette = "red_a";
    assert.deepEqual(areas(doll), [ .2, .3, .3 ], "Colour sets area 1 only");

    doll.eyeshadow.secondaryPalette = "red_bc";
    assert.deepEqual(areas(doll), [ .2, .4, .4 ], "Secondary colour sets areas 2 and 3 only");

    doll.eyeshadow.palette = "blue_a";
    assert.deepEqual(areas(doll), [ .1, .4, .4 ], "a later Colour pick keeps the Secondary pick");
    assert.deepEqual(doll.eyeshadow.GetSecondaryPalettes().map(value => value.path), [ "blue_bc", "red_bc" ]);
    assert.deepEqual(doll.eyeshadow.GetControls().map(property => property.key), [ "palette", "secondaryPalette", "customColors", "color1", "color2", "color3" ]);
});
