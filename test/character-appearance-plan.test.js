import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterAppearancePlan,
    CjsCharacterAppearanceSelection,
    CjsCharacterOrigin,
    CjsCharacterResolvedPart,
    CjsCharacterTextureAsset
} from "../npm/dist/index.js";

test("mutates appearance-plan child collections through named model methods", () =>
{
    const plan = new CjsCharacterAppearancePlan();
    const origin = plan.CreateOrigin({
        kind: "derived",
        rule: "test"
    });
    const selection = new CjsCharacterAppearanceSelection();
    let deleted = null;

    selection.groupID = "topinner";
    assert.ok(origin instanceof CjsCharacterOrigin);
    assert.strictEqual(plan.AddSelection(selection), selection);
    assert.deepEqual(plan.origins, [ origin ]);
    assert.deepEqual(plan.selections, [ selection ]);
    assert.equal(plan.RemoveOrigin(origin), true);
    assert.equal(plan.DeleteSelection(selection, {
        delete(value)
        {
            deleted = value;
        }
    }), true);
    assert.strictEqual(deleted, selection);
    assert.deepEqual(plan.origins, []);
    assert.deepEqual(plan.selections, []);
});

test("hydrates model-shaped appearance JSON through from and SetValues", () =>
{
    const document = CreatePlan();
    const from = CjsCharacterAppearancePlan.from(document);
    const assigned = new CjsCharacterAppearancePlan();

    assigned.SetValues(document);

    for (const plan of [ from, assigned ])
    {
        assert.equal(plan.schema, "carbonenginejs.characterAppearancePlan");
        assert.equal(plan.schemaVersion, 1);
        assert.ok(plan.selections[0] instanceof CjsCharacterAppearanceSelection);
        assert.ok(plan.parts[0] instanceof CjsCharacterResolvedPart);
        assert.ok(plan.textures[0] instanceof CjsCharacterTextureAsset);

        assert.strictEqual(plan.layers[0].owner, plan.selections[0]);
        assert.strictEqual(plan.layers[0].contributor, plan.parts[0]);
        assert.notStrictEqual(plan.layers[0].owner, plan.layers[0].contributor);
        assert.strictEqual(plan.coverages[0].source.texture, plan.textures[0]);
        assert.strictEqual(plan.coverages[0].subtract[0].texture, plan.textures[1]);

        const normal = plan.targets[1];

        assert.deepEqual(normal.passes.map(pass => pass.op), [
            "fill",
            "normal-replace",
            "normal-add"
        ]);
        assert.ok(normal.passes.every(pass => pass.coverage === plan.coverages[0]));
        assert.ok(normal.passes.every(pass => pass.layer === plan.layers[0]));
        assert.strictEqual(plan.bindings[1].source, normal);
        assert.strictEqual(plan.bindings[1].alpha.coverage, plan.coverages[0]);

        assert.deepEqual(Array.from(plan.bindings[0].sampleBounds), [ 0, 0, 1, 1 ]);
        assert.deepEqual(
            Array.from(plan.bindings[1].sampleBounds),
            Array.from(new Float32Array([ 0.1, 0.2, 0.8, 0.7 ]))
        );
        assert.deepEqual(
            Array.from(plan.bindings[2].sampleBounds),
            Array.from(new Float32Array([ 0.25, 0.25, 0.5, 0.5 ]))
        );
    }

    assert.deepEqual(assigned.GetValues(), from.GetValues());
});

test("uses inherited CjsModel schema, graph export, and clone behavior", () =>
{
    const document = CreatePlan();
    const plan = CjsCharacterAppearancePlan.from(document);
    const values = JSON.parse(JSON.stringify(plan.GetValues({ refs: true })));
    const roundTrip = CjsCharacterAppearancePlan.from(values);
    const clone = plan.Clone({ refs: true });

    assert.equal(typeof CjsCharacterAppearancePlan.schema.getSchema, "function");
    assert.ok(JSON.stringify(values).includes("_id"));
    assert.ok(JSON.stringify(values).includes("_ref"));
    assert.strictEqual(roundTrip.layers[0].owner, roundTrip.selections[0]);
    assert.strictEqual(roundTrip.bindings[1].source, roundTrip.targets[1]);
    assert.notStrictEqual(clone, plan);
    assert.strictEqual(clone.layers[0].owner, clone.selections[0]);
});

test("leaves graph integrity to the inherited CjsModel importer", () =>
{
    const unresolved = CreatePlan();
    unresolved.layers[0].owner = { _ref: "missing-selection" };
    assert.throws(
        () => CjsCharacterAppearancePlan.from(unresolved),
        /Unresolved _ref ids: "missing-selection"/u
    );

    const duplicate = CreatePlan();
    duplicate.origins[1]._id = duplicate.origins[0]._id;
    assert.throws(
        () => CjsCharacterAppearancePlan.from(duplicate),
        /Duplicate _id/u
    );

    const policyOwned = CreatePlan();
    policyOwned.targets[1].passes[0].op = "future-operation";
    assert.equal(
        CjsCharacterAppearancePlan.from(policyOwned).targets[1].passes[0].op,
        "future-operation"
    );
});

