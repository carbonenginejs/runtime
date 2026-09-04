import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsCharacter,
    CjsCharacterAppearanceManager,
    CjsCharacterTextureContributions,
    CjsCharacterTextureQuality
} from "../../../npm/dist/character/index.js";

test("selects retained texture tiers deterministically without a renderer", () =>
{
    const paths = [
        "res:/character/skin_256.dds",
        "res:/character/skin_4k.dds",
        "res:/character/skin_4k.png",
        "res:/character/skin_512.png"
    ];

    assert.equal(CjsCharacterTextureQuality.normalize("std"), "standard");
    assert.equal(CjsCharacterTextureQuality.getFamily(paths[1]), "res:/character/skin");
    assert.equal(CjsCharacterTextureQuality.select(paths, "4k"), paths[2]);
    assert.equal(CjsCharacterTextureQuality.select(paths, "512"), paths[3]);
    assert.equal(CjsCharacterTextureQuality.selectCoverage([ paths[1] ], "512"), paths[1]);
    assert.equal(CjsCharacterTextureQuality.isAllowed(paths[0], "512"), true);
});

test("validates that contributions retain their selected appearance-layer identity", () =>
{
    const expected = [
        { layerIndex: 0, partIndex: 2, groupID: "topinner" },
        { layerIndex: 1, partIndex: 1, groupID: "feet" }
    ];
    const contributions = [
        { layerIndex: 0, partIndex: 2, groupID: "topinner" },
        { layerIndex: 1, partIndex: 1, groupID: "feet" }
    ];

    assert.strictEqual(CjsCharacterTextureContributions.validate(contributions, expected), contributions);
    assert.throws(
        () => CjsCharacterTextureContributions.validate(
            [ contributions[0], { ...contributions[1], groupID: "hands" } ],
            expected
        ),
        /identity/u
    );
});

test("requires the complete appearance AL lifecycle before staging work", () =>
{
    assert.throws(
        () => new CjsCharacterAppearanceManager({ adapter: { Prepare() {} } }),
        /Prepare\(construction, context\), Commit\(stage, context\), and Release/u
    );
});

test("keeps resolution and realization as injected character seams", async () =>
{
    const paperdoll = { recordID: "3000001" };
    const library = {
        schema: "carbonenginejs.characterLibrary",
        schemaVersion: 10,
        sourceTarget: "test",
        sourceBuild: "test"
    };
    const plan = {
        selections: [],
        parts: [],
        layers: [],
        textures: [],
        coverages: [],
        targets: [],
        bindings: [],
        diagnostics: []
    };
    const construction = { operations: [] };
    const manager = {
        GetLibrary: () => library,
        Get: (document, recordID) => document === "paperdolls" && recordID === "3000001"
            ? paperdoll
            : null,
        GetDocument: document => document === "paperdolls" ? [ paperdoll ] : [],
        ListDocuments: () => [ "paperdolls" ]
    };
    const applied = [];
    const character = new CjsCharacter({
        libraryManager: manager,
        appearanceResolver: {
            resolvePaperdoll(actualLibrary, actualPaperdoll, options)
            {
                assert.strictEqual(actualLibrary, library);
                assert.strictEqual(actualPaperdoll, paperdoll);
                assert.deepEqual(options, { requestedLod: 0 });
                return plan;
            }
        },
        constructionResolver: {
            Resolve(actualPaperdoll, actualPlan, actualLibrary)
            {
                assert.strictEqual(actualPaperdoll, paperdoll);
                assert.strictEqual(actualPlan, plan);
                assert.strictEqual(actualLibrary, library);
                return construction;
            }
        },
        appearanceManager: {
            ApplyConstruction(value, options)
            {
                applied.push({ value, options });
                return Promise.resolve({ status: "committed" });
            },
            GetState: () => ({ status: "ready" })
        }
    });
    const events = [];
    character.OnEvent("appearancechanged", value => events.push(value));

    assert.strictEqual(character.SelectPaperdoll("3000001"), plan);
    assert.deepEqual(events, [{ type: "appearancechanged", source: character, revision: 1 }]);
    assert.deepEqual(await character.ApplyAppearance(), { status: "committed" });
    assert.strictEqual(applied[0].value, construction);
    assert.strictEqual(applied[0].options.appearancePlan, plan);
    assert.deepEqual(character.GetDiagnostics().selection, { recordID: "3000001", revision: 1 });
});

test("publishes atomic stages through a supplied appearance AL", async () =>
{
    const calls = [];
    const appearanceManager = new CjsCharacterAppearanceManager({
        capabilities: { backend: "webgl2", maximumBones: 256, requiredBones: 69 },
        adapter: {
            async Prepare(construction, context)
            {
                calls.push([ "prepare", construction, context.appearanceChange ]);
                return { construction };
            },
            async Commit(stage)
            {
                calls.push([ "commit", stage ]);
            },
            async Release(stage)
            {
                calls.push([ "release", stage ]);
            },
            async UpdateMorphTargets(stage, morphTargets)
            {
                calls.push([ "morph", stage, morphTargets ]);
                return { updated: morphTargets.length };
            }
        }
    });
    const baseline = { operations: [], morphTargets: [] };
    const morphed = {
        operations: [],
        morphTargets: [ { targetName: "NoseUp", weight: 0.5 } ]
    };

    assert.deepEqual(await appearanceManager.ApplyConstruction(baseline), {
        status: "committed",
        revision: 1
    });
    const reused = await appearanceManager.ApplyConstruction(baseline);
    assert.equal(reused.reused, true);
    const updated = await appearanceManager.ApplyConstruction(morphed);
    assert.equal(updated.updatedInPlace, true);
    assert.deepEqual(updated.update, { updated: 1 });
    assert.deepEqual(appearanceManager.GetCapabilities(), {
        backend: "webgl2",
        maximumBones: 256,
        requiredBones: 69,
        adapterConnected: true,
        completeBonePalette: true
    });
    assert.deepEqual(calls.map(value => value[0]), [ "prepare", "commit", "morph" ]);
});
