import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDollInstance, CjsPaperDollTopMiddle, CjsPaperDollTopOuter } from "../../../npm/dist/character/index.js";

/** A definition holding only the two tops, each on or off with an option. */
function Tops(topMiddle, topOuter)
{
    const part = (Type, [ enabled, option ]) => Object.assign(new Type(), { enabled, option });
    return { topMiddle: part(CjsPaperDollTopMiddle, topMiddle), topOuter: part(CjsPaperDollTopOuter, topOuter) };
}

test("the top and the over top are never worn together: the one switched on last stays", () =>
{
    const last = new Map();
    const definition = Tops([ true, "tshirtf01" ], [ false, "shirtmilf01" ]);
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(definition, last), []);
    definition.topOuter.enabled = true;
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(definition, last), [ "topMiddle" ]);
    assert.equal(definition.topMiddle.enabled, false);
    definition.topMiddle.enabled = true;
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(definition, last), [ "topOuter" ]);
    assert.equal(definition.topOuter.enabled, false);
});

test("with no earlier state the outer part stays, and a part with no option is not worn", () =>
{
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(Tops([ true, "tshirtf01" ], [ true, "shirtmilf01" ]), new Map()), [ "topMiddle" ]);
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(Tops([ true, "tshirtf01" ], [ true, "" ]), new Map()), []);
});