function CreatePlan()
{
    const originSource = { _ref: "origin-source" };
    const originDerived = { _ref: "origin-derived" };
    const originPolicy = { _ref: "origin-policy" };
    const layer = { _ref: "layer-top" };
    const coverage = { _ref: "coverage-top" };
    const destination = [ 0, 0, 1024, 1024 ];

    return {
        schema: "carbonenginejs.characterAppearancePlan",
        schemaVersion: 1,
        sourceBuild: "synthetic-build",
        origins: [ {
            _id: "origin-source",
            kind: "decoded",
            document: "characterResources",
            recordID: "7"
        }, {
            _id: "origin-derived",
            kind: "derived",
            rule: "same-lod-atomic-part"
        }, {
            _id: "origin-policy",
            kind: "policy",
            rule: "synthetic-order"
        } ],
        selections: [ {
            _id: "selection-top",
            groupID: "top-inner",
            origin: originSource
        } ],
        parts: [ {
            _id: "part-top",
            configurationPath: "res:/character/top.red",
            geometryPath: "res:/character/top.gr2",
            requestedLod: 0,
            resolvedLod: 0,
            modelFamily: "female",
            origin: originDerived
        } ],
        layers: [ {
            _id: "layer-top",
            owner: { _ref: "selection-top" },
            contributor: { _ref: "part-top" },
            origin: originDerived
        } ],
        textures: [ {
            _id: "texture-diffuse",
            uri: "res:/character/top_d.png",
            role: "diffuse",
            region: "body",
            imageSize: [ 512, 512 ],
            atlasSize: [ 1024, 1024 ],
            atlasRect: destination,
            origin: originSource
        }, {
            _id: "texture-cut",
            uri: "res:/character/top_mask.png",
            role: "cut",
            region: "body",
            origin: originSource
        }, {
            _id: "texture-mn",
            uri: "res:/character/top_mn.png",
            role: "normal-replacement",
            region: "body",
            origin: originSource
        }, {
            _id: "texture-tn",
            uri: "res:/character/top_tn.png",
            role: "normal-detail",
            region: "body",
            origin: originSource
        }, {
            _id: "texture-specular",
            uri: "res:/character/top_s.png",
            role: "specular",
            region: "body",
            origin: originSource
        } ],
        coverages: [ {
            _id: "coverage-top",
            region: "body",
            source: {
                texture: { _ref: "texture-diffuse" },
                channel: "a"
            },
            subtract: [ {
                texture: { _ref: "texture-cut" },
                channel: "r"
            } ],
            combine: "source-minus-subtract",
            origin: originDerived
        } ],
        targets: [ {
            _id: "target-d",
            scope: "shared",
            region: "body",
            output: "diffuse",
            size: [ 1024, 1024 ],
            passes: [ {
                layer,
                op: "alpha-overlay",
                inputs: [ {
                    role: "diffuse",
                    texture: { _ref: "texture-diffuse" },
                    sampleBounds: [ 0, 0, 1, 1 ]
                } ],
                coverage,
                destination,
                blend: "source-over",
                write: "rgba",
                origin: originDerived
            } ],
            origin: originDerived
        }, {
            _id: "target-n",
            scope: "shared",
            region: "body",
            output: "normal",
            size: [ 1024, 1024 ],
            passes: [ {
                layer,
                op: "fill",
                inputs: [ {
                    role: "neutral-normal",
                    value: [ 0.5, 0.5, 1, 1 ]
                } ],
                coverage,
                destination,
                blend: "replace",
                write: "rgb",
                origin: originPolicy
            }, {
                layer,
                op: "normal-replace",
                inputs: [ {
                    role: "normal-replacement",
                    texture: { _ref: "texture-mn" },
                    sampleBounds: [ 0.1, 0.2, 0.8, 0.7 ]
                } ],
                coverage,
                destination,
                blend: "replace",
                write: "rg",
                origin: originDerived
            }, {
                layer,
                op: "normal-add",
                inputs: [ {
                    role: "normal-detail",
                    texture: { _ref: "texture-tn" },
                    sampleBounds: [ 0.1, 0.2, 0.8, 0.7 ]
                } ],
                coverage,
                destination,
                blend: "add",
                write: "rg",
                strength: 1,
                origin: originDerived
            } ],
            origin: originDerived
        }, {
            _id: "target-s",
            scope: "shared",
            region: "body",
            output: "specular",
            size: [ 1024, 1024 ],
            passes: [ {
                layer,
                op: "alpha-overlay",
                inputs: [ {
                    role: "specular",
                    texture: { _ref: "texture-specular" },
                    sampleBounds: [ 0.25, 0.25, 0.5, 0.5 ]
                } ],
                coverage,
                destination,
                blend: "source-over",
                write: "rgb",
                origin: originDerived
            } ],
            origin: originDerived
        } ],
        bindings: [
            CreateBinding("MaterialDiffuse", "target-d", [ 0, 0, 1, 1 ], originDerived),
            CreateBinding("MaterialNormal", "target-n", [ 0.1, 0.2, 0.8, 0.7 ], originDerived),
            CreateBinding("MaterialSpecular", "target-s", [ 0.25, 0.25, 0.5, 0.5 ], originDerived)
        ],
        diagnostics: [ {
            code: "SYNTHETIC_POLICY",
            message: "The test order is policy-backed.",
            severity: "info",
            origin: originPolicy
        } ]
    };
}

function CreateBinding(sampler, target, sampleBounds, origin)
{
    return {
        consumerID: "configured-top",
        sampler,
        source: { _ref: target },
        sampleBounds,
        alpha: {
            mode: "coverage",
            coverage: { _ref: "coverage-top" }
        },
        origin
    };
}
