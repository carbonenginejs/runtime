import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDollDefinition } from "../../../npm/dist/character/index.js";

test("eyeshadow exposes independent palette inputs and selected-area controls", () =>
{
    const component = new CjsPaperDollDefinition().eyeshadow;
    component.Configure([{ id: "style", colorAreas: [1, 3],
        defaultPalette: "a", defaultSecondaryPalette: "bc",
        palettes: [{ path: "a" }], secondaryPalettes: [{ path: "bc" }]
    }], new Map());
    component.option = "style";
    assert.equal(component.palette, "");
    assert.equal(component.secondaryPalette, "");
    component.palette = "a";
    component.secondaryPalette = "bc";
    assert.deepEqual(component.GetColors().map(value => value[0]), [.5, .5, .5]);
    assert.deepEqual(component.GetSecondaryPalettes(), [{ path: "bc" }]);
    assert.deepEqual(component.GetControls().map(field => field.key),
        ["palette", "secondaryPalette", "customColors", "color1", "color3"]);
});
