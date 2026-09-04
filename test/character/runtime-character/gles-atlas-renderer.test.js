import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterGlesAtlasRenderer } from "../../../src/character/gles/CjsCharacterGlesAtlasRenderer.js";

const PASSES = [
    {
        kind: "copy",
        shader: "copy-blit",
        viewport: [ 0, 0, 512, 512 ],
        parameters: { SourceUVs: [ 0, 0, 1, 1 ] },
        textures: { Texture: "res:/source.png" },
        blend: "disabled",
        report: { mode: "copy", placement: [ 0, 0, 1, 1 ] }
    },
    {
        kind: "normal-add",
        shader: "twist-normal-blit",
        viewport: [ 0, 0, 512, 512 ],
        parameters: { Strength: [ 0.5, 0, 0, 0 ] },
        textures: { Texture: "res:/normal.png" },
        blend: "additive",
        report: { mode: "normal-add" }
    }
];

test("composes passes in order through the injected host and releases them in reverse", async () =>
{
    const { host, calls } = CreateHost();
    const renderer = new CjsCharacterGlesAtlasRenderer({ atlasHost: host });
    const stage = await renderer.Compose({
        name: "body-diffuse",
        targetSize: [ 512, 512 ],
        passes: PASSES
    });

    assert.deepEqual(calls, [
        [ "target", "body-diffuse", 512, 512 ],
        [ "effect", "copy-blit" ],
        [ "prepare", "copy-blit" ],
        [ "render", "copy", "copy-blit", "rgba" ],
        [ "effect", "twist-normal-blit" ],
        [ "prepare", "twist-normal-blit" ],
        [ "render", "normal-add", "twist-normal-blit", "rgba" ],
        [ "finalize", "body-diffuse" ],
        [ "texture", "body-diffuse" ]
    ]);
    assert.deepEqual(stage.report, [
        { mode: "copy", placement: [ 0, 0, 1, 1 ] },
        { mode: "normal-add" }
    ]);
    assert.equal(stage.texture.id, "body-diffuse-texture");
    assert.equal(await renderer.Release(stage), true);
    assert.deepEqual(calls.slice(-3), [
        [ "destroy-effect", "twist-normal-blit" ],
        [ "destroy-effect", "copy-blit" ],
        [ "destroy-target", "body-diffuse" ]
    ]);
    assert.equal(await renderer.Release(stage), false);
});

test("cleans native resources if a pass fails before composition can commit", async () =>
{
    const { host, calls } = CreateHost({ failRenderAt: 2 });
    const renderer = new CjsCharacterGlesAtlasRenderer({ atlasHost: host });

    await assert.rejects(
        renderer.Compose({
            name: "body-normal",
            targetSize: [ 512, 512 ],
            passes: PASSES
        }),
        /did not render twist-normal-blit/u
    );
    assert.deepEqual(calls.slice(-3), [
        [ "destroy-effect", "twist-normal-blit" ],
        [ "destroy-effect", "copy-blit" ],
        [ "destroy-target", "body-normal" ]
    ]);
});

function CreateHost({ failRenderAt = 0 } = {})
{
    let renderCount = 0;
    const calls = [];
    return {
        calls,
        host: {
            async CreateTarget({ name, width, height })
            {
                calls.push([ "target", name, width, height ]);
                return { name };
            },
            async CreateEffect({ shader })
            {
                calls.push([ "effect", shader ]);
                return { shader };
            },
            async PrepareEffect(effect)
            {
                calls.push([ "prepare", effect.shader ]);
                return true;
            },
            async RenderPass({ effect, kind, colorWrite })
            {
                calls.push([ "render", kind, effect.shader, colorWrite ]);
                renderCount++;
                return renderCount !== failRenderAt;
            },
            async FinalizeTarget(target)
            {
                calls.push([ "finalize", target.name ]);
                return true;
            },
            async GetTexture(target)
            {
                calls.push([ "texture", target.name ]);
                return { id: target.name + "-texture" };
            },
            async DestroyEffect(effect)
            {
                calls.push([ "destroy-effect", effect.shader ]);
            },
            async DestroyTarget(target)
            {
                calls.push([ "destroy-target", target.name ]);
            }
        }
    };
}
