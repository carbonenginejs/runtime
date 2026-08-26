import test from "node:test";
import assert from "node:assert/strict";

import {
    readGlslBackendBlock,
    writeGlslBackendBlock
} from "../../../../../src/resource/formats/webgl/core/glslBackendBlock.js";

/**
 * One pass's lowering data covering every binding kind the emitter produces.
 *
 * The values are the emitter's own shapes, taken from `DxbcGlslEmitter.js` and
 * from real packages: `cb7` at register 0 is the pixel-stage remap, which is the
 * case that proves identifiers cannot be derived from the register alone.
 */
const BLOCK = {
    stages: {
        vertex: {
            bindings: [
                { kind: "constantBuffer", registerIndex: 3, name: "cb3", sizeInVec4: 20, style: "array" },
                { kind: "structuredUbo", registerIndex: 0, name: "CjsSb0", strideBytes: 48, capacityElements: 69 },
                {
                    kind: "bufferTexture",
                    registerIndex: 5,
                    name: "bt5",
                    format: "RGBA32F",
                    width: 2048,
                    returnTypes: [ "float", "float", "float", "float" ]
                }
            ],
            stageInputs: [
                {
                    register: 0,
                    name: "in_POSITION0",
                    semanticName: "POSITION",
                    semanticIndex: 0,
                    componentTypeName: "float32",
                    mask: 7
                },
                {
                    register: 4,
                    name: "in_BLENDINDICES0",
                    semanticName: "BLENDINDICES",
                    semanticIndex: 0,
                    componentTypeName: "uint32",
                    mask: 15
                }
            ]
        },
        pixel: {
            bindings: [
                { kind: "constantBuffer", registerIndex: 0, name: "cb7", sizeInVec4: 14, style: "array" },
                {
                    kind: "resource",
                    registerIndex: 0,
                    name: "s0",
                    samplerType: "samplerCube",
                    dimensionName: "texturecube",
                    pairedSamplerRegisters: [ 0, 3 ]
                },
                {
                    kind: "resource",
                    registerIndex: 4,
                    name: "s4",
                    samplerType: "sampler2DShadow",
                    dimensionName: "texture2d",
                    comparison: true,
                    samplerRegisterIndices: [ 1, 2 ],
                    pairedSamplerRegisters: [ 1, 2 ]
                },
                {
                    kind: "structuredTexture",
                    registerIndex: 9,
                    name: "sb9",
                    strideBytes: 32,
                    format: "RGBA32UI",
                    width: 2048
                }
            ],
            stageInputs: []
        },
        compute: {
            bindings: [
                { kind: "dispatchUniform", name: "cjsDispatchOrigin" },
                {
                    kind: "uavTexture",
                    registerIndex: 1,
                    name: "cjsUav1_s2",
                    slice: 2,
                    location: 0,
                    returnTypes: [ "float" ]
                },
                {
                    kind: "uavTexture",
                    registerIndex: 2,
                    name: "cjsUav2",
                    slice: null,
                    location: 1,
                    returnTypes: null
                }
            ],
            stageInputs: [],
            computeFragment: {
                threadGroup: [ 8, 8, 1 ],
                dispatchOriginUniform: "cjsDispatchOrigin",
                uavOutputs: [
                    { register: 1, slice: 2, location: 0, glslName: "cjsUav1_s2" },
                    { register: 2, slice: null, location: 1, glslName: "cjsUav2" }
                ]
            }
        }
    },
    transforms: [ {
        id: "detail-map-array-0",
        family: "detail-map-array",
        inputs: [
            { registerSpace: 0, registerIndex: 6, parameter: "Detail1Map" },
            { registerSpace: 0, registerIndex: 7, parameter: "Detail2Map" },
            { registerSpace: 0, registerIndex: 8, parameter: "Detail3Map" }
        ]
    } ]
};

test("every binding kind survives a write/read round trip", () =>
{
    const block = readGlslBackendBlock(writeGlslBackendBlock(BLOCK));

    assert.deepEqual(Object.keys(block.stages), [ "vertex", "pixel", "compute" ]);

    for (const [ stageName, stage ] of Object.entries(BLOCK.stages))
    {
        assert.deepEqual(block.stages[stageName].bindings, stage.bindings, stageName);
        assert.deepEqual(block.stages[stageName].stageInputs, stage.stageInputs, stageName);
    }

    assert.deepEqual(block.stages.compute.computeFragment, BLOCK.stages.compute.computeFragment);
});

test("the pixel-stage cb7 remap is carried, not re-derived", () =>
{
    const block = readGlslBackendBlock(writeGlslBackendBlock(BLOCK));
    const cb = block.stages.pixel.bindings.find((binding) => binding.kind === "constantBuffer");

    // The whole reason names are on the wire: register 0 in the pixel stage is
    // `cb7`, so a reader deriving `cb${registerIndex}` would produce `cb0` and
    // bind nothing. See docs/contracts/constant-buffer-slots.md.
    assert.equal(cb.registerIndex, 0);
    assert.equal(cb.name, "cb7");
});

