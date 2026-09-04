import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterGlesAtlasPlanning } from "../../../src/character/gles/CjsCharacterGlesAtlasPlanning.js";

const CROPPED = {
    width: 1024,
    height: 512,
    offset: [ 0.25, 0.5 ],
    extent: [ 0.5, 0.25 ],
    hasPlacementMetadata: true
};

const COVERAGE = {
    width: 2048,
    height: 2048,
    offset: [ 0.5, 0.5 ],
    extent: [ 0.25, 0.25 ],
    hasPlacementMetadata: true
};

test("plans a placed copy without creating an effect or target", () =>
{
    const descriptor = CjsCharacterGlesAtlasPlanning.PlanCopy({
        path: "res:/graphics/character/source.png",
        metadata: CROPPED,
        targetSize: [ 2048, 2048 ],
        alphaMultiplier: 0.75,
        blend: true
    });

    assert.deepEqual(descriptor, {
        kind: "copy",
        shader: "copy-blit",
        viewport: [ 512, 1024, 1024, 512 ],
        parameters: {
            SourceUVs: [ 0.25, 0.5, 0.75, 0.75 ],
            TextureReverseUV: [ 0.25, 0.5, 0.5, 0.25 ],
            AlphaMultiplier: [ 0.75, 0, 0, 0 ]
        },
        textures: { Texture: "res:/graphics/character/source.png" },
        blend: "source-alpha",
        report: {
            mode: "foundation-copy",
            path: "res:/graphics/character/source.png",
            alphaMultiplier: 0.75,
            placement: [ 0.25, 0.5, 0.5, 0.25 ],
            uv: {
                status: "experimental-policy",
                rule: "legacy-opengl-normalized-png-placement-v1",
                metadata: {
                    width: 1024,
                    height: 512,
                    offset: [ 0.25, 0.5 ],
                    extent: [ 0.5, 0.25 ],
                    hasPlacementMetadata: true,
                    targetSize: [ 2048, 2048 ]
                },
                sourceBounds: [ 0.25, 0.5, 0.75, 0.75 ],
                destinationViewport: [ 512, 1024, 1024, 512 ],
                correctness: "unverified"
            }
        }
    });
});

test("plans an owner-masked material replacement over only intersecting coverage", () =>
{
    const descriptor = CjsCharacterGlesAtlasPlanning.PlanOverlay({
        path: "res:/graphics/character/garment.png",
        metadata: CROPPED,
        targetSize: [ 2048, 2048 ],
        coveragePath: "res:/graphics/character/garment-cut.png",
        coverageMetadata: COVERAGE,
        operation: { op: "diffuse-replace", weight: 0.5 },
        rgbOnly: true
    });

    assert.equal(descriptor.kind, "masked-overlay");
    assert.equal(descriptor.shader, "simple-blit");
    assert.deepEqual(descriptor.viewport, [ 1024, 1024, 512, 512 ]);
    assert.deepEqual(descriptor.parameters, {
        SourceUVs: [ 0.5, 0.5, 0.75, 0.75 ],
        TextureReverseUV: [ 0.25, 0.5, 0.5, 0.25 ],
        MaskReverseUV: [ 0.5, 0.5, 0.25, 0.25 ],
        Strength: [ 0.5, 0, 0, 0 ],
        MultAlpha: [ 0, 0, 0, 0 ]
    });
    assert.deepEqual(descriptor.textures, {
        Texture: "res:/graphics/character/garment.png",
        MaskMap: "res:/graphics/character/garment-cut.png"
    });
    assert.equal(descriptor.blend, "source-alpha");
    assert.equal(descriptor.colorWrite, "rgb");
    assert.equal(descriptor.report.mode, "owner-masked-replace");
    assert.equal(descriptor.report.alphaOperation, "source-alpha-rgb-preserve-foundation-alpha");
});

test("keeps normal additions independent of owner coverage", () =>
{
    const descriptor = CjsCharacterGlesAtlasPlanning.PlanNormal({
        path: "res:/graphics/character/normal.png",
        metadata: CROPPED,
        targetSize: [ 2048, 2048 ],
        coveragePath: "res:/graphics/character/ignored-cut.png",
        coverageMetadata: COVERAGE,
        operation: { op: "normal-add", weight: 0.25 }
    });

    assert.equal(descriptor.kind, "normal-add");
    assert.equal(descriptor.shader, "twist-normal-blit");
    assert.deepEqual(descriptor.textures, {
        Texture: "res:/graphics/character/normal.png"
    });
    assert.equal(descriptor.blend, "additive");
    assert.equal(descriptor.report.coveragePath, null);
    assert.equal(descriptor.report.strength, 0.25);
});

test("rejects atlas sources whose aspect or coverage cannot be realized", () =>
{
    assert.throws(
        () => CjsCharacterGlesAtlasPlanning.PlanCopy({
            path: "res:/graphics/character/source.png",
            metadata: CROPPED,
            targetSize: [ 1024, 512 ]
        }),
        /aspect mismatch/u
    );
    assert.throws(
        () => CjsCharacterGlesAtlasPlanning.PlanOverlay({
            path: "res:/graphics/character/source.png",
            metadata: CROPPED,
            targetSize: [ 2048, 2048 ],
            coveragePath: "res:/graphics/character/missing-metadata.png"
        }),
        /coverage metadata/u
    );
});
