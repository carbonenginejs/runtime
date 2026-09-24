import test from "node:test";
import assert from "node:assert/strict";

import { Tr2Pass } from "../../../../src/resource/shader/reflection/Tr2Pass.js";
import { writeBackendBlock } from "../../../../src/resource/format/carbonEffect/carbonEffectBackendBlock.js";
import { writeGlslBackendBlock } from "../../../../src/resource/formats/webgl/core/glslBackendBlock.js";
import { blob, stage, str } from "./carbonEffectSynthetic.js";

const DETAIL_MERGE = {
    id: "Main.pass0:detail-map-array:sampled-resource:0:6",
    family: "detail-map-array",
    inputs: [
        { registerSpace: 0, registerIndex: 6, parameter: "Detail1Map" },
        { registerSpace: 0, registerIndex: 7, parameter: "Detail2Map" },
        { registerSpace: 0, registerIndex: 8, parameter: "Detail3Map" }
    ]
};

/** A GLSL block whose pixel stage declares the given resource bindings. */
function glslBlock(bindings, transforms = [ DETAIL_MERGE ])
{
    return writeGlslBackendBlock({ stages: { pixel: { bindings, stageInputs: [] } }, transforms });
}

/** The GLSL emitter's merged array: `s` + the output name, at the first member it met. */
const MERGED_ARRAY = {
    kind: "resource",
    registerIndex: 6,
    name: "sDetailArrayMap",
    samplerType: "sampler2DArray",
    dimensionName: "texture2darray"
};

test("a GLSL block's merge lands at the register its array is declared at", () =>
{
    const merges = Tr2Pass.readMergedResources(blob(glslBlock([ MERGED_ARRAY ])));

    assert.deepEqual(merges, [ { register: 6, arrayLayers: [ "Detail1Map", "Detail2Map", "Detail3Map" ], packed: false } ]);
});

test("a WebGPU block's merge lands at the binding tagged with its id", () =>
{
    const bytes = writeBackendBlock({
        bindGroups: [ {
            group: 0,
            bindings: [ {
                group: 0,
                binding: 1,
                resourceKind: "sampled-resource",
                registerSpace: 0,
                registerIndex: 6,
                visibility: [ "fragment" ],
                type: "texture_2d_array<f32>",
                generatedSymbol: "t6",
                arrayLayerCount: 3,
                transformId: DETAIL_MERGE.id
            } ]
        } ],
        transforms: [ DETAIL_MERGE ]
    });

    assert.deepEqual(Tr2Pass.readMergedResources(blob(bytes)), [ { register: 6, arrayLayers: [ "Detail1Map", "Detail2Map", "Detail3Map" ], packed: false } ]);
});

test("a channel pack is marked packed; a merge this body never samples is left out", () =>
{
    const pack = {
        id: "Main.pass0:pmdg-channel-pack:sampled-resource:0:2",
        family: "pmdg-channel-pack",
        inputs: [
            { registerSpace: 0, registerIndex: 2, parameter: "PaintMaskMap" },
            { registerSpace: 0, registerIndex: 3, parameter: "DirtMap" }
        ]
    };
    const bytes = glslBlock([
        { kind: "resource", registerIndex: 3, name: "sPmdgPackMap", samplerType: "sampler2D", dimensionName: "texture2d" }
    ], [ DETAIL_MERGE, pack ]);

    assert.deepEqual(Tr2Pass.readMergedResources(blob(bytes)), [ { register: 3, arrayLayers: [ "PaintMaskMap", "DirtMap" ], packed: true } ]);
});

test("no block, or a block with no merges, records nothing", () =>
{
    assert.deepEqual(Tr2Pass.readMergedResources(null), []);
    assert.deepEqual(Tr2Pass.readMergedResources(blob(glslBlock([], []))), []);
});

test("reading a pass puts the member names on the merged register's reflected resource", () =>
{
    const pixel = stage(1);
    pixel.textures = [ 6, 7, 8 ].map((registerIndex, index) => ({
        registerIndex,
        name: str(`Detail${index + 1}Map`),
        type: 2,
        count: 0,
        isSRGB: 0,
        isAutoregister: 0
    }));

    const pass = Tr2Pass.fromCarbonBinary({ renderStates: [], stages: [ pixel ], backendBlock: blob(glslBlock([ MERGED_ARRAY ])) });
    const resources = pass.stageInputs[1].resources;

    assert.deepEqual(resources.get(6).arrayLayers, [ "Detail1Map", "Detail2Map", "Detail3Map" ]);
    assert.equal(resources.get(6).name, "Detail1Map", "Carbon's reflection is untouched");
    assert.equal(resources.get(7).arrayLayers, null, "merged-away members stay reflected, unmarked");
});
