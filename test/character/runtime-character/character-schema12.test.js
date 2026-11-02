import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../../npm/dist/blue/schema/index.js";
import { CjsCharacterLibrary, CjsCharacterLibraryDocuments, CjsCharacterLibraryManager,
    CjsCharacterAppearanceResolver } from "../../../npm/dist/character/index.js";
import { CjsCharacterLibraryBuilder } from "../../../npm/dist/character/index.js";

function fixture()
{
    const root = "res:/test/female/pants";
    const paths = ["colorize_body_l.png", "colorize_body_z.png", "pants_n.png", "pants_s.png"].map(name => `${root}/${name}`);
    const overrides = ["colorize_body_l.png", "pants_s.png"].map(name => `${root}/v2/${name}`);
    const input = (mode, values) => ({ mode, paths: values,
        origin: {kind: "authored", resourcePath: root, rule: "qualified-test-inventory"} });
    const documents = {
        characterTextureMetadata: {
            normal: {sourcePath: paths[2], offsetXRaw: 123, offsetX: 0.25, width: 32, height: 64},
            specular: {sourcePath: overrides[1], offsetXRaw: 456, offsetX: 0.5, width: 16, height: 8}
        },
        paperdolls: { original: { modifiers: [] } },
        characterDefinitions: {
            color: { sourcePath: `${root}/black.color`, extension: ".color", values: { colors: [[0.1, 0.2, 0.3, 1]], pattern: "hexagon" },
                sourceText: "colors: [!!python/tuple [0.1, 0.2, 0.3, 1]]\npattern: hexagon\n" }
        },
        characterPartTypes: { trousers: {partSource: "female/pants", partPath: "pants", sex: "female", colorVariant: "black", resourceVersion: "v2"} },
        characterPartSources: { "female/pants": { sourcePath: root, sex: "female", partPath: "pants", versions: [
            {resourceVersion: "", textureCandidates: paths, textureCandidateInput: input("complete", paths)},
            {resourceVersion: "v2", textureCandidates: overrides, textureCandidateInput: input("channel-overrides", overrides)},
            {resourceVersion: "omitted", textureCandidates: paths, textureCandidateInput: input("omitted", [])},
            {resourceVersion: "empty", textureCandidates: [], textureCandidateInput: input("complete", [])}
        ]} }
    };
    const preparation = { indexedPaths: [...paths, ...overrides, `${root}/black.color`, "res:/test/hexagon.dds"],
        textureTargets: {"female/pants": "body"}, patternTextures: {hexagon: ["res:/test/hexagon.dds"]} };
    return { documents, preparation, root, paths, overrides };
}

test("schema12 preserves raw inputs and qualified channels through JSON/manager/resolver", () =>
{
    const {documents, preparation, paths, overrides} = fixture();
    const before = structuredClone(documents);
    const values = CjsCharacterLibraryBuilder.build(documents, {schemaVersion: 12, preparation});
    const first = CjsCharacterLibrary.from(values);
    const exported = CjsSchema.getValues(first, {}, {refs: true});
    const library = new CjsCharacterLibraryManager().InstallLibrary(JSON.parse(JSON.stringify(exported)));
    assert.deepEqual(documents, before);
    assert.deepEqual(library.rawDocuments, before);
    assert.equal(library.Get("characterTextureMetadata", "normal").offsetXRaw, 123);
    assert.equal(library.Get("characterTextureMetadata", "specular").offsetXRaw, 456);
    assert.equal(Object.hasOwn(library.rawDocuments.paperdolls.original, "backgroundID"), false);
    assert.equal(library.Get("characterDefinitions", "color").sourceText, documents.characterDefinitions.color.sourceText);
    const partSource = library.Get("characterPartSources", "female/pants");
    const partType = library.Get("characterPartTypes", "trousers");
    const resolved = CjsCharacterAppearanceResolver.resolveCatalog(library, {partSource, partType, resourceVersion: "v2"});
    assert.equal(resolved.materialProfile.patternTexturePath, "res:/test/hexagon.dds");
    assert.deepEqual(new Set(resolved.textureBindings.map(value => value.path)), new Set([paths[1], paths[2], ...overrides]));
    assert.equal(resolved.textureBindings.find(value => value.path === paths[2]).sourceVersion, "");
    assert.equal(resolved.textureBindings.find(value => value.path === overrides[0]).sourceVersion, "v2");
    assert.equal(partSource.versions.find(value => value.resourceVersion === "omitted").effectiveTextureBindings.length, 4);
    assert.equal(partSource.versions.find(value => value.resourceVersion === "empty").effectiveTextureBindings.length, 0);
});

