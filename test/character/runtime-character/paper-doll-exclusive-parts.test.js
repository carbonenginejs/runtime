import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryManager, CjsPaperDollInstance, CjsPaperDollTopMiddle, CjsPaperDollTopOuter } from "../../../npm/dist/character/index.js";
import file from "../../../npm/dist/character/factory/defaults/exclusiveParts.json.js";

/** The shipped groups (`exclusiveParts.json`). */
const GROUPS = structuredClone(file.groups);

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
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(definition, last, GROUPS), []);
    definition.topOuter.enabled = true;
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(definition, last, GROUPS), [ "topMiddle" ]);
    assert.equal(definition.topMiddle.enabled, false);
    definition.topMiddle.enabled = true;
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(definition, last, GROUPS), [ "topOuter" ]);
    assert.equal(definition.topOuter.enabled, false);
});

test("with no earlier state the outer part stays, and a part with no option is not worn", () =>
{
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(Tops([ true, "tshirtf01" ], [ true, "shirtmilf01" ]), new Map(), GROUPS), [ "topMiddle" ]);
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(Tops([ true, "tshirtf01" ], [ true, "" ]), new Map(), GROUPS), []);
});

test("the groups are the paper doll's, the defaults file their default; it applies the groups it is given", () =>
{
    assert.deepEqual(GROUPS, [ [ "topMiddle", "topOuter" ] ]);
    assert.deepEqual(new CjsPaperDollInstance().Initialize({ error() {} }).exclusive, GROUPS, "an instance starts with the defaults");
    // Kept on the library only until Graphene stops copying the groups from it.
    assert.deepEqual(new CjsCharacterLibraryManager().GetExclusiveParts(), GROUPS);
    assert.equal(typeof CjsCharacterLibraryManager.prototype.SetExclusiveParts, "undefined", "no library setter");
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(Tops([ true, "tshirtf01" ], [ true, "shirtmilf01" ]), new Map(), []), [], "no groups: both worn");
});
