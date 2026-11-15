import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterDataPartGroup, CjsCharacterDataString, CjsCharacterLibrary, CjsCharacterLibraryManager, CjsPaperDollInstance, CjsPaperDollTopMiddle, CjsPaperDollTopOuter } from "../../../npm/dist/character/index.js";

/** The shipped groups (the generic's `exclusiveParts`, in `factory/defaults/generic.js`). */
const GROUPS = new CjsCharacterLibraryManager().GetExclusiveParts();

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

test("the groups are the library's, the shipped generic their default; the paper doll applies the groups it is given", () =>
{
    assert.deepEqual(GROUPS, [ [ "topMiddle", "topOuter" ] ]);
    assert.equal("exclusive" in new CjsPaperDollInstance(), false, "the instance holds no groups of its own");
    const library = new CjsCharacterLibraryManager();
    library.GetExclusiveParts()[0].length = 0;
    assert.deepEqual(library.GetExclusiveParts(), GROUPS, "the caller's own copy");
    assert.deepEqual(CjsPaperDollInstance.exclusiveParts(Tops([ true, "tshirtf01" ], [ true, "shirtmilf01" ]), new Map(), []), [], "no groups: both worn");
});

test("an installed library that holds groups replaces the shipped set whole", () =>
{
    const installed = new CjsCharacterLibrary(), group = new CjsCharacterDataPartGroup();
    group.members.push(Object.assign(new CjsCharacterDataString(), { str: "hair" }), Object.assign(new CjsCharacterDataString(), { str: "headwear" }));
    installed.generic.exclusiveParts.push(group);
    assert.deepEqual(new CjsCharacterLibraryManager(installed).GetExclusiveParts(), [ [ "hair", "headwear" ] ], "not merged with the shipped tops");
});
