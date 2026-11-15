// The dependant meshes the paper doll draws (the drape) are library data with a default
// (the generic's meshDependants, shipped in factory/defaults/generic.js); the paper doll decides each one's state and sets its effect parameters.
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterDataMeshDependant, CjsCharacterLibrary, CjsCharacterLibraryManager, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";

const [ DRAPE ] = structuredClone(new CjsCharacterLibraryManager()._MeshDependants());

test("the shipped generic holds the drape entry, each parameter four components, and only the library reads it", () =>
{
    assert.deepEqual(new CjsCharacterLibraryManager()._MeshDependants(), [
        { path: "dependants/drape/standard", owner: "topMiddle", state: "tuck", parameters: { TransformUV0: [ 0, 0, 1, 1 ], DecalClip: [ 1, 0, 0, 0 ] }, diffuseSize: [ 2048, 2048 ] }
    ]);
    for (const name of [ "GetMeshDependants", "SetMeshDependants" ])
        assert.equal(typeof CjsCharacterLibraryManager.prototype[name], "undefined", "no " + name + ": only the library holds them (FetchMeshDependants answers from it)");
});

test("an installed generic dependant replaces the shipped one of its path whole", () =>
{
    const installed = new CjsCharacterLibrary();
    installed.generic.meshDependants.push(Object.assign(new CjsCharacterDataMeshDependant(), { path: "dependants/drape/standard", owner: "topOuter", state: "tuck" }));
    const [ entry ] = new CjsCharacterLibraryManager(installed)._MeshDependants();
    assert.deepEqual(entry, { path: "dependants/drape/standard", owner: "topOuter", state: "tuck", parameters: {}, diffuseSize: [ 0, 0 ] }, "not merged with the shipped parameters");
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

test("an entry's parameters: each set as a Vector4, which replaces or adds the parameter", () =>
{
    const set = [];
    const effect = { SetParameter__Vector4: (name, value) => set.push([ name, Array.from(value) ]) };
    CjsPaperDollInstance.applyEffectParameters(effect, DRAPE.parameters);
    assert.deepEqual(set, [ [ "TransformUV0", [ 0, 0, 1, 1 ] ], [ "DecalClip", [ 1, 0, 0, 0 ] ] ], "DecalClip too, which the drape does not author");
});
