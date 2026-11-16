// The character library's indexing configuration is generic data (plan step 12): CjsCharacterLibraryConfiguration reads
// it from a generic's source members, the shipped generic's by default, and refuses what the library could not read.
import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterLibraryConfiguration, CjsCharacterLibraryManager, CjsCharacterDataListForm, CjsCharacterDataListFormRecords,
    CjsCharacterDataSourceRow, CjsCharacterDataSourceType, CjsCharacterGeneric, CjsCharacterPdpType
} from "../../../npm/dist/character/index.js";
import { CjsGraph } from "../../../npm/dist/global/model/graph/CjsGraph.js";

const shipped = CjsCharacterLibraryConfiguration.shippedGeneric();
const incarna = path => /\/graphics\/interior\/character(creation|sheet)\//u.test(path) || /\/shaders\/shaderdescriptions\//u.test(path);

/** A generic holding the shipped one's source members, changed by `edit`. */
function Generic(edit)
{
    const generic = CjsGraph.from(CjsCharacterGeneric, {});
    for (const key of [ "sourceRoots", "sourceExcludes", "sourceTypes", "sourceRows", "sourceBlackPatterns", "sourceStaticNames", "sourceListForms" ])
        generic[key] = [ ...shipped[key] ];
    edit(generic);
    return generic;
}

test("the statics are the shipped generic's configuration, and the manager shares its shipped generic", () =>
{
    const configuration = CjsCharacterLibraryConfiguration.shipped();
    assert.equal(CjsCharacterLibraryConfiguration.kinds, configuration.kinds);
    assert.deepEqual(CjsCharacterLibraryConfiguration.getRows(), configuration.getRows());
    assert.equal(new CjsCharacterLibraryManager()._ShippedGeneric(), shipped);
    assert.equal(CjsCharacterLibraryConfiguration.kinds.cameras.pdpType, CjsCharacterPdpType.CAMERA);
    assert.equal(CjsCharacterLibraryConfiguration.kindOf(CjsCharacterPdpType.CAMERA_SEQUENCE), "cameraSequences");
    assert.deepEqual(CjsCharacterLibraryConfiguration.sourceLists.CjsCharacterFaceMapping.value.tuple,
        { 4: [ "joint", "index", "axis" ], 7: [ "joint", "pairedJoint", "index" ] }, "a records form's tuples by length");
});

test("Incarna and the shared engine textures are not the character library's", () =>
{
    const rows = CjsCharacterLibraryConfiguration.getRows();
    assert.ok(!CjsCharacterLibraryConfiguration.roots.some(incarna) && !rows.some(row => incarna(row.match)));
    assert.ok(!rows.some(row => /\/texture\/global\/|\/shared_texture\/global\//u.test(row.match)), "no shared engine texture");
    assert.equal(Object.hasOwn(CjsCharacterLibraryConfiguration, "texturePaths"), false);
    for (const match of [ "res:/dx9/scene/postprocess/lutdefault.dds", "res:/dx9/scene/postprocess/ncc_normal.dds" ])
        assert.ok(rows.some(row => row.match === match && row.kind === "textures"), "the portrait post-process keeps its texture " + match);
});

test("a generic's source members the library could not read are refused", () =>
{
    const type = fields => Object.assign(new CjsCharacterDataSourceType(), { name: "extra", className: "CjsCharacterCamera", pdpType: CjsCharacterPdpType.CAMERA }, fields);
    assert.throws(() => new CjsCharacterLibraryConfiguration(Generic(generic => generic.sourceTypes.push(type({ pdpType: 999 })))), /names no file shape: 999/u);
    assert.throws(() => new CjsCharacterLibraryConfiguration(Generic(generic => generic.sourceTypes.push(type({ pdpType: CjsCharacterPdpType.NONE })))), /names no file shape: 0/u);
    assert.throws(() => new CjsCharacterLibraryConfiguration(Generic(generic => generic.sourceTypes.push(type({})))), /cameras and extra name one file shape/u);
    assert.throws(() => new CjsCharacterLibraryConfiguration(Generic(generic => generic.sourceTypes.push(type({ className: "Missing", pdpType: CjsCharacterPdpType.RECIPE })))), /unregistered class Missing/u);
    assert.throws(() => new CjsCharacterLibraryConfiguration(Generic(generic => generic.sourceTypes.push(type({ name: "cameras" })))), /Repeated character source type cameras/u);
    assert.throws(() => new CjsCharacterLibraryConfiguration(Generic(generic => generic.sourceRows.push(Object.assign(new CjsCharacterDataSourceRow(), { match: "res:/x/*.yaml", sourceType: "missing" })))),
        /res:\/x\/\*\.yaml names an unknown source type missing/u);
    const base = Object.assign(new CjsCharacterDataListForm(), { className: "CjsCharacterPose", key: "other" });
    assert.throws(() => new CjsCharacterLibraryConfiguration(Generic(generic => generic.sourceListForms.push(base))), /CjsCharacterPose\.other names no form/u);
    const repeated = Object.assign(new CjsCharacterDataListFormRecords(), { className: "CjsCharacterPose", key: "value", keyed: "name" });
    assert.throws(() => new CjsCharacterLibraryConfiguration(Generic(generic => generic.sourceListForms.push(repeated))), /Repeated character list form CjsCharacterPose\.value/u);
});

test("a generic's list forms read by their _type", () =>
{
    const values = { sourceListForms: [ { _type: "CjsCharacterDataListFormPositional", className: "CjsCharacterAttributes", key: "color", fields: [ "color" ] } ] };
    const generic = CjsGraph.from(CjsCharacterGeneric, values);
    assert.deepEqual(new CjsCharacterLibraryConfiguration(generic).sourceLists, { CjsCharacterAttributes: { color: [ "color" ] } });
});