test("schema11 emission omits all schema12 defaults and rejects mislabeled input", () =>
{
    const documents = Object.fromEntries(CjsCharacterLibraryDocuments.listDocumentNames().map(name => [name, {}]));
    documents.characterPartSources.example = {versions: [{resourceVersion: ""}]};
    documents.characterDefinitions.example = {values: {patternTexturePath: "raw field must survive"}};
    const old = CjsCharacterLibraryBuilder.build(documents);
    const emitted = CjsSchema.getValues(CjsCharacterLibrary.from(old), {}, {refs: true});
    assert.equal(emitted.schemaVersion, 11);
    assert.equal(Object.hasOwn(emitted, "rawDocuments"), false);
    assert.equal(Object.hasOwn(emitted.documents.characterPartSources[0], "materialBindings"), false);
    assert.equal(Object.hasOwn(emitted.documents.characterPartSources[0].versions[0], "textureCandidateInput"), false);
    assert.equal(Object.hasOwn(emitted.documents.characterDefinitions[0], "sourceText"), false);
    assert.equal(emitted.documents.characterDefinitions[0].values.patternTexturePath, "raw field must survive");
    assert.doesNotThrow(() => CjsCharacterLibrary.from(emitted));
    old.documents.characterPartSources[0].materialBindings = [];
    assert.throws(() => CjsCharacterLibrary.from(old), /schema-12 field/);
});

test("qualified full-canvas DDS selection preserves original PNG facts and sparse inheritance", () =>
{
    const {documents, preparation, paths} = fixture();
    const png = paths[1], identity = png.slice(0, -4), dds = `${identity}.dds`;
    const baseline = documents.characterPartSources["female/pants"].versions[0];
    baseline.textureCandidateInput.paths.push(dds);
    preparation.indexedPaths.push(dds);
    preparation.fullCanvasDdsPaths = [dds];
    documents.characterTextureMetadata[identity] = {sourcePath: png, sourceFormat: "png",
        width: 48, height: 46, offsetXRaw: 7813, offsetYRaw: 539063, offsetUnit: 0,
        physicalPixelDimensionsXRaw: 375000, physicalPixelDimensionsYRaw: 359375,
        physicalPixelDimensionsUnit: 0, hasOffsetMetadata: true, hasPhysicalPixelDimensionsMetadata: true};
    const before = structuredClone(documents);
    const values = CjsCharacterLibraryBuilder.build(documents, {schemaVersion: 12, preparation});
    const library = new CjsCharacterLibraryManager().InstallLibrary(JSON.parse(JSON.stringify(values)));
    assert.deepEqual(documents, before);
    assert.deepEqual(library.rawDocuments, before);
    const source = library.Get("characterPartSources", "female/pants");
    for (const version of source.versions.filter(value => value.resourceVersion !== "empty"))
    {
        const binding = version.effectiveTextureBindings.find(value => value.path === dds);
        assert.equal(binding.origin.rule, "qualified-dds-full-canvas");
        assert.equal(version.effectiveTextureBindings.some(value => value.path === png), false);
    }
    assert.deepEqual(source.versions[0].textureCandidateInput.paths, before.characterPartSources["female/pants"].versions[0].textureCandidateInput.paths);
    const metadata = library.Get("characterTextureMetadata", dds.slice(0, -4));
    for (const [field, value] of Object.entries(before.characterTextureMetadata[identity]))
        assert.deepEqual(metadata[field], value);

    delete preparation.fullCanvasDdsPaths;
    assert.throws(() => CjsCharacterLibraryBuilder.build(documents, {schemaVersion: 12, preparation}), /Ambiguous character texture channel/);
    preparation.fullCanvasDdsPaths = [dds];
    delete documents.characterTextureMetadata[identity];
    assert.throws(() => CjsCharacterLibraryBuilder.build(documents, {schemaVersion: 12, preparation}), /retained PNG metadata/);
    documents.characterTextureMetadata[identity] = before.characterTextureMetadata[identity];
    const unrelated = png.replace("colorize_body_z.png", "another_z.dds");
    baseline.textureCandidateInput.paths.push(unrelated);
    preparation.indexedPaths.push(unrelated);
    assert.throws(() => CjsCharacterLibraryBuilder.build(documents, {schemaVersion: 12, preparation}), /Ambiguous character texture channel/);
});

