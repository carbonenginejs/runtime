// The dependant meshes the paper doll draws (the drape) are library data with a default
// (factory/defaults/meshDependants.json); the paper doll decides each one's state and sets its effect parameters.
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryManager, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";

import file from "../../../npm/dist/character/factory/defaults/meshDependants.json.js";

const [ DRAPE ] = structuredClone(file.dependants);

test("the library hands out the drape entry of its defaults file, as copies", () =>
{
    assert.deepEqual(file.dependants, [
        { path: "dependants/drape/standard", owner: "topMiddle", state: "tuck", parameters: { TransformUV0: [ 0, 0, 1, 1 ], DecalClip: 1 }, diffuseSize: [ 2048, 2048 ] }
    ]);
    const library = new CjsCharacterLibraryManager();
    const entries = library.GetMeshDependants();
    entries[0].owner = "changed";
    assert.equal(library.GetMeshDependants()[0].owner, "topMiddle", "the caller's own copy");
    assert.deepEqual(library.GetMeshDependants(), file.dependants);
    assert.equal(typeof library.SetMeshDependants, "undefined", "no public setter: only the library loads the file");
});

test("the drape draws in its owner's state while the owner is worn, lists it and nothing removes it", () =>
{
    const value = { topMiddle: { option: "tshirtf01", tuck: 2 } };
    const lists = (member, option) => option === "tshirtf01" ? [ "dependants/drape/standard", "dependants/sleevesupper/standard" ] : [];
    const states = (overrides = {}) => CjsPaperDollInstance.meshDependantStates([ DRAPE ],
        overrides.value ?? value, overrides.suppressed ?? new Set(), overrides.lists ?? lists, overrides.ownOccludes ?? []);
    assert.deepEqual(states(), [ { path: "dependants/drape/standard", owner: "topMiddle", shown: true, state: 2 } ]);
    assert.equal(states({ value: { topMiddle: { option: "", tuck: 2 } } })[0].shown, false, "no option");
    assert.equal(states({ suppressed: new Set([ "topMiddle" ]) })[0].shown, false, "suppressed owner");
    assert.equal(states({ lists: () => [] })[0].shown, false, "the owner does not list it");
    assert.deepEqual(states({ ownOccludes: [ [ "dependants/drape" ] ] })[0], { path: "dependants/drape/standard", owner: "topMiddle", shown: false, state: 0 },
        "a worn garment's own occludes remove it, and its state is 0");
});

test("an entry's parameters: an array on a parameter the effect has, a number through SetParameter", () =>
{
    const set = [], values = [];
    const effect = {
        SetParameter: (name, value) => set.push([ name, value ]),
        FindParameterByName: name => name === "TransformUV0" ? { SetValue: value => values.push(Array.from(value)) } : null
    };
    CjsPaperDollInstance.applyEffectParameters(effect, { ...DRAPE.parameters, Missing: [ 1, 2 ] });
    assert.deepEqual(values, [ [ 0, 0, 1, 1 ] ]);
    assert.deepEqual(set, [ [ "DecalClip", 1 ] ], "a missing array parameter is left alone");
});
