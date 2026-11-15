// The dependant meshes the paper doll draws (the drape) are library data with a default
// (the generic's meshDependants, shipped in factory/defaults/generic.js); the paper doll decides each one's state. Its
// areas take the setup the library resolves for its category (FetchModelAreas; area-shaders.test.js).
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterDataMeshDependant, CjsCharacterLibrary, CjsCharacterLibraryManager, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";

const [ DRAPE ] = structuredClone(new CjsCharacterLibraryManager()._MeshDependants());

test("the shipped generic holds the drape entry, and only the library reads it", () =>
{
    assert.deepEqual(new CjsCharacterLibraryManager()._MeshDependants(), [
        { path: "dependants/drape/standard", owner: "topMiddle", state: "tuck", diffuseSize: [ 2048, 2048 ] }
    ]);
    assert.equal(typeof CjsPaperDollInstance.applyEffectParameters, "undefined", "no applyEffectParameters: the drape's areas take their setup (applyAreaSetup)");
    for (const name of [ "GetMeshDependants", "SetMeshDependants" ])
        assert.equal(typeof CjsCharacterLibraryManager.prototype[name], "undefined", "no " + name + ": only the library holds them (FetchMeshDependants answers from it)");
});

test("an installed generic dependant replaces the shipped one of its path whole", () =>
{
    const installed = new CjsCharacterLibrary();
    installed.generic.meshDependants.push(Object.assign(new CjsCharacterDataMeshDependant(), { path: "dependants/drape/standard", owner: "topOuter", state: "tuck" }));
    const [ entry ] = new CjsCharacterLibraryManager(installed)._MeshDependants();
    assert.deepEqual(entry, { path: "dependants/drape/standard", owner: "topOuter", state: "tuck", diffuseSize: [ 0, 0 ] }, "not merged with the shipped diffuse size");
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