test("preparation rejects unknown inputs, duplicate channels, missing patterns and conflicting profiles", () =>
{
    for (const failure of ["unknown", "duplicate", "pattern", "profile"])
    {
        const {documents, preparation, root, paths} = fixture();
        if (failure === "unknown") delete documents.characterPartSources["female/pants"].versions[0].textureCandidateInput;
        if (failure === "duplicate") documents.characterPartSources["female/pants"].versions[0].textureCandidateInput.paths.push(paths[0]);
        if (failure === "pattern") preparation.patternTextures = {};
        if (failure === "profile") documents.characterMaterialProfiles = {conflict: {sourcePath: `${root}/black.color`, colors: []}};
        assert.throws(() => CjsCharacterLibraryBuilder.build(documents, {schemaVersion: 12, preparation}));
    }
});

test("materials are sex-qualified, A/BC remain separate and defaults require a typed edge", () =>
{
    const {documents, preparation, root} = fixture();
    documents.characterColorLocations = {skin: {colorKey: "skin"}};
    documents.characterColorNames = {a: {colorName: "A"}, bc: {colorName: "BC"}};
    documents.characterDefinitions.bc = {sourcePath: `${root}/bc.color`, extension: ".color", values: {colors: [[1, 0, 0, 1]]}};
    documents.characterDefinitions.def = {sourcePath: `${root}/default.color`, extension: ".color", values: {colors: [[0, 1, 0, 1]]}};
    documents.characterPartMetadata = {owner: {dependencies: [{partSource: "female/pants", modifierPath: "pants"}]}};
    const maleRoot = "res:/test/male/pants";
    documents.characterPartTypes.trousers.partSource = null;
    documents.characterPartTypes.trousers.partSources = ["female/pants", "male/pants"];
    documents.characterPartTypes.trousers.sex = "";
    documents.characterPartSources["male/pants"] = {sourcePath: maleRoot, sex: "male", partPath: "pants", versions: [
        {resourceVersion: "v2", textureCandidates: [], textureCandidateInput: {mode: "complete", paths: [],
            origin: {kind: "authored", resourcePath: maleRoot, rule: "input-field-presence"}}}
    ]};
    documents.characterDefinitions.male = {sourcePath: `${maleRoot}/black.color`, extension: ".color", values: {colors: [[0, 0, 1, 1]]}};
    preparation.indexedPaths.push(`${maleRoot}/black.color`);
    preparation.indexedPaths.push(`${root}/bc.color`, `${root}/default.color`);
    preparation.colorBindings = [
        {partSource: "female/pants", colorLocation: "skin", colorName: "a", path: `${root}/black.color`},
        {partSource: "female/pants", colorLocation: "skin", colorName: "bc", path: `${root}/bc.color`}
    ];
    const library = CjsCharacterLibraryBuilder.buildLibrary(documents, {schemaVersion: 12, preparation});
    const partSource = library.Get("characterPartSources", "female/pants");
    const selection = {partSource, resourceVersion: "v2", colorLocation: library.Get("characterColorLocations", "skin"),
        colorNameA: library.Get("characterColorNames", "a"), colorNameBC: library.Get("characterColorNames", "bc")};
    const colors = CjsCharacterAppearanceResolver.resolveCatalog(library, selection);
    const partType = library.Get("characterPartTypes", "trousers");
    const femaleMaterial = CjsCharacterAppearanceResolver.resolveCatalog(library, {...selection, partType}).materialProfile;
    const maleMaterial = CjsCharacterAppearanceResolver.resolveCatalog(library, {
        partSource: library.Get("characterPartSources", "male/pants"), partType, resourceVersion: "v2"
    }).materialProfile;
    assert.notEqual(femaleMaterial, maleMaterial);
    assert.equal(maleMaterial.sourcePath, `${maleRoot}/black.color`);
    assert.notEqual(colors.colorA, colors.colorBC);
    assert.equal(colors.materialProfile, null, "missing type must not invoke the dependency default");
    assert.throws(() => CjsCharacterAppearanceResolver.resolveCatalog(library, {...selection, dependency: {partSource}}), /typed dependency/);
    const dependency = library.Get("characterPartMetadata", "owner").dependencies[0];
    assert.equal(CjsCharacterAppearanceResolver.resolveCatalog(library, {...selection, dependency}).materialProfile.sourcePath, `${root}/default.color`);
    assert.throws(() => CjsCharacterAppearanceResolver.resolveCatalog(library, {...selection, partType: {recordID: "trousers"}}), /resolved type/);
});

