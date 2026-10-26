import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDollDefinition } from "../../../npm/dist/character/index.js";

const swatch = value => [ 0, 1, 2 ].map(() => Float32Array.of(value, value, value, 1));

/** A doll with a hair style using the shared A and BC swatches, and one with its own three-colour palette. */
function Doll()
{
    const doll = new CjsPaperDollDefinition();
    doll.hair.Configure([ {
        id: "hair_long_01", colorAreas: [ 1, 2 ],
        defaultPalette: "blonde_a", palettes: [ { path: "blonde_a", label: "Blonde" } ],
        secondaryPalettes: [ { path: "blonde_bc", label: "Blonde" } ], defaultSecondaryPalette: "blonde_bc"
    }, {
        id: "aura_hp", colorAreas: [ 1, 2 ],
        defaultPalette: "aura", palettes: [ { path: "aura", label: "aura" } ]
    } ], new Map([
        [ "blonde_a", swatch(.1) ], [ "blonde_bc", swatch(.3) ],
        [ "aura", [ .5, .6, .7 ].map(value => Float32Array.of(value, value, value, 1)) ]
    ]), { option: "" });
    return doll;
}

const areas = doll => doll.hair.GetColors().map(color => Number(color[0].toFixed(2)));

test("a hair style without secondary swatches keeps its own palette's colours in areas 2 and 3", () =>
{
    const doll = Doll();
    doll.hair.option = "hair_long_01";
    assert.deepEqual(areas(doll), [ .1, .3, .3 ], "a shared-swatch style takes area 1 from A and areas 2 and 3 from BC");

    doll.hair.option = "aura_hp";
    assert.deepEqual(doll.hair.GetSecondaryPalettes(), [], "the own-palette style offers no secondary swatches");
    assert.deepEqual(areas(doll), [ .5, .6, .7 ], "the previous style's BC swatch does not override the own palette");

    doll.hair.option = "hair_long_01";
    assert.deepEqual(areas(doll), [ .1, .3, .3 ], "returning to a shared-swatch style applies the kept BC swatch again");
});
