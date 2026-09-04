import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterGlesAppearanceAL } from "../../../src/character/gles/CjsCharacterGlesAppearanceAL.js";

const CONSTRUCTION = {
    sex: "female",
    operations: [
        {
            operation: "skeleton",
            resourcePath: "res:/graphics/character/female/skeleton.gr2"
        },
        {
            operation: "geometry",
            role: "body",
            index: 1,
            resourcePath: "res:/graphics/character/female/body.gr2"
        },
        {
            operation: "rebuild-areas",
            shaderPath: "res:/graphics/effect.gles2/avatar.fx"
        },
        {
            operation: "proof-textures",
            profile: "neutral"
        },
        {
            operation: "configured-part",
            partSourceRecordID: "top",
            configurationPath: "res:/graphics/character/top.black"
        }
    ]
};

test("keeps native loading, scene work, and configured parts behind injected hosts", async () =>
{
    const { hosts, calls } = CreateHosts();
    const adapter = new CjsCharacterGlesAppearanceAL({
        ...hosts,
        foundationTranslator: { Translate: value => value }
    });
    const stage = await adapter.Prepare(CONSTRUCTION, { revision: 1 });

    assert.equal(stage.status, "prepared");
    assert.deepEqual(calls, [
        [ "create", "female" ],
        [ "fetch", "res:/graphics/character/female/skeleton.gr2" ],
        [ "watch", "res:/graphics/character/female/skeleton.gr2" ],
        [ "skeleton", "skeleton" ],
        [ "fetch", "res:/graphics/character/female/body.gr2" ],
        [ "watch", "res:/graphics/character/female/body.gr2" ],
        [ "geometry", "body", "body" ],
        [ "areas", "res:/graphics/effect.gles2/avatar.fx" ],
        [ "proof", "neutral" ],
        [ "operation", "configured-part" ],
        [ "finalize", 1 ]
    ]);
    assert.deepEqual(adapter.GetDiagnostics(stage), {
        status: "prepared",
        sex: "female",
        resourceCount: 2,
        foundationRoles: [ "body" ],
        operationResults: [
            { operation: "skeleton", resourcePath: "res:/graphics/character/female/skeleton.gr2" },
            { operation: "geometry", role: "body", resourcePath: "res:/graphics/character/female/body.gr2" },
            { operation: "rebuild-areas", shaderPath: "res:/graphics/effect.gles2/avatar.fx" },
            { operation: "proof-textures", profile: "neutral" },
            { operation: "configured-part", status: "applied", configured: "top" }
        ],
        host: { bindingCount: 2 }
    });
    await adapter.Commit(stage, { revision: 1 });
    assert.equal(stage.status, "committed");
    assert.equal(await adapter.Release(stage, { reason: "test" }), true);
    assert.deepEqual(calls.slice(-3), [
        [ "release-visual", "test" ],
        [ "release-resource", "res:/graphics/character/female/body.gr2" ],
        [ "release-resource", "res:/graphics/character/female/skeleton.gr2" ]
    ]);
    assert.equal(await adapter.Release(stage), false);
});

test("uses Handoff rather than publishing a replacement stage twice", async () =>
{
    const { hosts, calls } = CreateHosts();
    const adapter = new CjsCharacterGlesAppearanceAL({
        ...hosts,
        foundationTranslator: { Translate: value => value }
    });
    const previous = await adapter.Prepare(CONSTRUCTION);
    await adapter.Commit(previous);
    const staged = await adapter.Prepare({ ...CONSTRUCTION, sex: "male" });

    await adapter.Handoff(previous, staged, { revision: 2 });
    assert.equal(previous.status, "superseded");
    assert.equal(staged.status, "committed");
    assert.deepEqual(calls.filter(value => value[0] === "handoff"), [
        [ "handoff", "female", "male", 2 ]
    ]);
    await adapter.Release(previous);
    await adapter.Release(staged);
});

test("releases fetched resources after a prepare failure", async () =>
{
    const { hosts, calls } = CreateHosts({ failProof: true });
    const adapter = new CjsCharacterGlesAppearanceAL({
        ...hosts,
        foundationTranslator: { Translate: value => value }
    });

    await assert.rejects(adapter.Prepare(CONSTRUCTION), /did not apply proof textures/u);
    assert.deepEqual(calls.slice(-3), [
        [ "release-visual", "prepare-failed" ],
        [ "release-resource", "res:/graphics/character/female/body.gr2" ],
        [ "release-resource", "res:/graphics/character/female/skeleton.gr2" ]
    ]);
});

function CreateHosts({ failProof = false } = {})
{
    const calls = [];
    const resources = new Map();
    const hosts = {
        resourceHost: {
            async Fetch(path)
            {
                calls.push([ "fetch", path ]);
                const resource = { path };
                resources.set(path, resource);
                return resource;
            },
            async Watch(resource)
            {
                calls.push([ "watch", resource.path ]);
                return true;
            },
            async Release(resource)
            {
                calls.push([ "release-resource", resource.path ]);
            }
        },
        visualHost: {
            async CreateCharacter({ sex })
            {
                calls.push([ "create", sex ]);
                return { sex };
            },
            async SetSkeleton(stage, resource)
            {
                calls.push([ "skeleton", resource.path.split("/").at(-1).replace(".gr2", "") ]);
                stage.backend.skeleton = resource;
                return true;
            },
            async SetGeometry(stage, resource, operation)
            {
                calls.push([ "geometry", operation.role, resource.path.split("/").at(-1).replace(".gr2", "") ]);
                return { role: operation.role };
            },
            async RebuildAreas(_stage, operation)
            {
                calls.push([ "areas", operation.shaderPath ]);
                return true;
            },
            async ApplyProofTextures(_stage, operation)
            {
                calls.push([ "proof", operation.profile ]);
                return !failProof;
            },
            async FinalizePrepared(_stage, context)
            {
                calls.push([ "finalize", context.revision ?? null ]);
                return true;
            },
            async Commit(stage)
            {
                calls.push([ "commit", stage.sex ]);
                return true;
            },
            async Handoff(previous, staged, context)
            {
                calls.push([ "handoff", previous.sex, staged.sex, context.revision ?? null ]);
                return true;
            },
            async Release(_stage, context)
            {
                calls.push([ "release-visual", context.reason ?? null ]);
            },
            GetDiagnostics(stage)
            {
                return { bindingCount: stage.resources.length };
            }
        },
        operationHost: {
            async Execute(_stage, operation)
            {
                calls.push([ "operation", operation.operation ]);
                return { configured: operation.partSourceRecordID };
            }
        }
    };
    return { hosts, calls };
}