test("unresolved schema12 relationships retain their target identities", () =>
{
    const values = CjsCharacterLibraryBuilder.build({characterPartSources: {example: {materialBindings: [{
        kind: "type", partType: "missing-type", materialProfile: "missing-material",
        origin: {kind: "derived", resourcePath: "res:/example", rule: "exact-test-join"}
    }]}}}, {schemaVersion: 12});
    assert.deepEqual(values.unresolvedRelationships.map(value => value.targetID), ["missing-type", "missing-material"]);
    assert.doesNotThrow(() => CjsCharacterLibrary.from(values));
});

test("sparse overrides replace semantic channels while complete and empty inputs do not inherit", () =>
{
    const {documents, preparation, root, paths} = fixture();
    const versions = documents.characterPartSources["female/pants"].versions;
    const overlay = `${root}/v2/comp_body_n.png`;
    preparation.indexedPaths.push(overlay);
    versions[1].textureCandidateInput.paths = [overlay];
    versions[1].textureCandidates = [overlay];
    versions.push({resourceVersion: "complete", textureCandidates: [overlay], textureCandidateInput: {
        ...versions[1].textureCandidateInput, mode: "complete"
    }}, {resourceVersion: "empty-override", textureCandidates: [], textureCandidateInput: {
        ...versions[1].textureCandidateInput, paths: []
    }});
    const library = CjsCharacterLibraryBuilder.buildLibrary(documents, {schemaVersion: 12, preparation});
    const prepared = library.Get("characterPartSources", "female/pants").versions;
    const sparse = prepared.find(value => value.resourceVersion === "v2").effectiveTextureBindings;
    assert.equal(sparse.length, 4);
    assert.equal(sparse.some(value => value.path === paths[2]), false);
    assert.equal(sparse.find(value => value.path === overlay).role, "normal-overlay");
    assert.equal(prepared.find(value => value.resourceVersion === "complete").effectiveTextureBindings.length, 1);
    assert.equal(prepared.find(value => value.resourceVersion === "empty-override").effectiveTextureBindings.length, 0);
});