test("the shared detail-map-array transform decodes with its derived fields", () =>
{
    const block = readGlslBackendBlock(writeGlslBackendBlock(BLOCK), { layoutKey: "Main.pass0" });

    assert.equal(block.transforms.length, 1);
    const [ transform ] = block.transforms;
    assert.equal(transform.family, "detail-map-array");
    assert.equal(transform.layoutKey, "Main.pass0");
    assert.equal(transform.output.name, "DetailArrayMap");
    assert.equal(transform.output.layerCount, 3);
    assert.deepEqual(transform.inputs.map((input) => input.parameter), [
        "Detail1Map", "Detail2Map", "Detail3Map"
    ]);
    assert.deepEqual(transform.inputs.map((input) => input.layer), [ 0, 1, 2 ]);
});

test("stage order is canonical, so identical lowering dedupes in the arena", () =>
{
    const reordered = {
        ...BLOCK,
        stages: {
            compute: BLOCK.stages.compute,
            pixel: BLOCK.stages.pixel,
            vertex: BLOCK.stages.vertex
        }
    };

    assert.deepEqual(writeGlslBackendBlock(reordered), writeGlslBackendBlock(BLOCK));
});

/**
 * Carbon puts local lights in two structured buffers plus a profile texture.
 * WebGL 2 has no structured buffers, so they are re-expressed as a packed data
 * texture or a constant buffer. Without this the affected shaders cannot bind
 * their lights at all, so the block has to carry the lowering.
 */
test("the packed-texture local-light lowering survives a round trip", () =>
{
    const binding = {
        kind: "structuredTexture",
        registerIndex: 13,
        name: "sb13",
        strideBytes: 0,
        format: "RGBA32UI",
        width: 2048,
        cjsSemantic: "packedLocalLights",
        lightIndexRegister: 13,
        lightDataRegister: 14,
        lightProfileRegister: 15,
        dataTexelBase: 131072
    };

    const block = readGlslBackendBlock(writeGlslBackendBlock({
        stages: { pixel: { bindings: [ binding ], stageInputs: [] } }
    }));
    const decoded = block.stages.pixel.bindings[0];

    assert.equal(decoded.localLightRole, "packed-texture");
    assert.equal(decoded.lightIndexRegister, 13);
    assert.equal(decoded.lightDataRegister, 14);
    assert.equal(decoded.lightProfileRegister, 15);
    // Buffer B's texel offset is not derivable; losing it misreads every light.
    assert.equal(decoded.dataTexelBase, 131072);
});

test("the constant-buffer local-light lowering survives a round trip", () =>
{
    const binding = {
        kind: "constantBuffer",
        registerIndex: 6,
        name: "cb6",
        sizeInVec4: 121,
        style: "array",
        cjsSemantic: "localLights",
        capacityLights: 40,
        lightIndexRegister: 13,
        lightDataRegister: 14,
        lightProfileRegister: null
    };

    const block = readGlslBackendBlock(writeGlslBackendBlock({
        stages: { pixel: { bindings: [ binding ], stageInputs: [] } }
    }));
    const decoded = block.stages.pixel.bindings[0];

    assert.equal(decoded.localLightRole, "constant-buffer");
    assert.equal(decoded.capacityLights, 40);
    // Absent is a real state: some permutations never sample the profile array,
    // and the lowering substitutes neutral attenuation for it.
    assert.equal(decoded.lightProfileRegister, null);
});

test("an ordinary binding carries no local-light record", () =>
{
    const block = readGlslBackendBlock(writeGlslBackendBlock(BLOCK));

    for (const stage of Object.values(block.stages))
    {
        for (const binding of stage.bindings)
        {
            assert.equal(binding.localLightRole, undefined, binding.name);
        }
    }
});

test("an unknown local-light role fails the build rather than being dropped", () =>
{
    const block = {
        stages: {
            pixel: {
                bindings: [ {
                    kind: "constantBuffer",
                    registerIndex: 11,
                    name: "cb11",
                    sizeInVec4: 64,
                    style: "array",
                    cjsSemantic: "somethingElse"
                } ],
                stageInputs: []
            }
        }
    };

    assert.throws(() => writeGlslBackendBlock(block), /somethingElse/u);
});

test("the block carries no version of its own", () =>
{
    // Carbon's container version is the only version. Nothing here may reserve a
    // leading byte for a private counter, because a second versioning axis over
    // the same bytes is exactly what this format does not have - a block from a
    // different build is caught by its size, not by a number it declares.
    const bytes = writeGlslBackendBlock(BLOCK);
    const block = readGlslBackendBlock(bytes);

    assert.equal(block.version, undefined);
    assert.equal(block.unsupported, undefined);
    assert.deepEqual(Object.keys(block.stages), [ "vertex", "pixel", "compute" ]);
});

test("a trailing byte is an error, not a silent discard", () =>
{
    const bytes = writeGlslBackendBlock(BLOCK);
    const extended = new Uint8Array(bytes.byteLength + 1);
    extended.set(bytes);

    assert.throws(() => readGlslBackendBlock(extended), /trailing/u);
});
