import { buildCopyblitDrawDescriptor } from "/packageDraw.js";
import { createHarnessComputePipeline } from "/computePipeline.js";
import {
    DECAL_COUNTER_V5_TARGET_HEIGHT,
    DECAL_COUNTER_V5_TARGET_WIDTH,
    DECAL_COUNTER_V5_VERTEX_BUFFER_LAYOUT,
    createDecalCounterV5FixtureValues,
    getDecalCounterV5ResourcePlan,
    validateDecalCounterV5PackagePair
} from "/decalCounterV5Fixture.js";
import {
    DECAL_CYLINDRIC_V5_TARGET_HEIGHT,
    DECAL_CYLINDRIC_V5_TARGET_WIDTH,
    DECAL_CYLINDRIC_V5_VERTEX_BUFFER_LAYOUT,
    createDecalCylindricV5FixtureValues,
    getDecalCylindricV5ResourcePlan,
    validateDecalCylindricV5PackagePair
} from "/decalCylindricV5Fixture.js";
import {
    DECAL_HOLE_V5_AXIAL_TRANSPARENCY,
    DECAL_HOLE_V5_BASE_TRANSPARENCY,
    DECAL_HOLE_V5_CUBE_ALPHA,
    DECAL_HOLE_V5_GLOW_COLOR,
    DECAL_HOLE_V5_HOLE_ALPHA,
    DECAL_HOLE_V5_HOLE_RED,
    DECAL_HOLE_V5_TARGET_HEIGHT,
    DECAL_HOLE_V5_TARGET_WIDTH,
    DECAL_HOLE_V5_VERTEX_BUFFER_LAYOUT,
    createDecalHoleV5FixtureValues,
    getDecalHoleV5ResourcePlan,
    validateDecalHoleV5PackagePair
} from "/decalHoleV5Fixture.js";
import {
    DECAL_GLOW_V5_TARGET_HEIGHT,
    DECAL_GLOW_V5_TARGET_WIDTH,
    DECAL_GLOW_V5_VERTEX_BUFFER_LAYOUT,
    createDecalGlowV5FixtureValues,
    getDecalGlowV5ResourcePlan,
    validateDecalGlowV5PackagePair
} from "/decalGlowV5Fixture.js";
import {
    DECAL_GLOW_CYLINDRIC_V5_TARGET_HEIGHT,
    DECAL_GLOW_CYLINDRIC_V5_TARGET_WIDTH,
    DECAL_GLOW_CYLINDRIC_V5_VERTEX_BUFFER_LAYOUT,
    createDecalGlowCylindricV5FixtureValues,
    getDecalGlowCylindricV5ResourcePlan,
    validateDecalGlowCylindricV5PackagePair
} from "/decalGlowCylindricV5Fixture.js";
import {
    DECALV5_CLEAR_TARGET,
    DECALV5_TARGET_HEIGHT,
    DECALV5_TARGET_WIDTH,
    DECALV5_VERTEX_BUFFER_LAYOUT,
    createDecalV5FixtureValues,
    getDecalV5ResourcePlan,
    validateDecalV5PackagePair
} from "/decalV5Fixture.js";
import {
    HULL_CLEAR_TARGETS,
    HULL_DEPTH_FORMAT,
    HULL_GEOMETRY_ASSETS,
    HULL_TARGET_HEIGHT,
    HULL_TARGET_WIDTH,
    HULL_TEXTURE_ASSETS,
    HULL_VERTEX_BUFFER_LAYOUT,
    createHullBindingValues,
    createHullPlaceholderTextures,
    createHullSamplers,
    getHullResourcePlan,
    parseDdsTexture,
    validateHullPackageRecord
} from "/hullFixture.js";
import {
    QUADV5_CLEAR_TARGETS,
    QUADV5_TARGET_HEIGHT,
    QUADV5_TARGET_WIDTH,
    QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT,
    QUADV5_VERTEX_BUFFER_LAYOUT,
    createQuadV5FixtureValues,
    createQuadV5HeatBindingCases,
    createQuadV5HeatDetailBindingCases,
    createQuadV5MainBindingValues,
    getQuadV5PackageTier,
    getQuadV5ResourcePlan,
    validateQuadV5PackagePair
} from "/quadV5Fixture.js";
import {
    QUAD_DETAIL_V5_TARGET_HEIGHT,
    QUAD_DETAIL_V5_TARGET_WIDTH,
    QUAD_DETAIL_V5_VERTEX_BUFFER_LAYOUT,
    createQuadDetailV5BindingCases,
    createQuadDetailV5FixtureValues,
    getQuadDetailV5ResourcePlan,
    validateQuadDetailV5PackagePair
} from "/quadDetailV5Fixture.js";
import {
    QUAD_GLASS_V5_CLEAR_TARGETS,
    QUAD_GLASS_V5_TARGET_HEIGHT,
    QUAD_GLASS_V5_TARGET_WIDTH,
    QUAD_GLASS_V5_SKINNED_VERTEX_BUFFER_LAYOUT,
    QUAD_GLASS_V5_VERTEX_BUFFER_LAYOUT,
    createQuadGlassV5FixtureValues,
    getQuadGlassV5PrimitiveRecipe,
    getQuadGlassV5ResourcePlan,
    validateQuadGlassV5PackagePair
} from "/quadGlassV5Fixture.js";
import {
    QUAD_HEAT_V5_CASES,
    QUAD_HEAT_V5_CLEAR_TARGETS,
    QUAD_HEAT_V5_TARGET_HEIGHT,
    QUAD_HEAT_V5_TARGET_WIDTH,
    QUAD_HEAT_V5_VERTEX_BUFFER_LAYOUT,
    createQuadHeatV5FixtureValues,
    getQuadHeatV5PrimitiveRecipe,
    getQuadHeatV5ResourcePlan,
    validateQuadHeatV5PackagePair
} from "/quadHeatV5Fixture.js";
import {
    QUAD_OIL_V5_CLEAR_TARGETS,
    QUAD_OIL_V5_RESOURCE_VARIANTS,
    QUAD_OIL_V5_SKINNED_VERTEX_BUFFER_LAYOUT,
    QUAD_OIL_V5_TARGET_HEIGHT,
    QUAD_OIL_V5_TARGET_WIDTH,
    QUAD_OIL_V5_VERTEX_BUFFER_LAYOUT,
    createQuadOilV5FixtureValues,
    getQuadOilV5ResourcePlan,
    validateQuadOilV5PackagePair
} from "/quadOilV5Fixture.js";
import {
    QUAD_SAILS_V5_CASES,
    QUAD_SAILS_V5_CLEAR_TARGETS,
    QUAD_SAILS_V5_TARGET_HEIGHT,
    QUAD_SAILS_V5_TARGET_WIDTH,
    QUAD_SAILS_V5_SKINNED_VERTEX_BUFFER_LAYOUT,
    QUAD_SAILS_V5_VERTEX_BUFFER_LAYOUT,
    createQuadSailsV5BindingCases,
    createQuadSailsV5FixtureValues,
    getQuadSailsV5PrimitiveRecipe,
    getQuadSailsV5ResourcePlan,
    validateQuadSailsV5PackagePair
} from "/quadSailsV5Fixture.js";
import { CjsWebgpuDevice } from "/CjsWebgpuDevice.js";
import { buildEveSpaceObjectMainUniformData, MaterialLayoutFromPackage } from "/spaceObjectMainUniforms.js";
import { CjsWebgpuTrinityBatchDispatcher } from "/trinityBatchDispatcher.js";
import { CjsWebgpuTrinityPassEncoder } from "/trinityPassEncoder.js";

const WIDTH = QUADV5_TARGET_WIDTH;
const HEIGHT = QUADV5_TARGET_HEIGHT;
const BYTES_PER_PIXEL = 4;
const BYTES_PER_ROW = 256;
const TRINITY_BATCH_TYPE_OPAQUE = 0;
const TRINITY_BATCH_TYPE_DECAL = 1;
const EXPECTED_PIXEL = Object.freeze([ 255, 0, 0, 255 ]);
const CONFIG = await fetch("/config.json").then((response) => response.json());
const DECAL_FAMILY_V5_PROFILES = Object.freeze({
    standard: Object.freeze({
        label: "DecalV5",
        route: "/draw-decalv5.json",
        width: DECALV5_TARGET_WIDTH,
        height: DECALV5_TARGET_HEIGHT,
        vertexLayout: DECALV5_VERTEX_BUFFER_LAYOUT,
        createValues: createDecalV5FixtureValues,
        getResourcePlan: getDecalV5ResourcePlan,
        validatePair: validateDecalV5PackagePair,
        resolveUniformData: (_record, values) => values.uniformData
    }),
    cylindric: Object.freeze({
        label: "DecalCylindricV5",
        route: "/draw-decalcylindricv5.json",
        width: DECAL_CYLINDRIC_V5_TARGET_WIDTH,
        height: DECAL_CYLINDRIC_V5_TARGET_HEIGHT,
        vertexLayout: DECAL_CYLINDRIC_V5_VERTEX_BUFFER_LAYOUT,
        createValues: createDecalCylindricV5FixtureValues,
        getResourcePlan: getDecalCylindricV5ResourcePlan,
        validatePair: validateDecalCylindricV5PackagePair,
        resolveUniformData: (record, values) => Object.freeze({
            ...buildEveSpaceObjectMainUniformData(record, values.bindingValues,
                { materialLayout: MaterialLayoutFromPackage(record) }),
            ...values.decalUniformData
        })
    }),
    hole: Object.freeze({
        label: "DecalHoleV5",
        route: "/draw-decalholev5.json",
        width: DECAL_HOLE_V5_TARGET_WIDTH,
        height: DECAL_HOLE_V5_TARGET_HEIGHT,
        vertexLayout: DECAL_HOLE_V5_VERTEX_BUFFER_LAYOUT,
        createValues: createDecalHoleV5FixtureValues,
        getResourcePlan: getDecalHoleV5ResourcePlan,
        validatePair: validateDecalHoleV5PackagePair,
        resolveUniformData: (record, values) => Object.freeze({
            ...buildEveSpaceObjectMainUniformData(record, values.bindingValues,
                { materialLayout: MaterialLayoutFromPackage(record) }),
            ...values.decalUniformData
        })
    }),
    counter: Object.freeze({
        label: "DecalCounterV5",
        route: "/draw-decalcounterv5.json",
        width: DECAL_COUNTER_V5_TARGET_WIDTH,
        height: DECAL_COUNTER_V5_TARGET_HEIGHT,
        vertexLayout: DECAL_COUNTER_V5_VERTEX_BUFFER_LAYOUT,
        createValues: createDecalCounterV5FixtureValues,
        getResourcePlan: getDecalCounterV5ResourcePlan,
        validatePair: validateDecalCounterV5PackagePair,
        resolveUniformData: (record, values) => Object.freeze({
            ...buildEveSpaceObjectMainUniformData(record, values.bindingValues,
                { materialLayout: MaterialLayoutFromPackage(record) }),
            ...values.decalUniformData
        })
    }),
    glow: Object.freeze({
        label: "DecalGlowV5",
        route: "/draw-decalglowv5.json",
        width: DECAL_GLOW_V5_TARGET_WIDTH,
        height: DECAL_GLOW_V5_TARGET_HEIGHT,
        vertexLayout: DECAL_GLOW_V5_VERTEX_BUFFER_LAYOUT,
        createValues: createDecalGlowV5FixtureValues,
        getResourcePlan: getDecalGlowV5ResourcePlan,
        validatePair: validateDecalGlowV5PackagePair,
        resolveUniformData: (record, values) => Object.freeze({
            ...buildEveSpaceObjectMainUniformData(record, values.bindingValues,
                { materialLayout: MaterialLayoutFromPackage(record) }),
            ...values.decalUniformData
        })
    }),
    glowCylindric: Object.freeze({
        label: "DecalGlowCylindricV5",
        route: "/draw-decalglowcylindricv5.json",
        width: DECAL_GLOW_CYLINDRIC_V5_TARGET_WIDTH,
        height: DECAL_GLOW_CYLINDRIC_V5_TARGET_HEIGHT,
        vertexLayout: DECAL_GLOW_CYLINDRIC_V5_VERTEX_BUFFER_LAYOUT,
        createValues: createDecalGlowCylindricV5FixtureValues,
        getResourcePlan: getDecalGlowCylindricV5ResourcePlan,
        validatePair: validateDecalGlowCylindricV5PackagePair,
        resolveUniformData: (record, values) => Object.freeze({
            ...buildEveSpaceObjectMainUniformData(record, values.bindingValues,
                { materialLayout: MaterialLayoutFromPackage(record) }),
            ...values.decalUniformData
        })
    })
});
const SOURCE = `
struct VertexOutput
{
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var sampledTexture: texture_2d<f32>;
@group(0) @binding(1) var sampledSampler: sampler;

@vertex
fn vertexMain(@location(0) position: vec2f, @location(1) uv: vec2f) -> VertexOutput
{
    var output: VertexOutput;
    output.position = vec4f(position, 0.0, 1.0);
    output.uv = uv;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f
{
    return textureSample(sampledTexture, sampledSampler, input.uv);
}
`;

function Assert(condition, message)
{
    if (!condition)
    {
        throw new Error(message);
    }
}

function ScopeFixtureBindingValues(pipeline, values, label)
{
    Assert(values instanceof Map, `${label} must be a Map`);
    const expected = new Map();
    const scopeCounts = new Map();
    for (const group of Array.isArray(pipeline?.bindGroups) ? pipeline.bindGroups : [])
    {
        for (const binding of Array.isArray(group?.bindings) ? group.bindings : [])
        {
            const identity = typeof binding.identity === "string" && binding.identity
                ? binding.identity
                : `${binding.resourceKind}:${binding.registerSpace}:${binding.registerIndex}`;
            const scopeIdentity = typeof binding.scopeIdentity === "string" && binding.scopeIdentity
                ? binding.scopeIdentity
                : identity;
            Assert(!expected.has(scopeIdentity), `${label} duplicates pipeline scope ${scopeIdentity}`);
            expected.set(scopeIdentity, identity);
            scopeCounts.set(identity, (scopeCounts.get(identity) || 0) + 1);
        }
    }

    const result = new Map();
    const consumed = new Set();
    for (const [ scopeIdentity, identity ] of expected)
    {
        let sourceIdentity = null;
        if (values.has(scopeIdentity))
        {
            sourceIdentity = scopeIdentity;
        }
        else if (values.has(identity))
        {
            Assert(
                scopeCounts.get(identity) === 1,
                `${label} base identity ${identity} is ambiguous across stage-scoped bindings`
            );
            sourceIdentity = identity;
        }
        if (sourceIdentity === null)
        {
            continue;
        }
        Assert(
            !consumed.has(sourceIdentity),
            `${label} base identity ${sourceIdentity} is ambiguous across stage-scoped bindings`
        );
        consumed.add(sourceIdentity);
        result.set(scopeIdentity, values.get(sourceIdentity));
    }
    for (const identity of values.keys())
    {
        Assert(consumed.has(identity), `${label} has unexpected identity ${identity}`);
    }
    return result;
}

function AssertPixels(bytes, expectedPixel = EXPECTED_PIXEL)
{
    for (let y = 0; y < HEIGHT; y += 1)
    {
        const row = y * BYTES_PER_ROW;
        for (let x = 0; x < WIDTH; x += 1)
        {
            const offset = row + x * BYTES_PER_PIXEL;
            for (let component = 0; component < BYTES_PER_PIXEL; component += 1)
            {
                Assert(
                    bytes[offset + component] === expectedPixel[component],
                    `Pixel mismatch at (${x}, ${y}) component ${component}: ` +
                    `expected ${expectedPixel[component]}, received ${bytes[offset + component]}`
                );
            }
        }
    }
}

function FormatCompilationMessage(message)
{
    const location = message.lineNum
        ? `${message.lineNum}:${message.linePos || 1}`
        : `offset ${message.offset || 0}`;
    return `${message.type} ${location} (${message.offset || 0}+${message.length || 0}): ${message.message}`;
}

async function CompileCandidate(device)
{
    if (!CONFIG.compileWgsl) return null;
    const response = await fetch("/candidate.wgsl");
    Assert(response.ok, `Failed to load candidate WGSL: HTTP ${response.status}`);
    const module = device.createShaderModule({ label: CONFIG.label, code: await response.text() });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter((message) => message.type === "error");
    Assert(errors.length === 0, `Candidate WGSL ${CONFIG.label} failed:\n${info.messages.map(FormatCompilationMessage).join("\n")}`);
    return {
        label: CONFIG.label,
        warningCount: info.messages.filter((message) => message.type === "warning").length,
        messages: info.messages.map(FormatCompilationMessage)
    };
}

function CreateAdapterResourceSlot(payload = null)
{
    const adapterResources = new Map();
    return {
        state: "loaded",
        IsCurrent()
        {
            return true;
        },
        GetPayload()
        {
            return payload;
        },
        MarkLoaded()
        {
            this.state = "loaded";
            return this;
        },
        MarkPreparing()
        {
            this.state = "preparing";
            return this;
        },
        MarkPrepared()
        {
            this.state = "prepared";
            return this;
        },
        GetAdapterResource(key)
        {
            return adapterResources.get(key) ?? null;
        },
        SetAdapterResource(key, value)
        {
            adapterResources.set(key, value);
            return this;
        },
        DestroyAdapterResource(key)
        {
            const value = adapterResources.get(key);
            adapterResources.delete(key);
            value?.Destroy?.();
            return this;
        }
    };
}

async function PublishPreparedResourceBundle(webgpu, payload, name)
{
    const resource = CreateAdapterResourceSlot(payload);
    const bundle = await webgpu.RealizeResource(resource, payload);
    Assert(bundle, `${name} publication did not populate the WebGPU adapter slot`);
    return bundle;
}

async function PublishPreparedRgba8Texture(webgpu, payload, name, textureKey)
{
    const resource = CreateAdapterResourceSlot(payload);
    const bundle = await webgpu.RealizeRgba8Texture(resource, {
        textureKey,
        bundleLabel: `${name} resources`,
        adapterKey: "webgpu"
    });
    Assert(bundle, `${name} publication did not populate the WebGPU adapter slot`);
    return bundle;
}

async function PublishPreparedSampler(webgpu, payload, name, samplerKey)
{
    const resource = CreateAdapterResourceSlot(payload);
    const bundle = await webgpu.RealizeSampler(resource, {
        samplerKey,
        bundleLabel: `${name} resources`,
        adapterKey: "webgpu"
    });
    Assert(bundle, `${name} publication did not populate the WebGPU adapter slot`);
    return bundle;
}

const ARRAY_TEXTURE_SOURCE = `
struct VertexOutput
{
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var arrayTexture: texture_2d_array<f32>;
@group(0) @binding(1) var arraySampler: sampler;

@vertex
fn vertexMain(@location(0) position: vec2f, @location(1) uv: vec2f) -> VertexOutput
{
    var output: VertexOutput;
    output.position = vec4f(position, 0.0, 1.0);
    output.uv = uv;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f
{
    // The left half samples layer 0 and the right half layer 1, so one draw
    // proves both layers are addressable and distinct.
    let layer = select(0, 1, input.uv.x >= 0.5);
    return textureSampleLevel(arrayTexture, arraySampler, input.uv, layer, 0.0);
}
`;

const ARRAY_TEXTURE_WIDTH = 4;
const ARRAY_TEXTURE_HEIGHT = 2;
const ARRAY_TEXTURE_LAYER_0 = Object.freeze([ 255, 0, 0, 255 ]);
const ARRAY_TEXTURE_LAYER_1 = Object.freeze([ 0, 0, 255, 255 ]);

/**
 * Draw through an engine-created 2d-array texture and assert each layer's
 * pixels exactly.
 *
 * This is a synthetic gate on purpose: it proves array-texture creation, the
 * array view, and the binding adapter's array branch without depending on any
 * shader package. Nothing else in the harness could distinguish "the array
 * binding works" from "the shader happens not to read that layer".
 *
 * @param {object} webgpu Engine device.
 * @returns {Promise<object>} Draw record plus the expected per-layer pixels.
 */
async function CreateArrayTextureDraw(webgpu)
{
    const device = webgpu.GetDevice();
    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: "engine-webgpu array-texture resources",
        geometries: {
            main: {
                label: "engine-webgpu array-texture geometry",
                vertexBuffers: [ {
                    slot: 0,
                    data: new Float32Array([
                        -1, -1, 0, 1,
                         3, -1, 2, 1,
                        -1,  3, 0, -1
                    ]),
                    layout: {
                        arrayStride: 16,
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: "float32x2" },
                            { shaderLocation: 1, offset: 8, format: "float32x2" }
                        ]
                    }
                } ]
            }
        },
        textures: {
            "sampled-resource:0:0": {
                label: "engine-webgpu two-layer array texture",
                width: 1,
                height: 1,
                layers: 2,
                format: "rgba8unorm",
                bytesPerRow: 4,
                data: new Uint8Array([ ...ARRAY_TEXTURE_LAYER_0, ...ARRAY_TEXTURE_LAYER_1 ])
            }
        },
        samplers: {
            "sampler:0:0": {
                label: "engine-webgpu array-texture sampler",
                minFilter: "nearest",
                magFilter: "nearest",
                mipmapFilter: "nearest",
                addressModeU: "clamp-to-edge",
                addressModeV: "clamp-to-edge"
            }
        }
    }, "array-texture-resources");

    let target = null;
    let readback = null;
    try
    {
        const geometry = bundle.geometries.main;
        const arrayTexture = bundle.textures["sampled-resource:0:0"];
        Assert(arrayTexture, "array-texture fixture is missing its array texture");
        Assert(
            arrayTexture.viewDimension === "2d-array",
            `array-texture fixture created a ${arrayTexture.viewDimension} view`
        );
        Assert(arrayTexture.depthOrArrayLayers === 2, "array-texture fixture must carry exactly two layers");

        const pipeline = {
            key: "arrayTexture.pass0",
            techniqueName: "arrayTexture",
            passIndex: 0,
            renderStates: 0,
            states: [],
            shaderModules: [
                {
                    key: "arrayTexture.pass0.vertex",
                    stageName: "vertex",
                    entryPoint: "vertexMain",
                    wgsl: ARRAY_TEXTURE_SOURCE
                },
                {
                    key: "arrayTexture.pass0.pixel",
                    stageName: "pixel",
                    entryPoint: "fragmentMain",
                    wgsl: ARRAY_TEXTURE_SOURCE
                }
            ],
            bindGroups: [ {
                group: 0,
                bindings: [
                    {
                        sourceTruth: "wgsl-layout",
                        resourceKind: "sampled-resource",
                        registerSpace: 0,
                        registerIndex: 0,
                        group: 0,
                        binding: 0,
                        visibility: [ "fragment" ],
                        dynamic: false,
                        layout: { texture: { sampleType: "float", viewDimension: "2d-array", multisampled: false } }
                    },
                    {
                        sourceTruth: "wgsl-layout",
                        resourceKind: "sampler",
                        registerSpace: 0,
                        registerIndex: 0,
                        group: 0,
                        binding: 1,
                        visibility: [ "fragment" ],
                        dynamic: false,
                        layout: { sampler: { type: "filtering" } }
                    }
                ]
            } ]
        };
        const prepared = await webgpu.PreparePipeline(pipeline, { warningsAsErrors: true });
        const livePipeline = await webgpu.CreateRenderPipeline(prepared, {
            label: "engine-webgpu array-texture pipeline",
            vertex: { buffers: geometry.vertexBufferLayouts },
            fragment: { targets: [ { format: "rgba8unorm" } ] },
            primitive: { topology: "triangle-list" }
        });
        const draw = webgpu.CreateDraw(livePipeline, {
            geometry,
            resources: new Map([
                [ "sampled-resource:0:0", arrayTexture ],
                [ "sampler:0:0", bundle.samplers["sampler:0:0"] ]
            ]),
            draw: { vertexCount: 3 }
        });

        const bytesPerRow = 256;
        target = device.createTexture({
            label: "engine-webgpu array-texture target",
            size: { width: ARRAY_TEXTURE_WIDTH, height: ARRAY_TEXTURE_HEIGHT, depthOrArrayLayers: 1 },
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
        readback = device.createBuffer({
            label: "engine-webgpu array-texture readback",
            size: bytesPerRow * ARRAY_TEXTURE_HEIGHT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        const encoder = device.createCommandEncoder({ label: "engine-webgpu array-texture encoder" });
        const pass = encoder.beginRenderPass({
            label: "engine-webgpu array-texture render pass",
            colorAttachments: [ {
                view: target.createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: "clear",
                storeOp: "store"
            } ]
        });
        webgpu.EncodeDraw(pass, draw);
        pass.end();
        encoder.copyTextureToBuffer(
            { texture: target },
            { buffer: readback, bytesPerRow, rowsPerImage: ARRAY_TEXTURE_HEIGHT },
            { width: ARRAY_TEXTURE_WIDTH, height: ARRAY_TEXTURE_HEIGHT, depthOrArrayLayers: 1 }
        );
        webgpu.Submit([ encoder.finish() ]);
        await device.queue.onSubmittedWorkDone();

        await readback.mapAsync(GPUMapMode.READ);
        const pixels = new Uint8Array(readback.getMappedRange()).slice();
        readback.unmap();

        let layer0Pixels = 0;
        let layer1Pixels = 0;
        for (let y = 0; y < ARRAY_TEXTURE_HEIGHT; y += 1)
        {
            for (let x = 0; x < ARRAY_TEXTURE_WIDTH; x += 1)
            {
                const offset = (y * bytesPerRow) + (x * 4);
                const actual = Array.from(pixels.subarray(offset, offset + 4));
                // uv.x is x/width across the full-screen triangle, so the left
                // half must read layer 0 and the right half layer 1 exactly.
                const expected = ((x + 0.5) / ARRAY_TEXTURE_WIDTH) < 0.5
                    ? ARRAY_TEXTURE_LAYER_0
                    : ARRAY_TEXTURE_LAYER_1;
                Assert(
                    actual.every((value, index) => value === expected[index]),
                    `array-texture pixel (${x},${y}) is ${actual.join(",")}, expected ${expected.join(",")}`
                );
                if (expected === ARRAY_TEXTURE_LAYER_0) layer0Pixels += 1;
                else layer1Pixels += 1;
            }
        }
        Assert(layer0Pixels > 0 && layer1Pixels > 0, "array-texture gate must sample both layers");

        return {
            layers: 2,
            layerPixels: [ layer0Pixels, layer1Pixels ],
            pixelCount: ARRAY_TEXTURE_WIDTH * ARRAY_TEXTURE_HEIGHT,
            warningCount: prepared.diagnostics.filter((entry) => entry.type === "warning").length
        };
    }
    finally
    {
        readback?.destroy();
        target?.destroy();
        bundle.Destroy();
    }
}

async function CreatePhaseZeroDraw(webgpu)
{
    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: "engine-webgpu phase-0 resources",
        geometries: {
            main: {
                label: "engine-webgpu phase-0 geometry",
                vertexBuffers: [ {
                    slot: 0,
                    data: new Float32Array([
                        -1, -1, 0, 1,
                         3, -1, 1, 1,
                        -1,  3, 0, 0
                    ]),
                    layout: {
                        arrayStride: 16,
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: "float32x2" },
                            { shaderLocation: 1, offset: 8, format: "float32x2" }
                        ]
                    }
                } ]
            }
        }
    }, "phase-0-resources");
    let textureBundle = null;
    let samplerBundle = null;
    try
    {
        textureBundle = await PublishPreparedRgba8Texture(webgpu, {
            payloadType: "rgba",
            sourceFormat: "generated",
            width: 1,
            height: 1,
            pixelFormat: "rgba8unorm",
            data: new Uint8Array(EXPECTED_PIXEL),
            strideBytes: 4,
            origin: "top-left",
            colorSpace: "linear",
            alphaMode: "opaque",
            containerOnly: false,
            isDecoded: true
        }, "phase-0-texture", "sampled-resource:0:0");
        samplerBundle = await PublishPreparedSampler(webgpu, {
            payloadType: "webgpu-sampler",
            label: "engine-webgpu phase-0 sampler",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
            addressModeW: "clamp-to-edge",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "linear",
            lodMinClamp: 0,
            lodMaxClamp: 32,
            maxAnisotropy: 1
        }, "phase-0-sampler", "sampler:0:0");
        const geometry = bundle.geometries.main;
        const texture = textureBundle.textures["sampled-resource:0:0"];
        const sampler = samplerBundle.samplers["sampler:0:0"];
        const pipeline = {
            key: "phase0.pass0",
            shaderModules: [
                { key: "phase0.pass0.vertex", stageName: "vertex", entryPoint: "vertexMain", wgsl: SOURCE },
                { key: "phase0.pass0.pixel", stageName: "pixel", entryPoint: "fragmentMain", wgsl: SOURCE }
            ],
            bindGroups: [ {
                group: 0,
                bindings: [
                    { sourceTruth: "wgsl-layout", resourceKind: "sampled-resource", registerSpace: 0, registerIndex: 0, group: 0, binding: 0, visibility: [ "fragment" ], dynamic: false, layout: { texture: { sampleType: "float", viewDimension: "2d", multisampled: false } } },
                    { sourceTruth: "wgsl-layout", resourceKind: "sampler", registerSpace: 0, registerIndex: 0, group: 0, binding: 1, visibility: [ "fragment" ], dynamic: false, layout: { sampler: { type: "filtering" } } }
                ]
            } ]
        };
        const prepared = await webgpu.PreparePipeline(pipeline, { warningsAsErrors: true });
        const livePipeline = await webgpu.CreateRenderPipeline(prepared, {
            label: "engine-webgpu phase-0 pipeline",
            vertex: { buffers: geometry.vertexBufferLayouts },
            fragment: { targets: [ { format: "rgba8unorm" } ] },
            primitive: { topology: "triangle-list" }
        });
        return {
            bundle,
            textureBundle,
            samplerBundle,
            geometry,
            texture,
            sampler,
            draw: webgpu.CreateDraw(livePipeline, {
                geometry,
                resources: new Map([
                    [ "sampled-resource:0:0", texture ],
                    [ "sampler:0:0", sampler ]
                ]),
                draw: { vertexCount: 3 }
            })
        };
    }
    catch (error)
    {
        samplerBundle?.Destroy();
        textureBundle?.Destroy();
        bundle.Destroy();
        throw error;
    }
}

async function LoadDrawDescriptor()
{
    if (CONFIG.drawCarbonWebgpu)
    {
        const response = await fetch("/draw-package.json");
        Assert(response.ok, `Failed to load ${CONFIG.packageLabel}: HTTP ${response.status}`);
        const pipeline = await response.json();
        return { pipeline, fixture: buildCopyblitDrawDescriptor(pipeline) };
    }
    if (!CONFIG.drawWgsl) return null;
    const [ vertex, fragment ] = await Promise.all([
        fetch("/vertex.wgsl").then((response) => response.text()),
        fetch("/fragment.wgsl").then((response) => response.text())
    ]);
    const pipeline = {
        key: "fixture.pass0",
        techniqueName: "fixture",
        passIndex: 0,
        renderStates: 0,
        states: [],
        shaderModules: [
            { key: "fixture.pass0.vertex", stageName: "vertex", entryPoint: "main", wgsl: vertex },
            { key: "fixture.pass0.pixel", stageName: "pixel", entryPoint: "main", wgsl: fragment }
        ],
        bindGroups: [ {
            group: 0,
            bindings: [
                { sourceTruth: "wgsl-layout", resourceKind: "uniform-buffer", registerSpace: 0, registerIndex: 0, group: 0, binding: 0, visibility: [ "fragment" ], dynamic: false, layout: { buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: 48 } } },
                { sourceTruth: "wgsl-layout", resourceKind: "sampled-resource", registerSpace: 0, registerIndex: 0, group: 0, binding: 1, visibility: [ "fragment" ], dynamic: false, layout: { texture: { sampleType: "float", viewDimension: "2d", multisampled: false } } },
                { sourceTruth: "wgsl-layout", resourceKind: "sampler", registerSpace: 0, registerIndex: 0, group: 0, binding: 2, visibility: [ "fragment" ], dynamic: false, layout: { sampler: { type: "filtering" } } }
            ]
        } ]
    };
    return { pipeline, fixture: buildCopyblitDrawDescriptor(pipeline) };
}

async function CreateGeneratedDraw(webgpu)
{
    const loaded = await LoadDrawDescriptor();
    if (!loaded) return null;
    const { pipeline, fixture } = loaded;
    const device = webgpu.GetDevice();
    const vertices = new Float32Array([
        -1, -1, 0, 1, 0, 0,
        3, -1, 0, 1, 1, 0,
        -1, 3, 0, 1, 0, 1
    ]);
    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: "generated copyblit resources",
        geometries: {
            main: {
                label: "generated copyblit geometry",
                vertexBuffers: [ {
                    slot: 0,
                    data: vertices,
                    layout: {
                        arrayStride: 24,
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: "float32x4" },
                            { shaderLocation: 1, offset: 16, format: "float32x2" }
                        ]
                    }
                } ]
            }
        },
        textures: {
            "sampled-resource:0:0": {
                label: "generated copyblit t0",
                width: 1,
                height: 1,
                format: "rgba8unorm",
                bytesPerRow: 4,
                data: new Uint8Array([ 128, 128, 0, 255 ])
            }
        },
        samplers: {
            "sampler:0:0": {
                label: "generated copyblit s0",
                minFilter: "linear",
                magFilter: "linear",
                mipmapFilter: "linear",
                addressModeU: "clamp-to-edge",
                addressModeV: "clamp-to-edge"
            }
        }
    }, "copyblit-resources");
    const geometry = bundle.geometries.main;
    const sampledTexture = bundle.textures["sampled-resource:0:0"];
    const sampler = bundle.samplers["sampler:0:0"];
    let uniformBuffer = null;
    try
    {
        const prepared = await webgpu.PreparePipeline(pipeline, { warningsAsErrors: true });
        const livePipeline = await webgpu.CreateRenderPipeline(prepared, {
            label: "generated copyblit pipeline",
            vertex: {
                buffers: geometry.vertexBufferLayouts
            },
            fragment: {
                targets: [ {
                    format: "rgba8unorm",
                    ...(fixture.blend ? { blend: fixture.blend } : {})
                } ]
            },
            primitive: { topology: "triangle-list" }
        });
        const constants = new Float32Array([
            0, 0, 1, 1,
            0, 0, 1, 1,
            1, -1, 1, 1
        ]);
        uniformBuffer = device.createBuffer({
            label: "generated copyblit cb0",
            size: constants.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(uniformBuffer, 0, constants);
        const fixtureResources = ScopeFixtureBindingValues(pipeline, new Map([
            [ "uniform-buffer:0:0", { buffer: uniformBuffer } ],
            [ "sampled-resource:0:0", sampledTexture ],
            [ "sampler:0:0", sampler ]
        ]), "generated copyblit resources");
        const draw = webgpu.CreateDraw(livePipeline, {
            resources: fixtureResources,
            geometry,
            draw: { vertexCount: 3 }
        });
        return {
            draw,
            bundle,
            geometry,
            uniformBuffer,
            sampledTexture,
            sampler,
            expectedPixel: [ 128, 128, 255, 255 ],
            result: {
                vertexLabel: CONFIG.vertexLabel,
                fragmentLabel: CONFIG.fragmentLabel,
                packageLabel: CONFIG.packageLabel,
                warningCount: prepared.diagnostics.filter((entry) => entry.type === "warning").length
            }
        };
    }
    catch (error)
    {
        uniformBuffer?.destroy();
        bundle.Destroy();
        throw error;
    }
}

// Build the single layered texture a resource transform merges its inputs into.
//
// The producer removed every non-zero-layer input from the layout, so this is
// the only way the array binding can be filled: layer i is written from the
// input declared at layer i, in order. `missingLayer: "reject"` is honoured
// literally - a missing input throws rather than being substituted, because any
// stand-in layer would change the rendered result while still validating.
function AssembleTransformLayers(values, transform, labelPrefix)
{
    const layers = transform.inputs.map((input) =>
    {
        const source = values.textures.find((entry) => entry.name === input.parameter);
        Assert(
            source,
            `${labelPrefix} transform ${transform.id} is missing layer ${input.layer} input ${input.parameter}`
        );
        Assert(
            source.dimension === "2d",
            `${labelPrefix} transform ${transform.id} layer ${input.layer} input ${input.parameter}`
                + ` must be a 2D texture, not ${source.dimension}`
        );
        return source;
    });
    Assert(
        layers.length === transform.output.layerCount,
        `${labelPrefix} transform ${transform.id} needs exactly ${transform.output.layerCount} layers`
    );
    const [ first ] = layers;
    // One texture cannot hold layers of differing size or format, so a mismatch
    // is the transform being unsatisfiable rather than something to coerce.
    for (const layer of layers)
    {
        Assert(
            layer.width === first.width
                && layer.height === first.height
                && layer.format === first.format
                && layer.bytesPerRow === first.bytesPerRow,
            `${labelPrefix} transform ${transform.id} layer ${layer.name} does not match layer 0`
                + " in size or format"
        );
    }
    const layerBytes = first.bytesPerRow * first.height;
    const data = new Uint8Array(layerBytes * layers.length);
    for (let index = 0; index < layers.length; index += 1)
    {
        Assert(
            layers[index].data.byteLength === layerBytes,
            `${labelPrefix} transform ${transform.id} layer ${layers[index].name} is not exactly`
                + ` ${layerBytes} bytes`
        );
        data.set(layers[index].data, layerBytes * index);
    }
    return {
        label: `${labelPrefix} ${transform.output.name}`
            + ` (${layers.map((entry) => entry.name).join(" + ")})`,
        width: first.width,
        height: first.height,
        format: first.format,
        bytesPerRow: first.bytesPerRow,
        layers: layers.length,
        viewDimension: "2d-array",
        data
    };
}

async function CreateQuadV5GpuResources(webgpu, records)
{
    const variant = records[0]?.variant ?? "static";
    const tier = getQuadV5PackageTier(records[0]);
    const values = createQuadV5FixtureValues(WIDTH, HEIGHT, variant, tier);
    const skinned = variant === "skinned"
        || variant === "skinnedHeat"
        || variant === "skinnedHeatDetail";
    const geometrySource = Object.freeze({
        kind: "synthetic-quadv5",
        variant: skinned ? "skinned" : "static"
    });
    // Transforms are backend-independent in content: only the registers differ,
    // so the assembled layers are shared and each backend binds its own slot.
    const transforms = getQuadV5ResourcePlan(records[0]).transforms;
    const mergedInputNames = new Set(transforms
        .flatMap((entry) => entry.inputs.map((input) => input.parameter)));
    const texturePayload = (entry) => ({
        label: `QuadV5 ${entry.name}`,
        width: entry.width,
        height: entry.height,
        format: entry.format,
        bytesPerRow: entry.bytesPerRow ?? entry.width * 4,
        data: entry.data,
        // A layered texture read through a 2d-array view goes through the same
        // engine texture path as every 2d texture here, so the draw exercises
        // the realizer rather than a harness-local shortcut.
        ...(entry.dimension === "2d-array"
            ? { layers: entry.depthOrArrayLayers, viewDimension: "2d-array" }
            : {})
    });
    const texturePayloads = Object.fromEntries(values.textures
        .filter((entry) => entry.dimension === "2d" || entry.dimension === "2d-array")
        // A merged input has no binding of its own; publishing it would leave a
        // texture nothing can bind, so the published set stays equal to the
        // bound set and the layers are assembled from the fixture values below.
        .filter((entry) => !mergedInputNames.has(entry.name))
        .map((entry) => [ entry.name, texturePayload(entry) ]));
    for (const transform of transforms)
    {
        texturePayloads[transform.output.name] =
            AssembleTransformLayers(values, transform, "QuadV5");
    }
    const samplers = Object.fromEntries(values.samplers.map((entry) => [
        entry.name,
        {
            label: `QuadV5 ${entry.name}`,
            ...entry.gpu
        }
    ]));
    const device = webgpu.GetDevice();
    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: "QuadV5 resources",
        geometries: {
            main: {
                label: "QuadV5 harness-authored silhouette geometry",
                vertexBuffers: [
                    {
                        slot: 0,
                        data: values.vertices,
                        layout: QUADV5_VERTEX_BUFFER_LAYOUT
                    },
                    ...(skinned ? [ {
                        slot: 1,
                        data: values.boneIndices,
                        layout: QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT
                    } ] : [])
                ],
                indexBuffer: {
                    data: values.indices,
                    format: "uint16"
                }
            }
        },
        textures: texturePayloads,
        samplers
    }, "quadv5-resources");
    const cubeDefinition = values.textures.find((entry) => entry.dimension === "cube");
    let cubeTexture = null;
    let boneBuffer = null;
    const storageBuffers = new Map();
    try
    {
        Assert(cubeDefinition, "QuadV5 fixture requires an environment cube");
        cubeTexture = device.createTexture({
            label: "QuadV5 EveSpaceSceneEnvMap",
            size: {
                width: cubeDefinition.width,
                height: cubeDefinition.height,
                depthOrArrayLayers: cubeDefinition.depthOrArrayLayers
            },
            mipLevelCount: 1,
            sampleCount: 1,
            dimension: "2d",
            format: cubeDefinition.format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });
        for (let face = 0; face < cubeDefinition.depthOrArrayLayers; face += 1)
        {
            device.queue.writeTexture(
                { texture: cubeTexture, origin: { x: 0, y: 0, z: face } },
                cubeDefinition.data.slice(face * 4, face * 4 + 4),
                { offset: 0, bytesPerRow: 4, rowsPerImage: 1 },
                { width: 1, height: 1, depthOrArrayLayers: 1 }
            );
        }
        const cubeView = cubeTexture.createView({
            label: "QuadV5 EveSpaceSceneEnvMap cube view",
            dimension: "cube"
        });
        if (skinned)
        {
            const boneTransform = new Float32Array([
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0.8660253882408142, 0, -0.5, 0.125,
                0, 1, 0, 0,
                0.5, 0, 0.8660253882408142, 0
            ]);
            boneBuffer = device.createBuffer({
                label: "QuadV5 indexed non-identity BoneTransforms",
                size: boneTransform.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(boneBuffer, 0, boneTransform);
        }
        for (const definition of values.storageBuffers)
        {
            const buffer = device.createBuffer({
                label: `QuadV5 ${definition.name}`,
                size: definition.data.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(buffer, 0, definition.data);
            Assert(
                definition.data.byteLength % definition.structureStride === 0,
                `QuadV5 ${definition.name} must hold whole ${definition.structureStride}-byte rows`
            );
            storageBuffers.set(definition.name, buffer);
        }
        const resourcesByBackend = new Map();
        for (const record of records)
        {
            const plan = getQuadV5ResourcePlan(record);
            const resources = new Map();
            for (const storage of plan.storage)
            {
                const buffer = storage.name === "BoneTransforms"
                    ? boneBuffer
                    : storageBuffers.get(storage.name);
                Assert(buffer, `QuadV5 fixture is missing storage ${storage.name}`);
                resources.set(storage.scopeIdentity, {
                    buffer,
                    offset: 0,
                    size: buffer.size
                });
            }
            for (const texture of plan.textures)
            {
                const resource = texture.name === "EveSpaceSceneEnvMap"
                    ? cubeView
                    : bundle.textures[texture.name];
                Assert(resource, `QuadV5 fixture is missing texture ${texture.name}`);
                resources.set(texture.scopeIdentity, resource);
            }
            for (const sampler of plan.samplers)
            {
                const resource = bundle.samplers[sampler.name];
                Assert(resource, `QuadV5 fixture is missing sampler ${sampler.name}`);
                resources.set(sampler.scopeIdentity, resource);
            }
            resourcesByBackend.set(record.backend, resources);
        }
        const heatCases = variant === "skinnedHeat"
            ? createQuadV5HeatBindingCases(WIDTH, HEIGHT)
            : (variant === "skinnedHeatDetail"
                ? createQuadV5HeatDetailBindingCases(WIDTH, HEIGHT)
                : null);
        const caseNames = heatCases?.caseNames ?? Object.freeze([ "base" ]);
        const bindingValuesByCase = heatCases?.bindingValuesByCase
            ?? Object.freeze({
                base: createQuadV5MainBindingValues(WIDTH, HEIGHT, tier)
            });
        return {
            caseNames,
            bindingValuesByCase,
            resourcesByBackend,
            tier,
            geometry: bundle.geometries.main,
            geometrySource,
            bundle,
            destroy()
            {
                boneBuffer?.destroy();
                for (const buffer of storageBuffers.values()) buffer.destroy();
                cubeTexture.destroy();
                bundle.Destroy();
            }
        };
    }
    catch (error)
    {
        boneBuffer?.destroy();
        for (const buffer of storageBuffers.values()) buffer.destroy();
        cubeTexture?.destroy();
        bundle.Destroy();
        throw error;
    }
}

async function CreateQuadDetailV5GpuResources(webgpu, records)
{
    const variant = records[0]?.variant ?? "static";
    const skinned = variant === "skinned";
    Assert(
        variant === "static" || skinned,
        "QuadDetailV5 resources require an exact static or skinned variant"
    );
    Assert(
        QUAD_DETAIL_V5_TARGET_WIDTH === WIDTH
            && QUAD_DETAIL_V5_TARGET_HEIGHT === HEIGHT,
        "QuadDetailV5 and harness target dimensions must match"
    );
    const detailPlan = getQuadDetailV5ResourcePlan(records[0]);
    const detailTier = detailPlan.tier;
    const values = createQuadDetailV5FixtureValues(WIDTH, HEIGHT, variant, detailTier);
    const cases = createQuadDetailV5BindingCases(WIDTH, HEIGHT, detailTier);
    // High adds two surface maps, the light profile array and a fourth sampler;
    // the three detail maps are present as transform inputs at both tiers.
    Assert(
        values.textures.length === (detailTier === "high" ? 17 : 14)
            && values.samplers.length === (detailTier === "high" ? 4 : 3),
        `QuadDetailV5 ${detailTier} fixture has an unexpected texture or sampler count`
    );
    const geometrySource = Object.freeze({
        kind: "synthetic-quaddetailv5",
        variant
    });
    const detailTransforms = detailPlan.transforms;
    const detailMergedInputs = new Set(detailTransforms
        .flatMap((entry) => entry.inputs.map((input) => input.parameter)));
    const texturePayloads = Object.fromEntries(values.textures
        .filter((entry) => entry.dimension === "2d" || entry.dimension === "2d-array")
        // A merged input has no binding of its own, so it is assembled into the
        // array below rather than published as a texture nothing can bind.
        .filter((entry) => !detailMergedInputs.has(entry.name))
        .map((entry) => [
            entry.name,
            {
                label: `QuadDetailV5 ${entry.name}`,
                width: entry.width,
                height: entry.height,
                format: entry.format,
                bytesPerRow: entry.bytesPerRow ?? entry.width * 4,
                data: entry.data,
                ...(entry.dimension === "2d-array"
                    ? { layers: entry.depthOrArrayLayers, viewDimension: "2d-array" }
                    : {})
            }
        ]));
    for (const transform of detailTransforms)
    {
        texturePayloads[transform.output.name] =
            AssembleTransformLayers(values, transform, "QuadDetailV5");
    }
    const samplerPayloads = Object.fromEntries(values.samplers.map(({ name, ...descriptor }) => [
        name,
        {
            label: `QuadDetailV5 ${name}`,
            ...descriptor
        }
    ]));
    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: "QuadDetailV5 resources",
        geometries: {
            main: {
                label: `QuadDetailV5 ${variant} silhouette geometry`,
                vertexBuffers: [
                    {
                        slot: 0,
                        data: values.vertices,
                        layout: QUAD_DETAIL_V5_VERTEX_BUFFER_LAYOUT
                    },
                    ...(skinned ? [ {
                        slot: 1,
                        data: values.boneIndices,
                        layout: QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT
                    } ] : [])
                ],
                indexBuffer: {
                    data: values.indices,
                    format: "uint16"
                }
            }
        },
        textures: texturePayloads,
        samplers: samplerPayloads
    }, "quaddetailv5-resources");
    const device = webgpu.GetDevice();
    const cubeDefinition = values.textures.find((entry) => entry.dimension === "cube");
    let cubeTexture = null;
    let boneBuffer = null;
    const storageBuffers = new Map();
    try
    {
        Assert(cubeDefinition, "QuadDetailV5 fixture requires an environment cube");
        cubeTexture = device.createTexture({
            label: "QuadDetailV5 EveSpaceSceneEnvMap",
            size: {
                width: cubeDefinition.width,
                height: cubeDefinition.height,
                depthOrArrayLayers: cubeDefinition.depthOrArrayLayers
            },
            mipLevelCount: 1,
            sampleCount: 1,
            dimension: "2d",
            format: cubeDefinition.format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });
        const cubeLayerSize =
            cubeDefinition.width * cubeDefinition.height * BYTES_PER_PIXEL;
        for (let layer = 0; layer < cubeDefinition.depthOrArrayLayers; layer += 1)
        {
            device.queue.writeTexture(
                { texture: cubeTexture, origin: { x: 0, y: 0, z: layer } },
                cubeDefinition.data.slice(
                    layer * cubeLayerSize,
                    (layer + 1) * cubeLayerSize
                ),
                {
                    offset: 0,
                    bytesPerRow: cubeDefinition.width * BYTES_PER_PIXEL,
                    rowsPerImage: cubeDefinition.height
                },
                {
                    width: cubeDefinition.width,
                    height: cubeDefinition.height,
                    depthOrArrayLayers: 1
                }
            );
        }
        const cubeView = cubeTexture.createView({
            label: "QuadDetailV5 EveSpaceSceneEnvMap cube view",
            dimension: "cube"
        });
        if (skinned)
        {
            const boneTransform = new Float32Array([
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0.8660253882408142, 0, -0.5, 0.125,
                0, 1, 0, 0,
                0.5, 0, 0.8660253882408142, 0
            ]);
            boneBuffer = device.createBuffer({
                label: "QuadDetailV5 indexed non-identity BoneTransforms",
                size: boneTransform.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(boneBuffer, 0, boneTransform);
        }
        for (const definition of values.storageBuffers)
        {
            const buffer = device.createBuffer({
                label: `QuadDetailV5 ${definition.name}`,
                size: definition.data.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(buffer, 0, definition.data);
            storageBuffers.set(definition.name, buffer);
        }
        const resourcesByBackend = new Map();
        for (const record of records)
        {
            const plan = getQuadDetailV5ResourcePlan(record);
            Assert(
                Boolean(plan.bone) === skinned,
                `QuadDetailV5 ${record.backend} BoneTransforms plan must match ${variant}`
            );
            // The layout is shorter than the reflection by exactly the merged-away
            // layers: 12 texture bindings over 14 reflected resources at Medium,
            // 15 over 19 at High. The High texture count includes LightProfileArray,
            // which is a source-declared array and so needs no assembly.
            const expectedTextures = detailTier === "high" ? 15 : 12;
            const expectedReflected = detailTier === "high" ? 19 : 14;
            Assert(
                plan.textures.length === expectedTextures
                    && plan.analysisResources.length === expectedReflected
                    && plan.transforms.length === 1
                    && plan.samplers.length === (detailTier === "high" ? 4 : 3),
                `QuadDetailV5 ${record.backend} ${detailTier} resource plan must contain` +
                    ` ${expectedTextures} texture bindings over ${expectedReflected}` +
                    " reflected resources and one transform"
            );
            const resources = new Map();
            if (plan.bone)
            {
                Assert(
                    boneBuffer,
                    "QuadDetailV5 skinned resource plan requires BoneTransforms"
                );
                resources.set(plan.bone.scopeIdentity, {
                    buffer: boneBuffer,
                    offset: 0,
                    size: boneBuffer.size
                });
            }
            for (const entry of plan.storage)
            {
                const buffer = storageBuffers.get(entry.name);
                Assert(buffer, `QuadDetailV5 fixture is missing storage ${entry.name}`);
                resources.set(entry.scopeIdentity, {
                    buffer,
                    offset: 0,
                    size: buffer.size
                });
            }
            for (const texture of plan.textures)
            {
                const resource = texture.name === cubeDefinition.name
                    ? cubeView
                    : bundle.textures[texture.name];
                Assert(
                    resource,
                    `QuadDetailV5 fixture is missing texture ${texture.name}`
                );
                resources.set(texture.scopeIdentity, resource);
            }
            for (const sampler of plan.samplers)
            {
                const resource = bundle.samplers[sampler.name];
                Assert(
                    resource,
                    `QuadDetailV5 fixture is missing sampler ${sampler.name}`
                );
                resources.set(sampler.scopeIdentity, resource);
            }
            resourcesByBackend.set(record.backend, resources);
        }
        return {
            caseNames: cases.caseNames,
            bindingValuesByCase: cases.bindingValuesByCase,
            resourcesByBackend,
            geometry: bundle.geometries.main,
            geometrySource,
            variant,
            tier: detailTier,
            bundle,
            destroy()
            {
                boneBuffer?.destroy();
                for (const buffer of storageBuffers.values()) buffer.destroy();
                cubeTexture.destroy();
                bundle.Destroy();
            }
        };
    }
    catch (error)
    {
        boneBuffer?.destroy();
        for (const buffer of storageBuffers.values()) buffer.destroy();
        cubeTexture?.destroy();
        bundle.Destroy();
        throw error;
    }
}

async function CreateQuadOilV5GpuResources(webgpu, records)
{
    Assert(
        QUAD_OIL_V5_TARGET_WIDTH === WIDTH
            && QUAD_OIL_V5_TARGET_HEIGHT === HEIGHT,
        "QuadOilV5 and harness target dimensions must match"
    );
    const values = createQuadOilV5FixtureValues(WIDTH, HEIGHT);
    const resourceVariantNames = Object.freeze(
        Object.keys(values.textureResourceVariants)
    );
    Assert(
        JSON.stringify(resourceVariantNames)
            === JSON.stringify(QUAD_OIL_V5_RESOURCE_VARIANTS),
        "QuadOilV5 resource variants must be oilOff then oilChromatic"
    );
    Assert(
        values.textures.length === 11 && values.samplers.length === 2,
        "QuadOilV5 fixture requires nine shared textures, two lookup controls, " +
            "and two samplers"
    );
    const geometrySource = Object.freeze({
        kind: "synthetic-quadoilv5",
        variant: "skinned"
    });
    const texturePayloads = Object.fromEntries(values.textures
        .filter((entry) => entry.dimension === "2d")
        .map((entry) => [
            entry.name,
            {
                label: `QuadOilV5 ${entry.name}`,
                width: entry.width,
                height: entry.height,
                format: entry.format,
                bytesPerRow: entry.bytesPerRow,
                data: entry.data
            }
        ]));
    const samplerPayloads = Object.fromEntries(values.samplers.map(({ name, ...descriptor }) => [
        name,
        {
            label: `QuadOilV5 ${name}`,
            ...descriptor
        }
    ]));
    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: "QuadOilV5 resources",
        geometries: {
            main: {
                label: "QuadOilV5 skinned silhouette geometry",
                vertexBuffers: [
                    {
                        slot: 0,
                        data: values.vertices,
                        layout: QUAD_OIL_V5_VERTEX_BUFFER_LAYOUT
                    },
                    {
                        slot: 1,
                        data: values.boneIndices,
                        layout: QUAD_OIL_V5_SKINNED_VERTEX_BUFFER_LAYOUT
                    }
                ],
                indexBuffer: {
                    data: values.indices,
                    format: "uint16"
                }
            }
        },
        textures: texturePayloads,
        samplers: samplerPayloads
    }, "quadoilv5-resources");
    const device = webgpu.GetDevice();
    const cubeDefinition = values.textures.find((entry) => entry.dimension === "cube");
    let cubeTexture = null;
    let boneBuffer = null;
    try
    {
        Assert(cubeDefinition, "QuadOilV5 fixture requires an environment cube");
        cubeTexture = device.createTexture({
            label: "QuadOilV5 EveSpaceSceneEnvMap",
            size: {
                width: cubeDefinition.width,
                height: cubeDefinition.height,
                depthOrArrayLayers: cubeDefinition.depthOrArrayLayers
            },
            mipLevelCount: 1,
            sampleCount: 1,
            dimension: "2d",
            format: cubeDefinition.format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });
        const cubeLayerSize =
            cubeDefinition.width * cubeDefinition.height * BYTES_PER_PIXEL;
        for (let layer = 0; layer < cubeDefinition.depthOrArrayLayers; layer += 1)
        {
            device.queue.writeTexture(
                { texture: cubeTexture, origin: { x: 0, y: 0, z: layer } },
                cubeDefinition.data.slice(
                    layer * cubeLayerSize,
                    (layer + 1) * cubeLayerSize
                ),
                {
                    offset: 0,
                    bytesPerRow: cubeDefinition.width * BYTES_PER_PIXEL,
                    rowsPerImage: cubeDefinition.height
                },
                {
                    width: cubeDefinition.width,
                    height: cubeDefinition.height,
                    depthOrArrayLayers: 1
                }
            );
        }
        const cubeView = cubeTexture.createView({
            label: "QuadOilV5 EveSpaceSceneEnvMap cube view",
            dimension: "cube"
        });
        const boneTransform = new Float32Array([
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0.8660253882408142, 0, -0.5, 0.125,
            0, 1, 0, 0,
            0.5, 0, 0.8660253882408142, 0
        ]);
        boneBuffer = device.createBuffer({
            label: "QuadOilV5 indexed non-identity BoneTransforms",
            size: boneTransform.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(boneBuffer, 0, boneTransform);

        const resourcesByBackend = new Map();
        for (const record of records)
        {
            const plan = getQuadOilV5ResourcePlan(record);
            Assert(
                plan.textures.length === 10 && plan.samplers.length === 2,
                `QuadOilV5 ${record.backend} resource plan must contain ` +
                    "ten textures and two samplers"
            );
            const variants = new Map();
            for (const resourceVariant of resourceVariantNames)
            {
                const overrides = values.textureResourceVariants[resourceVariant];
                Assert(
                    Object.keys(overrides).length === 1
                        && typeof overrides.OilFilmLookupMap === "string",
                    `QuadOilV5 ${resourceVariant} must override only OilFilmLookupMap`
                );
                const resources = new Map();
                resources.set(plan.bone.scopeIdentity, {
                    buffer: boneBuffer,
                    offset: 0,
                    size: boneBuffer.size
                });
                for (const texture of plan.textures)
                {
                    const resourceName = overrides[texture.name] ?? texture.name;
                    const resource = texture.viewDimension === "cube"
                        ? (resourceName === cubeDefinition.name ? cubeView : null)
                        : bundle.textures[resourceName];
                    Assert(
                        resource,
                        `QuadOilV5 ${resourceVariant} fixture is missing ` +
                            `texture ${resourceName}`
                    );
                    resources.set(texture.scopeIdentity, resource);
                }
                for (const sampler of plan.samplers)
                {
                    const resource = bundle.samplers[sampler.name];
                    Assert(
                        resource,
                        `QuadOilV5 fixture is missing sampler ${sampler.name}`
                    );
                    resources.set(sampler.scopeIdentity, resource);
                }
                variants.set(resourceVariant, resources);
            }
            resourcesByBackend.set(record.backend, variants);
        }
        return {
            bindingValues: values.bindingValues,
            resourcesByBackend,
            resourceVariantNames,
            geometry: bundle.geometries.main,
            geometrySource,
            bundle,
            destroy()
            {
                boneBuffer.destroy();
                cubeTexture.destroy();
                bundle.Destroy();
            }
        };
    }
    catch (error)
    {
        boneBuffer?.destroy();
        cubeTexture?.destroy();
        bundle.Destroy();
        throw error;
    }
}

async function CreateQuadSailsV5GpuResources(webgpu, records)
{
    Assert(
        QUAD_SAILS_V5_TARGET_WIDTH === WIDTH
            && QUAD_SAILS_V5_TARGET_HEIGHT === HEIGHT,
        "QuadSailsV5 and harness target dimensions must match"
    );
    const variant = records[0]?.variant;
    const skinned = variant === "skinned";
    Assert(
        variant === "static" || skinned,
        "QuadSailsV5 resources require an exact static or skinned variant"
    );
    const values = createQuadSailsV5FixtureValues(WIDTH, HEIGHT, variant);
    const cases = createQuadSailsV5BindingCases(WIDTH, HEIGHT);
    Assert(
        JSON.stringify(values.caseNames) === JSON.stringify(cases.caseNames),
        "QuadSailsV5 fixture values and binding cases must agree"
    );
    const geometrySource = Object.freeze({
        kind: "synthetic-quadsailsv5",
        variant
    });
    const texturePayloads = Object.fromEntries(values.textures
        .filter((entry) => entry.dimension === "2d")
        .map((entry) => [
            entry.name,
            {
                label: `QuadSailsV5 ${entry.name}`,
                width: entry.width,
                height: entry.height,
                format: entry.format,
                bytesPerRow: entry.bytesPerRow,
                data: entry.data
            }
        ]));
    const samplerPayloads = Object.fromEntries(values.samplers.map(({ name, ...descriptor }) => [
        name,
        {
            label: `QuadSailsV5 ${name}`,
            ...descriptor
        }
    ]));
    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: "QuadSailsV5 resources",
        geometries: {
            main: {
                label: `QuadSailsV5 ${variant} silhouette geometry`,
                vertexBuffers: [
                    {
                        slot: 0,
                        data: values.vertices,
                        layout: QUAD_SAILS_V5_VERTEX_BUFFER_LAYOUT
                    },
                    ...(skinned ? [ {
                        slot: 1,
                        data: values.boneIndices,
                        layout: QUAD_SAILS_V5_SKINNED_VERTEX_BUFFER_LAYOUT
                    } ] : [])
                ],
                indexBuffer: {
                    data: values.indices,
                    format: "uint16"
                }
            }
        },
        textures: texturePayloads,
        samplers: samplerPayloads
    }, "quadsailsv5-resources");
    const device = webgpu.GetDevice();
    const cubeDefinition = values.textures.find((entry) => entry.dimension === "cube");
    let cubeTexture = null;
    let boneBuffer = null;
    try
    {
        Assert(cubeDefinition, "QuadSailsV5 fixture requires an environment cube");
        cubeTexture = device.createTexture({
            label: "QuadSailsV5 EveSpaceSceneEnvMap",
            size: {
                width: cubeDefinition.width,
                height: cubeDefinition.height,
                depthOrArrayLayers: cubeDefinition.depthOrArrayLayers
            },
            mipLevelCount: 1,
            sampleCount: 1,
            dimension: "2d",
            format: cubeDefinition.format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });
        const cubeLayerSize =
            cubeDefinition.width * cubeDefinition.height * BYTES_PER_PIXEL;
        for (let layer = 0; layer < cubeDefinition.depthOrArrayLayers; layer += 1)
        {
            device.queue.writeTexture(
                { texture: cubeTexture, origin: { x: 0, y: 0, z: layer } },
                cubeDefinition.data.slice(
                    layer * cubeLayerSize,
                    (layer + 1) * cubeLayerSize
                ),
                {
                    offset: 0,
                    bytesPerRow: cubeDefinition.width * BYTES_PER_PIXEL,
                    rowsPerImage: cubeDefinition.height
                },
                {
                    width: cubeDefinition.width,
                    height: cubeDefinition.height,
                    depthOrArrayLayers: 1
                }
            );
        }
        const cubeView = cubeTexture.createView({
            label: "QuadSailsV5 EveSpaceSceneEnvMap cube view",
            dimension: "cube"
        });
        if (skinned)
        {
            const boneTransform = new Float32Array([
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0.8660253882408142, 0, -0.5, 0.125,
                0, 1, 0, 0,
                0.5, 0, 0.8660253882408142, 0
            ]);
            boneBuffer = device.createBuffer({
                label: "QuadSailsV5 indexed non-identity BoneTransforms",
                size: boneTransform.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(boneBuffer, 0, boneTransform);
        }

        const resourcesByBackend = new Map();
        for (const record of records)
        {
            const plan = getQuadSailsV5ResourcePlan(record);
            const resources = new Map();
            if (plan.bone)
            {
                Assert(boneBuffer, "QuadSailsV5 skinned resource plan requires BoneTransforms");
                resources.set(plan.bone.scopeIdentity, {
                    buffer: boneBuffer,
                    offset: 0,
                    size: boneBuffer.size
                });
            }
            for (const texture of plan.textures)
            {
                const resource = texture.name === "EveSpaceSceneEnvMap"
                    ? cubeView
                    : bundle.textures[texture.name];
                Assert(resource, `QuadSailsV5 fixture is missing texture ${texture.name}`);
                resources.set(texture.scopeIdentity, resource);
            }
            for (const sampler of plan.samplers)
            {
                const resource = bundle.samplers[sampler.name];
                Assert(resource, `QuadSailsV5 fixture is missing sampler ${sampler.name}`);
                resources.set(sampler.scopeIdentity, resource);
            }
            resourcesByBackend.set(record.backend, resources);
        }
        return {
            caseNames: cases.caseNames,
            bindingValuesByCase: cases.bindingValuesByCase,
            resourcesByBackend,
            geometry: bundle.geometries.main,
            geometrySource,
            variant,
            bundle,
            destroy()
            {
                boneBuffer?.destroy();
                cubeTexture.destroy();
                bundle.Destroy();
            }
        };
    }
    catch (error)
    {
        boneBuffer?.destroy();
        cubeTexture?.destroy();
        bundle.Destroy();
        throw error;
    }
}

async function CreateQuadGlassV5GpuResources(webgpu, records)
{
    const variant = records[0]?.variant ?? "static";
    const skinned = variant === "skinned";
    Assert(
        QUAD_GLASS_V5_TARGET_WIDTH === WIDTH
            && QUAD_GLASS_V5_TARGET_HEIGHT === HEIGHT,
        "QuadGlassV5 and harness target dimensions must match"
    );
    const values = createQuadGlassV5FixtureValues(WIDTH, HEIGHT, variant);
    const geometrySource = Object.freeze({
        kind: "synthetic-quadglassv5",
        variant
    });
    const texturePayloads = Object.fromEntries(values.textures
        .filter((entry) => entry.dimension === "2d")
        .map((entry) => [
            entry.name,
            {
                label: `QuadGlassV5 ${entry.name}`,
                width: entry.width,
                height: entry.height,
                format: entry.format,
                bytesPerRow: entry.bytesPerRow,
                data: entry.data
            }
        ]));
    const samplerPayloads = Object.fromEntries(values.samplers.map(({ name, ...descriptor }) => [
        name,
        {
            label: `QuadGlassV5 ${name}`,
            ...descriptor
        }
    ]));
    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: "QuadGlassV5 resources",
        geometries: {
            main: {
                label: "QuadGlassV5 complementary-winding silhouette geometry",
                vertexBuffers: [
                    {
                        slot: 0,
                        data: values.vertices,
                        layout: QUAD_GLASS_V5_VERTEX_BUFFER_LAYOUT
                    },
                    ...(skinned ? [ {
                        slot: 1,
                        data: values.boneIndices,
                        layout: QUAD_GLASS_V5_SKINNED_VERTEX_BUFFER_LAYOUT
                    } ] : [])
                ],
                indexBuffer: {
                    data: values.indices,
                    format: "uint16"
                }
            }
        },
        textures: texturePayloads,
        samplers: samplerPayloads
    }, "quadglassv5-resources");
    const device = webgpu.GetDevice();
    const ownedTextures = [];
    let boneBuffer = null;
    try
    {
        if (skinned)
        {
            const boneTransform = new Float32Array([
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0.8, 0, 0, 0.1,
                0, 1, 0, 0,
                0, 0, 1, 0
            ]);
            boneBuffer = device.createBuffer({
                label: "QuadGlassV5 indexed non-identity BoneTransforms",
                size: boneTransform.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(boneBuffer, 0, boneTransform);
        }
        const cubeViews = new Map();
        for (const definition of values.textures.filter((entry) => entry.dimension === "cube"))
        {
            const texture = device.createTexture({
                label: `QuadGlassV5 ${definition.name}`,
                size: {
                    width: definition.width,
                    height: definition.height,
                    depthOrArrayLayers: definition.depthOrArrayLayers
                },
                mipLevelCount: 1,
                sampleCount: 1,
                dimension: "2d",
                format: definition.format,
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
            });
            ownedTextures.push(texture);
            const layerSize = definition.width * definition.height * 4;
            for (let layer = 0; layer < definition.depthOrArrayLayers; layer += 1)
            {
                device.queue.writeTexture(
                    { texture, origin: { x: 0, y: 0, z: layer } },
                    definition.data.slice(layer * layerSize, (layer + 1) * layerSize),
                    {
                        offset: 0,
                        bytesPerRow: definition.width * 4,
                        rowsPerImage: definition.height
                    },
                    {
                        width: definition.width,
                        height: definition.height,
                        depthOrArrayLayers: 1
                    }
                );
            }
            cubeViews.set(definition.name, texture.createView({
                label: `QuadGlassV5 ${definition.name} cube view`,
                dimension: "cube"
            }));
        }

        const arrayViews = new Map();
        for (const definition of values.textures
            .filter((entry) => entry.dimension === "2d-array"))
        {
            const texture = device.createTexture({
                label: `QuadGlassV5 ${definition.name}`,
                size: {
                    width: definition.width,
                    height: definition.height,
                    depthOrArrayLayers: definition.depthOrArrayLayers
                },
                mipLevelCount: 1,
                sampleCount: 1,
                dimension: "2d",
                format: definition.format,
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
            });
            ownedTextures.push(texture);
            const layerSize = definition.width * definition.height * 4;
            for (let layer = 0; layer < definition.depthOrArrayLayers; layer += 1)
            {
                device.queue.writeTexture(
                    { texture, origin: { x: 0, y: 0, z: layer } },
                    definition.data.slice(layer * layerSize, (layer + 1) * layerSize),
                    {
                        offset: 0,
                        bytesPerRow: definition.width * 4,
                        rowsPerImage: definition.height
                    },
                    {
                        width: definition.width,
                        height: definition.height,
                        depthOrArrayLayers: 1
                    }
                );
            }
            arrayViews.set(definition.name, texture.createView({
                label: `QuadGlassV5 ${definition.name} array view`,
                dimension: "2d-array",
                baseArrayLayer: 0,
                arrayLayerCount: definition.depthOrArrayLayers
            }));
        }

        const resourceVariantNames = Object.freeze(
            Object.keys(values.textureResourceVariants)
        );
        Assert(
            resourceVariantNames.length === 2
                && resourceVariantNames[0] === "base"
                && resourceVariantNames[1] === "transparentPaint",
            "QuadGlassV5 texture controls must be base then transparentPaint"
        );
        const resourcesByBackend = new Map();
        for (const record of records)
        {
            const plan = getQuadGlassV5ResourcePlan(record);
            const variants = new Map();
            for (const variantName of resourceVariantNames)
            {
                const resources = new Map();
                const overrides = values.textureResourceVariants[variantName];
                for (const storage of plan.storage)
                {
                    Assert(
                        boneBuffer,
                        `QuadGlassV5 fixture is missing storage ${storage.name}`
                    );
                    resources.set(storage.scopeIdentity, {
                        buffer: boneBuffer,
                        offset: 0,
                        size: boneBuffer.size
                    });
                }
                for (const texture of plan.textures)
                {
                    const resourceName = overrides[texture.name] ?? texture.name;
                    const resource = texture.viewDimension === "cube"
                        ? cubeViews.get(resourceName)
                        : (texture.viewDimension === "2d-array"
                            ? arrayViews.get(resourceName)
                            : bundle.textures[resourceName]);
                    Assert(
                        resource,
                        `QuadGlassV5 ${variantName} fixture is missing texture ${resourceName}`
                    );
                    resources.set(texture.scopeIdentity, resource);
                }
                for (const sampler of plan.samplers)
                {
                    const resource = bundle.samplers[sampler.name];
                    Assert(
                        resource,
                        `QuadGlassV5 fixture is missing sampler ${sampler.name}`
                    );
                    resources.set(sampler.scopeIdentity, resource);
                }
                variants.set(variantName, resources);
            }
            resourcesByBackend.set(record.backend, variants);
        }
        return {
            label: "QuadGlassV5",
            variant,
            bindingValues: values.bindingValues,
            resourcesByBackend,
            resourceVariantNames,
            geometry: bundle.geometries.main,
            geometrySource,
            bundle,
            destroy()
            {
                boneBuffer?.destroy();
                ownedTextures.forEach((texture) => texture.destroy());
                bundle.Destroy();
            }
        };
    }
    catch (error)
    {
        boneBuffer?.destroy();
        ownedTextures.forEach((texture) => texture.destroy());
        bundle.Destroy();
        throw error;
    }
}

async function CreateQuadHeatV5GpuResources(webgpu, records)
{
    Assert(
        QUAD_HEAT_V5_TARGET_WIDTH === WIDTH
            && QUAD_HEAT_V5_TARGET_HEIGHT === HEIGHT,
        "QuadHeatV5 and harness target dimensions must match"
    );
    const values = createQuadHeatV5FixtureValues(WIDTH, HEIGHT);
    const geometrySource = Object.freeze({ kind: "synthetic-quadheatv5" });
    const texturePayloads = Object.fromEntries(values.textures
        .filter((entry) => entry.dimension === "2d")
        .map((entry) => [
            entry.name,
            {
                label: `QuadHeatV5 ${entry.name}`,
                width: entry.width,
                height: entry.height,
                format: entry.format,
                bytesPerRow: entry.bytesPerRow,
                data: entry.data
            }
        ]));
    const samplerPayloads = Object.fromEntries(values.samplers.map(({ name, ...descriptor }) => [
        name,
        {
            label: `QuadHeatV5 ${name}`,
            ...descriptor
        }
    ]));
    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: "QuadHeatV5 resources",
        geometries: {
            main: {
                label: "QuadHeatV5 synthetic ship silhouette geometry",
                vertexBuffers: [ {
                    slot: 0,
                    data: values.vertices,
                    layout: QUAD_HEAT_V5_VERTEX_BUFFER_LAYOUT
                } ],
                indexBuffer: {
                    data: values.indices,
                    format: "uint16"
                }
            }
        },
        textures: texturePayloads,
        samplers: samplerPayloads
    }, "quadheatv5-resources");
    const device = webgpu.GetDevice();
    const cubeDefinition = values.textures.find((entry) => entry.dimension === "cube");
    let cubeTexture = null;
    try
    {
        Assert(cubeDefinition, "QuadHeatV5 fixture is missing its environment cube");
        cubeTexture = device.createTexture({
            label: `QuadHeatV5 ${cubeDefinition.name}`,
            size: {
                width: cubeDefinition.width,
                height: cubeDefinition.height,
                depthOrArrayLayers: cubeDefinition.depthOrArrayLayers
            },
            mipLevelCount: 1,
            sampleCount: 1,
            dimension: "2d",
            format: cubeDefinition.format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });
        const faceSize = cubeDefinition.width * cubeDefinition.height * 4;
        for (let face = 0; face < cubeDefinition.depthOrArrayLayers; face += 1)
        {
            device.queue.writeTexture(
                { texture: cubeTexture, origin: { x: 0, y: 0, z: face } },
                cubeDefinition.data.slice(face * faceSize, (face + 1) * faceSize),
                {
                    offset: 0,
                    bytesPerRow: cubeDefinition.width * 4,
                    rowsPerImage: cubeDefinition.height
                },
                {
                    width: cubeDefinition.width,
                    height: cubeDefinition.height,
                    depthOrArrayLayers: 1
                }
            );
        }
        const cubeView = cubeTexture.createView({
            label: `QuadHeatV5 ${cubeDefinition.name} cube view`,
            dimension: "cube"
        });
        const resourcesByBackend = new Map();
        for (const record of records)
        {
            const plan = getQuadHeatV5ResourcePlan(record);
            const resources = new Map();
            for (const texture of plan.textures)
            {
                const resource = texture.viewDimension === "cube"
                    ? (texture.name === cubeDefinition.name ? cubeView : null)
                    : bundle.textures[texture.name];
                Assert(resource, `QuadHeatV5 fixture is missing texture ${texture.name}`);
                resources.set(texture.scopeIdentity, resource);
            }
            for (const sampler of plan.samplers)
            {
                const resource = bundle.samplers[sampler.name];
                Assert(resource, `QuadHeatV5 fixture is missing sampler ${sampler.name}`);
                resources.set(sampler.scopeIdentity, resource);
            }
            resourcesByBackend.set(record.backend, resources);
        }
        return {
            bindingValuesByCase: values.bindingValuesByCase,
            caseNames: values.caseNames,
            resourcesByBackend,
            geometry: bundle.geometries.main,
            geometrySource,
            bundle,
            destroy()
            {
                cubeTexture.destroy();
                bundle.Destroy();
            }
        };
    }
    catch (error)
    {
        cubeTexture?.destroy();
        bundle.Destroy();
        throw error;
    }
}

async function CreateDecalV5GpuResources(webgpu, records, profile)
{
    Assert(
        profile.width === WIDTH && profile.height === HEIGHT,
        `${profile.label} and harness target dimensions must match`
    );
    const values = profile.createValues(WIDTH, HEIGHT);
    const geometrySource = Object.freeze({ kind: `synthetic-${profile.label.toLowerCase()}` });
    const texturePayloads = Object.fromEntries(values.textures
        .filter((entry) => entry.dimension === "2d")
        .map((entry) => [
            entry.name,
            {
                label: `${profile.label} ${entry.name}`,
                width: entry.width,
                height: entry.height,
                format: entry.format,
                bytesPerRow: entry.bytesPerRow,
                data: entry.data
            }
        ]));
    const samplerDefinitions = values.samplers ?? values.samplerNames.map((name) => ({
        name,
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: name === "Sampler0" ? "repeat" : "clamp-to-edge",
        addressModeV: name === "Sampler0" ? "repeat" : "clamp-to-edge",
        addressModeW: "clamp-to-edge",
        maxAnisotropy: 16
    }));
    const samplers = Object.fromEntries(samplerDefinitions.map(({ name, ...descriptor }) => [
        name,
        {
            label: `${profile.label} ${name}`,
            ...descriptor
        }
    ]));
    const device = webgpu.GetDevice();
    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: `${profile.label} resources`,
        geometries: {
            main: {
                label: `${profile.label} harness-authored silhouette geometry`,
                vertexBuffers: [ {
                    slot: 0,
                    data: values.vertices,
                    layout: profile.vertexLayout
                } ],
                indexBuffer: {
                    data: values.indices,
                    format: "uint16"
                }
            }
        },
        textures: texturePayloads,
        samplers
    }, `${profile.label.toLowerCase()}-resources`);
    const cubeDefinition = values.textures.find((entry) => entry.dimension === "cube");
    let cubeTexture = null;
    try
    {
        let cubeView = null;
        if (cubeDefinition)
        {
            cubeTexture = device.createTexture({
                label: `${profile.label} ${cubeDefinition.name}`,
                size: {
                    width: cubeDefinition.width,
                    height: cubeDefinition.height,
                    depthOrArrayLayers: cubeDefinition.depthOrArrayLayers
                },
                mipLevelCount: 1,
                sampleCount: 1,
                dimension: "2d",
                format: cubeDefinition.format,
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
            });
            for (let face = 0; face < cubeDefinition.depthOrArrayLayers; face += 1)
            {
                device.queue.writeTexture(
                    { texture: cubeTexture, origin: { x: 0, y: 0, z: face } },
                    cubeDefinition.data.slice(face * 4, face * 4 + 4),
                    { offset: 0, bytesPerRow: 4, rowsPerImage: 1 },
                    { width: 1, height: 1, depthOrArrayLayers: 1 }
                );
            }
            cubeView = cubeTexture.createView({
                label: `${profile.label} ${cubeDefinition.name} cube view`,
                dimension: "cube"
            });
        }
        const textureResourceVariants = values.textureResourceVariants ?? Object.freeze({
            base: Object.freeze({})
        });
        const resourceVariantNames = Object.freeze(Object.keys(textureResourceVariants));
        Assert(
            resourceVariantNames.length >= 1 && resourceVariantNames[0] === "base",
            `${profile.label} texture resource variants must begin with base`
        );
        const resourcesByBackend = new Map();
        for (const record of records)
        {
            const plan = profile.getResourcePlan(record);
            const variants = new Map();
            for (const variantName of resourceVariantNames)
            {
                const resources = new Map();
                const textureOverrides = textureResourceVariants[variantName];
                for (const texture of plan.textures)
                {
                    const resourceName = textureOverrides[texture.name] ?? texture.name;
                    const resource = texture.viewDimension === "cube"
                        ? (resourceName === cubeDefinition?.name ? cubeView : null)
                        : bundle.textures[resourceName];
                    Assert(
                        resource,
                        `${profile.label} ${variantName} fixture is missing texture ${resourceName}`
                    );
                    resources.set(texture.scopeIdentity, resource);
                }
                for (const sampler of plan.samplers)
                {
                    const resource = bundle.samplers[sampler.name];
                    Assert(resource, `${profile.label} fixture is missing sampler ${sampler.name}`);
                    resources.set(sampler.scopeIdentity, resource);
                }
                variants.set(variantName, resources);
            }
            resourcesByBackend.set(record.backend, variants);
        }
        return {
            label: profile.label,
            bindingValues: values.bindingValues ?? values.uniformData,
            uniformDataFor: (record) => profile.resolveUniformData(record, values),
            resourcesByBackend,
            resourceVariantNames,
            geometry: bundle.geometries.main,
            geometrySource,
            bundle,
            destroy()
            {
                cubeTexture?.destroy();
                bundle.Destroy();
            }
        };
    }
    catch (error)
    {
        cubeTexture?.destroy();
        bundle.Destroy();
        throw error;
    }
}

function CreateQuadV5TrinityBatch(record, fixture, renderCase)
{
    return Object.freeze({
        material: record,
        shader: record.pipeline,
        renderCase,
        geometrySource: Object.freeze({
            geometry: fixture.geometrySource,
            meshIndex: 0,
            areaIndex: 0,
            count: 1,
            reversed: false
        }),
        objectData: fixture.bindingValuesByCase[renderCase],
        topology: 4,
        indexCountPerInstance: 0,
        instanceCount: 0,
        startIndexLocation: 0,
        baseVertexLocation: 0,
        startInstanceLocation: 0,
        renderingMode: 0,
        pickingData: 0,
        groupCount: 1
    });
}

function CreateQuadV5TrinityAccumulator(record, fixture, renderCase)
{
    const batches = Object.freeze([
        CreateQuadV5TrinityBatch(record, fixture, renderCase)
    ]);
    const gdprBatches = Object.freeze([]);
    return Object.freeze({
        GetGdprBatches: () => gdprBatches,
        GetBatches: () => batches,
        GetBatchCount: () => batches.length,
        IsChainedByEffect: () => true
    });
}

function CreateQuadV5TrinityBatchMap(record, fixture, renderCase)
{
    const accumulator = CreateQuadV5TrinityAccumulator(record, fixture, renderCase);
    const batchTypes = Object.freeze([ TRINITY_BATCH_TYPE_OPAQUE ]);
    return Object.freeze({
        GetBatchTypes: () => batchTypes,
        GetAccumulator: (value) => value === TRINITY_BATCH_TYPE_OPAQUE ? accumulator : null,
        GetBatchCount: () => accumulator.GetBatchCount()
    });
}

function CreateQuadV5TrinityDispatcher(webgpu, fixture)
{
    return new CjsWebgpuTrinityBatchDispatcher(webgpu, {
        ResolveMaterial(record, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE,
                "QuadV5 material resolved outside the opaque batch type"
            );
            return {
                pipeline: record.pipeline,
                prepareOptions: { warningsAsErrors: true },
                recipe: {
                    label: `QuadV5 ${record.label} Main.pass0`,
                    vertex: { buffers: fixture.geometry.vertexBufferLayouts },
                    fragment: {
                        targets: [ { format: "rgba8unorm" }, { format: "rgba8unorm" } ]
                    },
                    primitive: { cullMode: "none" }
                }
            };
        },
        ResolveGeometry(source, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    &&
                source?.geometry === fixture.geometrySource
                    && source.meshIndex === 0
                    && source.areaIndex === 0
                    && source.count === 1
                    && source.reversed === false,
                "QuadV5 batch references an unknown geometry source"
            );
            return {
                geometry: fixture.geometry,
                indexed: true,
                draw: {
                    indexCount: fixture.geometry.indexCount,
                    instanceCount: 1,
                    firstIndex: 0,
                    baseVertex: 0,
                    firstInstance: 0
                }
            };
        },
        ResolveBindings(batch, _livePipeline, context)
        {
            const record = batch.material;
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && fixture.caseNames.includes(batch.renderCase)
                    && batch.objectData === fixture.bindingValuesByCase[batch.renderCase],
                `QuadV5 ${record.label} batch references unknown object data`
            );
            return {
                uniformData: ScopeFixtureBindingValues(
                    record.pipeline,
                    new Map(Object.entries(buildEveSpaceObjectMainUniformData(record, batch.objectData,
                        { materialLayout: MaterialLayoutFromPackage(record) }))),
                    `QuadV5 ${record.label} uniform data`
                ),
                resources: ScopeFixtureBindingValues(
                    record.pipeline,
                    fixture.resourcesByBackend.get(record.backend),
                    `QuadV5 ${record.label} resources`
                )
            };
        }
    });
}

function CreateQuadDetailV5TrinityBatchMap(record, fixture, renderCase)
{
    const objectData = fixture.bindingValuesByCase[renderCase];
    const batch = Object.freeze({
        material: record,
        shader: record.pipeline,
        renderCase,
        geometrySource: Object.freeze({
            geometry: fixture.geometrySource,
            meshIndex: 0,
            areaIndex: 0,
            count: 1,
            reversed: false
        }),
        objectData,
        topology: 4,
        indexCountPerInstance: 0,
        instanceCount: 0,
        startIndexLocation: 0,
        baseVertexLocation: 0,
        startInstanceLocation: 0,
        renderingMode: 0,
        pickingData: 0,
        groupCount: 1
    });
    const batches = Object.freeze([ batch ]);
    const gdprBatches = Object.freeze([]);
    const accumulator = Object.freeze({
        GetGdprBatches: () => gdprBatches,
        GetBatches: () => batches,
        GetBatchCount: () => batches.length,
        IsChainedByEffect: () => true
    });
    const batchTypes = Object.freeze([ TRINITY_BATCH_TYPE_OPAQUE ]);
    return Object.freeze({
        GetBatchTypes: () => batchTypes,
        GetAccumulator: (value) =>
            value === TRINITY_BATCH_TYPE_OPAQUE ? accumulator : null,
        GetBatchCount: () => accumulator.GetBatchCount()
    });
}

function CreateQuadDetailV5TrinityDispatcher(webgpu, fixture)
{
    return new CjsWebgpuTrinityBatchDispatcher(webgpu, {
        ResolveMaterial(record, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE,
                "QuadDetailV5 material resolved outside the opaque batch type"
            );
            return {
                pipeline: record.pipeline,
                prepareOptions: { warningsAsErrors: true },
                recipe: {
                    label: `QuadDetailV5 ${record.label} Main.pass0`,
                    vertex: { buffers: fixture.geometry.vertexBufferLayouts },
                    fragment: {
                        targets: [ { format: "rgba8unorm" }, { format: "rgba8unorm" } ]
                    },
                    primitive: { cullMode: "none" }
                }
            };
        },
        ResolveGeometry(source, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && source?.geometry === fixture.geometrySource
                    && source.meshIndex === 0
                    && source.areaIndex === 0
                    && source.count === 1
                    && source.reversed === false,
                "QuadDetailV5 batch references an unknown geometry source"
            );
            return {
                geometry: fixture.geometry,
                indexed: true,
                draw: {
                    indexCount: fixture.geometry.indexCount,
                    instanceCount: 1,
                    firstIndex: 0,
                    baseVertex: 0,
                    firstInstance: 0
                }
            };
        },
        ResolveBindings(batch, _livePipeline, context)
        {
            const record = batch.material;
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && fixture.caseNames.includes(batch.renderCase)
                    && batch.objectData === fixture.bindingValuesByCase[batch.renderCase],
                `QuadDetailV5 ${record.label} batch references unknown fixture data`
            );
            return {
                uniformData: ScopeFixtureBindingValues(
                    record.pipeline,
                    new Map(Object.entries(buildEveSpaceObjectMainUniformData(
                        record,
                        batch.objectData,
                        { materialLayout: MaterialLayoutFromPackage(record) }
                    ))),
                    `QuadDetailV5 ${record.label} ${batch.renderCase} uniform data`
                ),
                resources: ScopeFixtureBindingValues(
                    record.pipeline,
                    fixture.resourcesByBackend.get(record.backend),
                    `QuadDetailV5 ${record.label} resources`
                )
            };
        }
    });
}

function CreateQuadOilV5TrinityBatchMap(record, fixture, resourceVariant)
{
    const batch = Object.freeze({
        material: record,
        shader: record.pipeline,
        resourceVariant,
        geometrySource: Object.freeze({
            geometry: fixture.geometrySource,
            meshIndex: 0,
            areaIndex: 0,
            count: 1,
            reversed: false
        }),
        objectData: fixture.bindingValues,
        topology: 4,
        indexCountPerInstance: 0,
        instanceCount: 0,
        startIndexLocation: 0,
        baseVertexLocation: 0,
        startInstanceLocation: 0,
        renderingMode: 0,
        pickingData: 0,
        groupCount: 1
    });
    const batches = Object.freeze([ batch ]);
    const gdprBatches = Object.freeze([]);
    const accumulator = Object.freeze({
        GetGdprBatches: () => gdprBatches,
        GetBatches: () => batches,
        GetBatchCount: () => batches.length,
        IsChainedByEffect: () => true
    });
    const batchTypes = Object.freeze([ TRINITY_BATCH_TYPE_OPAQUE ]);
    return Object.freeze({
        GetBatchTypes: () => batchTypes,
        GetAccumulator: (value) =>
            value === TRINITY_BATCH_TYPE_OPAQUE ? accumulator : null,
        GetBatchCount: () => accumulator.GetBatchCount()
    });
}

function CreateQuadOilV5TrinityDispatcher(webgpu, fixture)
{
    return new CjsWebgpuTrinityBatchDispatcher(webgpu, {
        ResolveMaterial(record, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE,
                "QuadOilV5 material resolved outside the opaque batch type"
            );
            return {
                pipeline: record.pipeline,
                prepareOptions: { warningsAsErrors: true },
                recipe: {
                    label: `QuadOilV5 ${record.label} Main.pass0`,
                    vertex: { buffers: fixture.geometry.vertexBufferLayouts },
                    fragment: {
                        targets: [ { format: "rgba8unorm" }, { format: "rgba8unorm" } ]
                    },
                    primitive: { cullMode: "none" }
                }
            };
        },
        ResolveGeometry(source, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && source?.geometry === fixture.geometrySource
                    && source.meshIndex === 0
                    && source.areaIndex === 0
                    && source.count === 1
                    && source.reversed === false,
                "QuadOilV5 batch references an unknown geometry source"
            );
            return {
                geometry: fixture.geometry,
                indexed: true,
                draw: {
                    indexCount: fixture.geometry.indexCount,
                    instanceCount: 1,
                    firstIndex: 0,
                    baseVertex: 0,
                    firstInstance: 0
                }
            };
        },
        ResolveBindings(batch, _livePipeline, context)
        {
            const record = batch.material;
            const variants = fixture.resourcesByBackend.get(record.backend);
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && fixture.resourceVariantNames.includes(batch.resourceVariant)
                    && batch.objectData === fixture.bindingValues
                    && variants?.has(batch.resourceVariant),
                `QuadOilV5 ${record.label} batch references unknown fixture data`
            );
            return {
                uniformData: ScopeFixtureBindingValues(
                    record.pipeline,
                    new Map(Object.entries(buildEveSpaceObjectMainUniformData(
                        record,
                        batch.objectData,
                        { materialLayout: MaterialLayoutFromPackage(record) }
                    ))),
                    `QuadOilV5 ${record.label} ${batch.resourceVariant} uniform data`
                ),
                resources: ScopeFixtureBindingValues(
                    record.pipeline,
                    variants.get(batch.resourceVariant),
                    `QuadOilV5 ${record.label} ${batch.resourceVariant} resources`
                )
            };
        }
    });
}

function CreateQuadSailsV5TrinityBatchMap(record, fixture, renderCase)
{
    const objectData = fixture.bindingValuesByCase[renderCase];
    const batch = Object.freeze({
        material: record,
        shader: record.pipeline,
        renderCase,
        geometrySource: Object.freeze({
            geometry: fixture.geometrySource,
            meshIndex: 0,
            areaIndex: 0,
            count: 1,
            reversed: false
        }),
        objectData,
        topology: 4,
        indexCountPerInstance: 0,
        instanceCount: 0,
        startIndexLocation: 0,
        baseVertexLocation: 0,
        startInstanceLocation: 0,
        renderingMode: 0,
        pickingData: 0,
        groupCount: 1
    });
    const batches = Object.freeze([ batch ]);
    const gdprBatches = Object.freeze([]);
    const accumulator = Object.freeze({
        GetGdprBatches: () => gdprBatches,
        GetBatches: () => batches,
        GetBatchCount: () => batches.length,
        IsChainedByEffect: () => true
    });
    const batchTypes = Object.freeze([ TRINITY_BATCH_TYPE_OPAQUE ]);
    return Object.freeze({
        GetBatchTypes: () => batchTypes,
        GetAccumulator: (value) =>
            value === TRINITY_BATCH_TYPE_OPAQUE ? accumulator : null,
        GetBatchCount: () => accumulator.GetBatchCount()
    });
}

function CreateQuadSailsV5TrinityDispatcher(webgpu, fixture)
{
    return new CjsWebgpuTrinityBatchDispatcher(webgpu, {
        ResolveMaterial(record, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE,
                "QuadSailsV5 material resolved outside the opaque batch type"
            );
            return {
                pipeline: record.pipeline,
                prepareOptions: { warningsAsErrors: true },
                recipe: {
                    label: `QuadSailsV5 ${record.label} Main.pass0`,
                    vertex: { buffers: fixture.geometry.vertexBufferLayouts },
                    fragment: {
                        targets: [ { format: "rgba8unorm" }, { format: "rgba8unorm" } ]
                    },
                    primitive: getQuadSailsV5PrimitiveRecipe(),
                    depthStencil: {
                        format: "depth24plus",
                        depthWriteEnabled: true,
                        depthCompare: "less"
                    }
                }
            };
        },
        ResolveGeometry(source, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && source?.geometry === fixture.geometrySource
                    && source.meshIndex === 0
                    && source.areaIndex === 0
                    && source.count === 1
                    && source.reversed === false,
                "QuadSailsV5 batch references an unknown geometry source"
            );
            return {
                geometry: fixture.geometry,
                indexed: true,
                draw: {
                    indexCount: fixture.geometry.indexCount,
                    instanceCount: 1,
                    firstIndex: 0,
                    baseVertex: 0,
                    firstInstance: 0
                }
            };
        },
        ResolveBindings(batch, _livePipeline, context)
        {
            const record = batch.material;
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && fixture.caseNames.includes(batch.renderCase)
                    && batch.objectData === fixture.bindingValuesByCase[batch.renderCase],
                `QuadSailsV5 ${record.label} batch references unknown fixture data`
            );
            return {
                uniformData: ScopeFixtureBindingValues(
                    record.pipeline,
                    new Map(Object.entries(buildEveSpaceObjectMainUniformData(
                        record,
                        batch.objectData,
                        { materialLayout: MaterialLayoutFromPackage(record) }
                    ))),
                    `QuadSailsV5 ${record.label} ${batch.renderCase} uniform data`
                ),
                resources: ScopeFixtureBindingValues(
                    record.pipeline,
                    fixture.resourcesByBackend.get(record.backend),
                    `QuadSailsV5 ${record.label} resources`
                )
            };
        }
    });
}

function CreateQuadGlassV5TrinityBatchMap(record, fixture, passIndex, resourceVariant)
{
    const material = Object.freeze({
        record,
        pipeline: record.pipelines[passIndex],
        passIndex
    });
    const batch = Object.freeze({
        material,
        shader: material.pipeline,
        resourceVariant,
        geometrySource: Object.freeze({
            geometry: fixture.geometrySource,
            meshIndex: 0,
            areaIndex: 0,
            count: 1,
            reversed: false
        }),
        objectData: fixture.bindingValues,
        topology: 4,
        indexCountPerInstance: 0,
        instanceCount: 0,
        startIndexLocation: 0,
        baseVertexLocation: 0,
        startInstanceLocation: 0,
        renderingMode: 0,
        pickingData: 0,
        groupCount: 1
    });
    const batches = Object.freeze([ batch ]);
    const gdprBatches = Object.freeze([]);
    const accumulator = Object.freeze({
        GetGdprBatches: () => gdprBatches,
        GetBatches: () => batches,
        GetBatchCount: () => batches.length,
        IsChainedByEffect: () => true
    });
    const batchTypes = Object.freeze([ TRINITY_BATCH_TYPE_OPAQUE ]);
    return Object.freeze({
        GetBatchTypes: () => batchTypes,
        GetAccumulator: (value) =>
            value === TRINITY_BATCH_TYPE_OPAQUE ? accumulator : null,
        GetBatchCount: () => accumulator.GetBatchCount()
    });
}

function CreateQuadGlassV5TrinityDispatcher(webgpu, fixture)
{
    return new CjsWebgpuTrinityBatchDispatcher(webgpu, {
        ResolveMaterial(material, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && material?.pipeline === material.record?.pipelines?.[material.passIndex]
                    && (material.passIndex === 0 || material.passIndex === 1),
                "QuadGlassV5 material resolved outside its complementary Main passes"
            );
            return {
                pipeline: material.pipeline,
                prepareOptions: { warningsAsErrors: true },
                recipe: {
                    label:
                        `QuadGlassV5 ${material.record.label} Main.pass${material.passIndex}`,
                    vertex: { buffers: fixture.geometry.vertexBufferLayouts },
                    fragment: {
                        targets: [ { format: "rgba8unorm" }, { format: "rgba8unorm" } ]
                    },
                    primitive: getQuadGlassV5PrimitiveRecipe(material.passIndex)
                }
            };
        },
        ResolveGeometry(source, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && source?.geometry === fixture.geometrySource
                    && source.meshIndex === 0
                    && source.areaIndex === 0
                    && source.count === 1
                    && source.reversed === false,
                "QuadGlassV5 batch references an unknown geometry source"
            );
            return {
                geometry: fixture.geometry,
                indexed: true,
                draw: {
                    indexCount: fixture.geometry.indexCount,
                    instanceCount: 1,
                    firstIndex: 0,
                    baseVertex: 0,
                    firstInstance: 0
                }
            };
        },
        ResolveBindings(batch, _livePipeline, context)
        {
            const material = batch.material;
            const record = material.record;
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && batch.objectData === fixture.bindingValues
                    && fixture.resourceVariantNames.includes(batch.resourceVariant),
                `QuadGlassV5 ${record.label} batch references unknown fixture data`
            );
            const passZeroRecord = {
                analysis: record.analysis,
                pipeline: record.pipelines[0]
            };
            return {
                uniformData: ScopeFixtureBindingValues(
                    material.pipeline,
                    new Map(Object.entries(buildEveSpaceObjectMainUniformData(
                        passZeroRecord,
                        batch.objectData,
                        { materialLayout: MaterialLayoutFromPackage(passZeroRecord) }
                    ))),
                    `QuadGlassV5 ${record.label} Main.pass${material.passIndex} uniform data`
                ),
                resources: ScopeFixtureBindingValues(
                    material.pipeline,
                    fixture.resourcesByBackend
                        .get(record.backend)
                        .get(batch.resourceVariant),
                    `QuadGlassV5 ${record.label} ${batch.resourceVariant} resources`
                )
            };
        }
    });
}

function CreateQuadHeatV5TrinityBatchMap(record, fixture, heatCase)
{
    const objectData = fixture.bindingValuesByCase[heatCase];
    const batch = Object.freeze({
        material: record,
        shader: record.pipeline,
        heatCase,
        geometrySource: Object.freeze({
            geometry: fixture.geometrySource,
            meshIndex: 0,
            areaIndex: 0,
            count: 1,
            reversed: false
        }),
        objectData,
        topology: 4,
        indexCountPerInstance: 0,
        instanceCount: 0,
        startIndexLocation: 0,
        baseVertexLocation: 0,
        startInstanceLocation: 0,
        renderingMode: 0,
        pickingData: 0,
        groupCount: 1
    });
    const batches = Object.freeze([ batch ]);
    const gdprBatches = Object.freeze([]);
    const accumulator = Object.freeze({
        GetGdprBatches: () => gdprBatches,
        GetBatches: () => batches,
        GetBatchCount: () => batches.length,
        IsChainedByEffect: () => true
    });
    const batchTypes = Object.freeze([ TRINITY_BATCH_TYPE_OPAQUE ]);
    return Object.freeze({
        GetBatchTypes: () => batchTypes,
        GetAccumulator: (value) =>
            value === TRINITY_BATCH_TYPE_OPAQUE ? accumulator : null,
        GetBatchCount: () => accumulator.GetBatchCount()
    });
}

function CreateQuadHeatV5TrinityDispatcher(webgpu, fixture)
{
    return new CjsWebgpuTrinityBatchDispatcher(webgpu, {
        ResolveMaterial(record, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE,
                "QuadHeatV5 material resolved outside the opaque batch type"
            );
            return {
                pipeline: record.pipeline,
                prepareOptions: { warningsAsErrors: true },
                recipe: {
                    label: `QuadHeatV5 ${record.label} Main.pass0`,
                    vertex: { buffers: fixture.geometry.vertexBufferLayouts },
                    fragment: {
                        targets: [ { format: "rgba8unorm" }, { format: "rgba8unorm" } ]
                    },
                    primitive: getQuadHeatV5PrimitiveRecipe()
                }
            };
        },
        ResolveGeometry(source, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && source?.geometry === fixture.geometrySource
                    && source.meshIndex === 0
                    && source.areaIndex === 0
                    && source.count === 1
                    && source.reversed === false,
                "QuadHeatV5 batch references an unknown geometry source"
            );
            return {
                geometry: fixture.geometry,
                indexed: true,
                draw: {
                    indexCount: fixture.geometry.indexCount,
                    instanceCount: 1,
                    firstIndex: 0,
                    baseVertex: 0,
                    firstInstance: 0
                }
            };
        },
        ResolveBindings(batch, _livePipeline, context)
        {
            const record = batch.material;
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && fixture.caseNames.includes(batch.heatCase)
                    && batch.objectData === fixture.bindingValuesByCase[batch.heatCase],
                `QuadHeatV5 ${record.label} batch references unknown fixture data`
            );
            return {
                uniformData: ScopeFixtureBindingValues(
                    record.pipeline,
                    new Map(Object.entries(buildEveSpaceObjectMainUniformData(
                        record,
                        batch.objectData,
                        { materialLayout: MaterialLayoutFromPackage(record) }
                    ))),
                    `QuadHeatV5 ${record.label} ${batch.heatCase} uniform data`
                ),
                resources: ScopeFixtureBindingValues(
                    record.pipeline,
                    fixture.resourcesByBackend.get(record.backend),
                    `QuadHeatV5 ${record.label} resources`
                )
            };
        }
    });
}

function CreateDecalV5TrinityBatch(record, fixture, resourceVariant)
{
    return Object.freeze({
        material: record,
        shader: record.pipeline,
        resourceVariant,
        geometrySource: Object.freeze({
            geometry: fixture.geometrySource,
            meshIndex: 0,
            areaIndex: 0,
            count: 1,
            reversed: false
        }),
        objectData: fixture.bindingValues,
        topology: 4,
        indexCountPerInstance: 0,
        instanceCount: 0,
        startIndexLocation: 0,
        baseVertexLocation: 0,
        startInstanceLocation: 0,
        renderingMode: 0,
        pickingData: 0,
        groupCount: 1
    });
}

function CreateDecalV5TrinityBatchMap(record, fixture, resourceVariant)
{
    const batches = Object.freeze([
        CreateDecalV5TrinityBatch(record, fixture, resourceVariant)
    ]);
    const gdprBatches = Object.freeze([]);
    const accumulator = Object.freeze({
        GetGdprBatches: () => gdprBatches,
        GetBatches: () => batches,
        GetBatchCount: () => batches.length,
        IsChainedByEffect: () => true
    });
    const batchTypes = Object.freeze([ TRINITY_BATCH_TYPE_DECAL ]);
    return Object.freeze({
        GetBatchTypes: () => batchTypes,
        GetAccumulator: (value) => value === TRINITY_BATCH_TYPE_DECAL ? accumulator : null,
        GetBatchCount: () => accumulator.GetBatchCount()
    });
}

function CreateDecalV5TrinityDispatcher(webgpu, fixture)
{
    return new CjsWebgpuTrinityBatchDispatcher(webgpu, {
        ResolveMaterial(record, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_DECAL,
                `${fixture.label} material resolved outside the decal batch type`
            );
            return {
                pipeline: record.pipeline,
                prepareOptions: { warningsAsErrors: true },
                recipe: {
                    label: `${fixture.label} ${record.label} Main.pass0`,
                    vertex: { buffers: fixture.geometry.vertexBufferLayouts },
                    fragment: { targets: [ { format: "rgba8unorm" } ] },
                    primitive: { cullMode: "none" }
                }
            };
        },
        ResolveGeometry(source, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_DECAL
                    && source?.geometry === fixture.geometrySource
                    && source.meshIndex === 0
                    && source.areaIndex === 0
                    && source.count === 1
                    && source.reversed === false,
                `${fixture.label} batch references an unknown geometry source`
            );
            return {
                geometry: fixture.geometry,
                indexed: true,
                draw: {
                    indexCount: fixture.geometry.indexCount,
                    instanceCount: 1,
                    firstIndex: 0,
                    baseVertex: 0,
                    firstInstance: 0
                }
            };
        },
        ResolveBindings(batch, _livePipeline, context)
        {
            const record = batch.material;
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_DECAL
                    && batch.objectData === fixture.bindingValues
                    && fixture.resourceVariantNames.includes(batch.resourceVariant),
                `${fixture.label} ${record.label} batch references unknown object data`
            );
            return {
                uniformData: ScopeFixtureBindingValues(
                    record.pipeline,
                    new Map(Object.entries(fixture.uniformDataFor(record))),
                    `${fixture.label} ${record.label} uniform data`
                ),
                resources: ScopeFixtureBindingValues(
                    record.pipeline,
                    fixture.resourcesByBackend.get(record.backend).get(batch.resourceVariant),
                    `${fixture.label} ${record.label} resources`
                )
            };
        }
    });
}

function PixelOffset(x, y)
{
    return y * BYTES_PER_ROW + x * BYTES_PER_PIXEL;
}

function PixelEquals(bytes, x, y, expected)
{
    const offset = PixelOffset(x, y);
    return expected.every((value, component) => bytes[offset + component] === value);
}

function PixelRgbEquals(left, right, x, y)
{
    const offset = PixelOffset(x, y);
    return left[offset] === right[offset]
        && left[offset + 1] === right[offset + 1]
        && left[offset + 2] === right[offset + 2];
}

function PixelNeighborhoodHasDraw(bytes, x, y, clear, radius)
{
    for (let dy = -radius; dy <= radius; dy += 1)
    {
        for (let dx = -radius; dx <= radius; dx += 1)
        {
            const sampleX = x + dx;
            const sampleY = y + dy;
            if (sampleX >= 0 && sampleX < WIDTH && sampleY >= 0 && sampleY < HEIGHT
                && !PixelEquals(bytes, sampleX, sampleY, clear))
            {
                return true;
            }
        }
    }
    return false;
}

function AssertQuadV5Silhouette(bytes, targetIndex, label, variant)
{
    const skinned = variant === "skinned"
        || variant === "skinnedHeat"
        || variant === "skinnedHeatDetail";
    const clear = QUADV5_CLEAR_TARGETS[targetIndex];
    for (const [ x, y ] of [ [ 0, 0 ], [ WIDTH - 1, 0 ], [ 0, HEIGHT - 1 ], [ WIDTH - 1, HEIGHT - 1 ] ])
    {
        Assert(PixelEquals(bytes, x, y, clear), `${label} corner (${x}, ${y}) did not remain clear`);
    }
    const anchors = skinned
        ? [
            [ "nose", 36, 10 ],
            [ "center", 35, 32 ]
        ]
        : [
            [ "nose", 32, 10 ],
            [ "center", 32, 32 ],
            [ "left wing", 13, 31 ],
            [ "right wing", 50, 31 ],
            [ "left tail", 24, 52 ],
            [ "right tail", 40, 52 ]
        ];
    for (const [ name, x, y ] of anchors)
    {
        const radius = skinned ? 3 : 0;
        Assert(
            PixelNeighborhoodHasDraw(bytes, x, y, clear, radius),
            `${label} ${name} anchor neighborhood (${x}, ${y}) remained clear`
        );
    }
    let coverage = 0;
    let minimumX = WIDTH;
    let maximumX = -1;
    let minimumY = HEIGHT;
    let maximumY = -1;
    const rowCoverage = new Uint16Array(HEIGHT);
    const colors = new Set();
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            if (!PixelEquals(bytes, x, y, clear))
            {
                coverage += 1;
                minimumX = Math.min(minimumX, x);
                maximumX = Math.max(maximumX, x);
                minimumY = Math.min(minimumY, y);
                maximumY = Math.max(maximumY, y);
                rowCoverage[y] += 1;
                const offset = PixelOffset(x, y);
                colors.add(`${bytes[offset]},${bytes[offset + 1]},${bytes[offset + 2]},${bytes[offset + 3]}`);
            }
        }
    }
    const minimumCoverage = skinned ? 500 : 700;
    Assert(coverage >= minimumCoverage && coverage <= 2000, `${label} has implausible ship coverage ${coverage}`);
    if (skinned)
    {
        Assert(
            minimumX >= 25 && maximumX >= 54,
            `${label} did not retain the indexed bone-transform bounds ${minimumX}..${maximumX}`
        );
    }
    else
    {
        Assert(
            minimumX <= 20 && maximumX >= 48,
            `${label} has implausible static bounds ${minimumX}..${maximumX}`
        );
    }
    Assert(
        rowCoverage[10] >= 2 && rowCoverage[10] <= 16,
        `${label} has an implausible nose width ${rowCoverage[10]}`
    );
    const minimumWingWidth = skinned ? 20 : 34;
    Assert(
        rowCoverage[31] >= minimumWingWidth,
        `${label} has an implausible wing width ${rowCoverage[31]}`
    );
    const minimumTailWidth = skinned ? 4 : 10;
    Assert(
        rowCoverage[52] >= minimumTailWidth && rowCoverage[52] <= 28,
        `${label} has an implausible tail width ${rowCoverage[52]}`
    );
    Assert(rowCoverage[31] >= rowCoverage[10] + 20, `${label} does not widen from nose to wings`);
    Assert(rowCoverage[31] >= rowCoverage[52] + 8, `${label} does not narrow from wings to tail`);
    if (targetIndex === 0)
    {
        Assert(colors.size >= 8, `${label} must contain varied shaded color rather than a constant fill`);
    }
    return {
        coverage,
        bounds: { minimumX, maximumX, minimumY, maximumY },
        rowCoverage: Array.from(rowCoverage),
        distinctColors: colors.size
    };
}

function QuadV5PixelIsActive(bytes, x, y)
{
    return !PixelEquals(bytes, x, y, QUADV5_CLEAR_TARGETS[1]);
}

function AssertQuadV5MrtCoverage(color, motion, label)
{
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            Assert(
                QuadV5PixelIsActive(motion, x, y)
                    === !PixelEquals(color, x, y, QUADV5_CLEAR_TARGETS[0]),
                `${label} MRT coverage differs at (${x}, ${y})`
            );
        }
    }
}

function MeasureQuadV5ColorControl(control, active, motion, label)
{
    let coveredPixels = 0;
    let changedPixels = 0;
    let totalRgbDelta = 0;
    let maximumChannelDelta = 0;
    const distinctDeltas = new Set();
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            if (!QuadV5PixelIsActive(motion, x, y)) continue;
            coveredPixels += 1;
            const offset = PixelOffset(x, y);
            Assert(
                control[offset + 3] === active[offset + 3],
                `${label} changed MRT0 alpha at (${x}, ${y})`
            );
            const delta = [ 0, 1, 2 ].map((component) =>
                Math.abs(active[offset + component] - control[offset + component]));
            if (delta.some((value) => value > 0))
            {
                changedPixels += 1;
                totalRgbDelta += delta[0] + delta[1] + delta[2];
                maximumChannelDelta = Math.max(maximumChannelDelta, ...delta);
                distinctDeltas.add(delta.join(","));
            }
        }
    }
    Assert(coveredPixels > 0, `${label} has no covered pixels`);
    Assert(
        changedPixels >= Math.ceil(coveredPixels * 0.5),
        `${label} changed only ${changedPixels}/${coveredPixels} covered pixels`
    );
    Assert(
        maximumChannelDelta >= 4 && distinctDeltas.size >= 3,
        `${label} lacks a spatially varied color response:`
            + ` maximum channel delta ${maximumChannelDelta} (needs 4),`
            + ` ${distinctDeltas.size} distinct deltas (needs 3),`
            + ` over ${changedPixels}/${coveredPixels} changed pixels`
    );
    return {
        coveredPixels,
        changedPixels,
        changedRatio: changedPixels / coveredPixels,
        averageChangedRgbDelta: totalRgbDelta / changedPixels,
        maximumChannelDelta,
        distinctDeltas: distinctDeltas.size
    };
}

function MeasureQuadV5HeatControl(cold, hot, motion, label)
{
    let coveredPixels = 0;
    let changedPixels = 0;
    let totalRedDelta = 0;
    let maximumRedDelta = 0;
    const distinctRedDeltas = new Set();
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            if (!QuadV5PixelIsActive(motion, x, y)) continue;
            coveredPixels += 1;
            const offset = PixelOffset(x, y);
            Assert(
                cold[offset + 1] === hot[offset + 1]
                    && cold[offset + 2] === hot[offset + 2]
                    && cold[offset + 3] === hot[offset + 3],
                `${label} changed non-red output at (${x}, ${y})`
            );
            const redDelta = hot[offset] - cold[offset];
            Assert(redDelta >= 0, `${label} reduced red output at (${x}, ${y})`);
            if (redDelta > 0)
            {
                changedPixels += 1;
                totalRedDelta += redDelta;
                maximumRedDelta = Math.max(maximumRedDelta, redDelta);
                distinctRedDeltas.add(redDelta);
            }
        }
    }
    Assert(coveredPixels > 0, `${label} has no covered pixels`);
    Assert(
        changedPixels >= Math.ceil(coveredPixels * 0.5),
        `${label} changed only ${changedPixels}/${coveredPixels} covered pixels`
    );
    Assert(
        maximumRedDelta >= 8 && distinctRedDeltas.size >= 3,
        `${label} lacks a spatially varied red response`
    );
    return {
        coveredPixels,
        changedPixels,
        changedRatio: changedPixels / coveredPixels,
        averageChangedRedDelta: totalRedDelta / changedPixels,
        maximumRedDelta,
        distinctRedDeltas: distinctRedDeltas.size
    };
}

function AssertQuadV5HeatControls(instances, coldCase, hotCase, shaderName)
{
    const byKey = new Map(instances.map((instance) => [
        `${instance.record.backend}:${instance.renderCase}`,
        instance
    ]));
    let dx11Oracle = null;
    for (const backend of [ "dx11", "dx12" ])
    {
        const cold = byKey.get(`${backend}:${coldCase}`);
        const hot = byKey.get(`${backend}:${hotCase}`);
        Assert(cold && hot, `${shaderName} ${backend} heat cases are incomplete`);
        AssertExactTargetMatch(
            cold.snapshots[1],
            hot.snapshots[1],
            `${backend} ${shaderName} heat-invariant MRT1`
        );
        const heatOracle = MeasureQuadV5HeatControl(
            cold.snapshots[0],
            hot.snapshots[0],
            cold.snapshots[1],
            `${shaderName} ${backend} heat control`
        );
        if (backend === "dx11") dx11Oracle = heatOracle;
    }
    return dx11Oracle;
}

function AssertQuadV5HeatDetailControls(instances)
{
    const byKey = new Map(instances.map((instance) => [
        `${instance.record.backend}:${instance.renderCase}`,
        instance
    ]));
    let dx11DetailOracle = null;
    for (const backend of [ "dx11", "dx12" ])
    {
        const surface = byKey.get(`${backend}:surface`);
        const detail = byKey.get(`${backend}:detail`);
        Assert(surface && detail, `QuadHeatDetailV5 ${backend} detail cases are incomplete`);
        AssertExactTargetMatch(
            surface.snapshots[1],
            detail.snapshots[1],
            `${backend} QuadHeatDetailV5 detail-invariant MRT1`
        );
        const detailOracle = MeasureQuadV5ColorControl(
            surface.snapshots[0],
            detail.snapshots[0],
            surface.snapshots[1],
            `QuadHeatDetailV5 ${backend} detail control`
        );
        if (backend === "dx11") dx11DetailOracle = detailOracle;
    }
    return {
        detail: dx11DetailOracle,
        heat: AssertQuadV5HeatControls(
            instances,
            "detail",
            "hotDetail",
            "QuadHeatDetailV5"
        )
    };
}

function QuadDetailV5DeltaSignature(control, active, motion)
{
    const deltas = [];
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            if (!QuadV5PixelIsActive(motion, x, y)) continue;
            const offset = PixelOffset(x, y);
            const delta = [
                active[offset] - control[offset],
                active[offset + 1] - control[offset + 1],
                active[offset + 2] - control[offset + 2]
            ];
            if (delta.some((value) => value !== 0))
            {
                deltas.push(`${x},${y}:${delta.join(",")}`);
            }
        }
    }
    return deltas.join("|");
}

function AssertQuadDetailV5Controls(instances)
{
    const byKey = new Map(instances.map((instance) => [
        `${instance.record.backend}:${instance.renderCase}`,
        instance
    ]));
    let dx11Oracle = null;
    for (const backend of [ "dx11", "dx12" ])
    {
        const pptNeutral = byKey.get(`${backend}:pptNeutral`);
        const surface = byKey.get(`${backend}:surface`);
        const detail1 = byKey.get(`${backend}:detail1`);
        const detail2 = byKey.get(`${backend}:detail2`);
        Assert(
            pptNeutral && surface && detail1 && detail2,
            `QuadDetailV5 ${backend} controlled cases are incomplete`
        );
        for (const controlled of [ surface, detail1, detail2 ])
        {
            AssertExactTargetMatch(
                pptNeutral.snapshots[1],
                controlled.snapshots[1],
                `${backend} QuadDetailV5 ${controlled.renderCase}-invariant MRT1`
            );
        }
        const ppt = MeasureQuadV5ColorControl(
            pptNeutral.snapshots[0],
            surface.snapshots[0],
            pptNeutral.snapshots[1],
            `QuadDetailV5 ${backend} PPT material control`
        );
        const detail1Oracle = MeasureQuadV5ColorControl(
            surface.snapshots[0],
            detail1.snapshots[0],
            surface.snapshots[1],
            `QuadDetailV5 ${backend} Detail1 control`
        );
        const detail2Oracle = MeasureQuadV5ColorControl(
            surface.snapshots[0],
            detail2.snapshots[0],
            surface.snapshots[1],
            `QuadDetailV5 ${backend} Detail2 control`
        );
        const detail1Signature = QuadDetailV5DeltaSignature(
            surface.snapshots[0],
            detail1.snapshots[0],
            surface.snapshots[1]
        );
        const detail2Signature = QuadDetailV5DeltaSignature(
            surface.snapshots[0],
            detail2.snapshots[0],
            surface.snapshots[1]
        );
        Assert(
            detail1Signature !== detail2Signature,
            `QuadDetailV5 ${backend} Detail1 and Detail2 delta maps are identical`
        );
        if (backend === "dx11")
        {
            dx11Oracle = {
                ppt,
                detail1: detail1Oracle,
                detail2: detail2Oracle,
                detailDeltaMapsDistinct: true
            };
        }
    }
    return dx11Oracle;
}

function AssertQuadOilV5Pass(instance)
{
    const statistics = instance.snapshots.map((bytes, targetIndex) =>
        AssertQuadV5Silhouette(
            bytes,
            targetIndex,
            `${instance.record.label} ${instance.resourceVariant} MRT${targetIndex}`,
            "skinned"
        ));
    Assert(
        statistics[0].coverage === statistics[1].coverage,
        `${instance.record.label} ${instance.resourceVariant} MRT coverage does not match`
    );
    AssertQuadV5MrtCoverage(
        instance.snapshots[0],
        instance.snapshots[1],
        `${instance.record.label} ${instance.resourceVariant}`
    );
    const [ color, motion ] = instance.snapshots;
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            if (!QuadV5PixelIsActive(motion, x, y)) continue;
            const offset = PixelOffset(x, y);
            Assert(
                color[offset + 3] === 255,
                `QuadOilV5 ${instance.record.label} ${instance.resourceVariant} ` +
                    `MRT0 alpha drifted at (${x}, ${y})`
            );
            Assert(
                motion[offset] === 0
                    && motion[offset + 1] === 0
                    && motion[offset + 2] === 0
                    && motion[offset + 3] === 255,
                `QuadOilV5 ${instance.record.label} ${instance.resourceVariant} ` +
                    `MRT1 drifted at (${x}, ${y})`
            );
        }
    }
    return statistics;
}

function AssertQuadOilV5Controls(instances)
{
    const byKey = new Map(instances.map((instance) => [
        `${instance.record.backend}:${instance.resourceVariant}`,
        instance
    ]));
    let dx11Oracle = null;
    let dx11Signature = null;
    for (const backend of [ "dx11", "dx12" ])
    {
        const oilOff = byKey.get(`${backend}:oilOff`);
        const oilChromatic = byKey.get(`${backend}:oilChromatic`);
        Assert(
            oilOff && oilChromatic,
            `QuadOilV5 ${backend} OilFilm cases are incomplete`
        );
        AssertExactTargetMatch(
            oilOff.snapshots[1],
            oilChromatic.snapshots[1],
            `${backend} QuadOilV5 OilFilm-invariant MRT1`
        );
        const measured = MeasureQuadV5ColorControl(
            oilOff.snapshots[0],
            oilChromatic.snapshots[0],
            oilOff.snapshots[1],
            `QuadOilV5 ${backend} OilFilm control`
        );
        const changedChannels = new Set();
        for (let y = 0; y < HEIGHT; y += 1)
        {
            for (let x = 0; x < WIDTH; x += 1)
            {
                if (!QuadV5PixelIsActive(oilOff.snapshots[1], x, y)) continue;
                const offset = PixelOffset(x, y);
                for (let channel = 0; channel < 3; channel += 1)
                {
                    if (oilOff.snapshots[0][offset + channel]
                        !== oilChromatic.snapshots[0][offset + channel])
                    {
                        changedChannels.add(channel);
                    }
                }
            }
        }
        Assert(
            changedChannels.size >= 2,
            `QuadOilV5 ${backend} OilFilm control changed only ` +
                `${changedChannels.size} RGB channels`
        );
        const signature = QuadDetailV5DeltaSignature(
            oilOff.snapshots[0],
            oilChromatic.snapshots[0],
            oilOff.snapshots[1]
        );
        Assert(signature, `QuadOilV5 ${backend} OilFilm delta signature is empty`);
        if (backend === "dx11")
        {
            dx11Signature = signature;
            dx11Oracle = {
                ...measured,
                changedChannels: changedChannels.size
            };
        }
        else
        {
            Assert(
                signature === dx11Signature,
                "QuadOilV5 DX11/DX12 OilFilm delta signatures differ"
            );
        }
    }
    return dx11Oracle;
}

function QuadGlassV5PixelIsActive(bytes, x, y)
{
    return !PixelEquals(bytes, x, y, QUAD_GLASS_V5_CLEAR_TARGETS[1]);
}

function AssertQuadGlassV5Pass(instance)
{
    const [ color, motion ] = instance.snapshots;
    for (const [ x, y ] of [
        [ 0, 0 ],
        [ WIDTH - 1, 0 ],
        [ 0, HEIGHT - 1 ],
        [ WIDTH - 1, HEIGHT - 1 ]
    ])
    {
        Assert(
            PixelEquals(color, x, y, QUAD_GLASS_V5_CLEAR_TARGETS[0])
                && PixelEquals(motion, x, y, QUAD_GLASS_V5_CLEAR_TARGETS[1]),
            `QuadGlassV5 ${instance.record.label} pass ${instance.passIndex} corner ` +
                `(${x}, ${y}) did not remain clear`
        );
    }
    const expectedAlpha = instance.resourceVariant === "base" ? 255 : 0;
    let coverage = 0;
    let leftCoverage = 0;
    let rightCoverage = 0;
    let minimumX = WIDTH;
    let maximumX = -1;
    let minimumY = HEIGHT;
    let maximumY = -1;
    const colors = new Set();
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            const active = QuadGlassV5PixelIsActive(motion, x, y);
            const colorClear = PixelEquals(color, x, y, QUAD_GLASS_V5_CLEAR_TARGETS[0]);
            Assert(
                active === !colorClear,
                `QuadGlassV5 ${instance.record.label} pass ${instance.passIndex} MRT ` +
                    `coverage differs at (${x}, ${y})`
            );
            if (!active) continue;
            coverage += 1;
            minimumX = Math.min(minimumX, x);
            maximumX = Math.max(maximumX, x);
            minimumY = Math.min(minimumY, y);
            maximumY = Math.max(maximumY, y);
            if (x < WIDTH / 2) leftCoverage += 1;
            else rightCoverage += 1;
            const offset = PixelOffset(x, y);
            Assert(
                motion[offset] === 0 && motion[offset + 1] === 0
                    && motion[offset + 2] === 0 && motion[offset + 3] === 255,
                `QuadGlassV5 ${instance.record.label} pass ${instance.passIndex} ` +
                    `MRT1 drifted at (${x}, ${y})`
            );
            Assert(
                color[offset + 3] === expectedAlpha,
                `QuadGlassV5 ${instance.record.label} ${instance.resourceVariant} alpha ` +
                    `was ${color[offset + 3]} at (${x}, ${y}), expected ${expectedAlpha}`
            );
            colors.add(`${color[offset]},${color[offset + 1]},${color[offset + 2]}`);
        }
    }
    Assert(
        coverage >= 220 && coverage <= 800,
        `QuadGlassV5 ${instance.record.label} pass ${instance.passIndex} ` +
            `has implausible coverage ${coverage}`
    );
    const side = leftCoverage === 0 && rightCoverage === coverage
        ? "right"
        : (rightCoverage === 0 && leftCoverage === coverage ? "left" : null);
    Assert(
        side,
        `QuadGlassV5 ${instance.record.label} pass ${instance.passIndex} did not ` +
            `isolate one complementary winding (${leftCoverage}/${rightCoverage})`
    );
    Assert(
        colors.size >= 8,
        `QuadGlassV5 ${instance.record.label} pass ${instance.passIndex} ` +
            "must contain varied shaded RGB"
    );
    return {
        coverage,
        leftCoverage,
        rightCoverage,
        side,
        bounds: { minimumX, maximumX, minimumY, maximumY },
        distinctColors: colors.size
    };
}

function AssertQuadGlassV5Controls(instances, variant)
{
    const byKey = new Map(instances.map((instance) => [
        `${instance.record.backend}:${instance.passIndex}:${instance.resourceVariant}`,
        instance
    ]));
    for (const backend of [ "dx11", "dx12" ])
    {
        const passSides = [];
        for (const passIndex of [ 0, 1 ])
        {
            const base = byKey.get(`${backend}:${passIndex}:base`);
            const transparent = byKey.get(`${backend}:${passIndex}:transparentPaint`);
            Assert(base && transparent, `QuadGlassV5 ${backend} control instances are incomplete`);
            AssertExactTargetMatch(
                base.snapshots[1],
                transparent.snapshots[1],
                `${backend} QuadGlassV5 pass${passIndex} PaintMask-invariant MRT1`
            );
            let changedAlpha = 0;
            let changedRgb = 0;
            for (let y = 0; y < HEIGHT; y += 1)
            {
                for (let x = 0; x < WIDTH; x += 1)
                {
                    if (!QuadGlassV5PixelIsActive(base.snapshots[1], x, y)) continue;
                    const offset = PixelOffset(x, y);
                    let rgbDiffers = false;
                    for (let component = 0; component < 3; component += 1)
                    {
                        rgbDiffers ||= base.snapshots[0][offset + component]
                            !== transparent.snapshots[0][offset + component];
                    }
                    if (rgbDiffers) changedRgb += 1;
                    Assert(
                        base.snapshots[0][offset + 3] === 255
                            && transparent.snapshots[0][offset + 3] === 0,
                        `QuadGlassV5 ${backend} pass${passIndex} PaintMask alpha oracle ` +
                            `drifted at (${x}, ${y})`
                    );
                    changedAlpha += 1;
                }
            }
            Assert(
                changedAlpha === base.statistics.coverage,
                `QuadGlassV5 ${backend} pass${passIndex} PaintMask did not control every pixel`
            );
            Assert(
                changedRgb >= Math.floor(base.statistics.coverage * 0.95),
                `QuadGlassV5 ${backend} pass${passIndex} PaintMask RGB normalization ` +
                    `changed only ${changedRgb}/${base.statistics.coverage} pixels`
            );
            passSides.push(base.statistics.side);
        }
        Assert(
            passSides[0] === "left" && passSides[1] === "right",
            `QuadGlassV5 ${backend} cull mapping was ${passSides.join("/")}, ` +
                "expected pass0/pass1 left/right; bounds " +
                `${JSON.stringify(byKey.get(`${backend}:0:base`).statistics.bounds)}/` +
                JSON.stringify(byKey.get(`${backend}:1:base`).statistics.bounds)
        );
        const pass0 = byKey.get(`${backend}:0:base`);
        const pass1 = byKey.get(`${backend}:1:base`);
        let overlap = 0;
        for (let y = 0; y < HEIGHT; y += 1)
        {
            for (let x = 0; x < WIDTH; x += 1)
            {
                if (QuadGlassV5PixelIsActive(pass0.snapshots[1], x, y)
                    && QuadGlassV5PixelIsActive(pass1.snapshots[1], x, y))
                {
                    overlap += 1;
                }
            }
        }
        Assert(overlap === 0, `QuadGlassV5 ${backend} complementary winding probes overlap`);
    }
    let skinningOracle = null;
    if (variant === "skinned")
    {
        const left = byKey.get("dx11:0:base").statistics.bounds;
        const right = byKey.get("dx11:1:base").statistics.bounds;
        Assert(
            left.minimumX >= 12 && left.maximumX <= 31
                && right.minimumX >= 36 && right.maximumX <= 56,
            "QuadGlassV5 skinned passes did not retain the indexed non-identity " +
                `bone-transform bounds ${JSON.stringify(left)}/${JSON.stringify(right)}`
        );
        skinningOracle = {
            transform: "indexed non-identity BoneTransforms entry 1",
            leftBounds: left,
            rightBounds: right
        };
    }
    return {
        opaqueAlpha: 255,
        transparentAlpha: 0,
        controlledPixels: byKey.get("dx11:0:base").statistics.coverage
            + byKey.get("dx11:1:base").statistics.coverage,
        passSides: [
            byKey.get("dx11:0:base").statistics.side,
            byKey.get("dx11:1:base").statistics.side
        ],
        skinningOracle
    };
}

function QuadHeatV5PixelIsActive(bytes, x, y)
{
    return !PixelEquals(bytes, x, y, QUAD_HEAT_V5_CLEAR_TARGETS[1]);
}

function AssertQuadHeatV5Pass(instance)
{
    const [ color, motion ] = instance.snapshots;
    const label = `QuadHeatV5 ${instance.record.label} ${instance.heatCase}`;
    const colorStatistics = AssertQuadV5Silhouette(color, 0, `${label} MRT0`, "static");
    const motionStatistics = AssertQuadV5Silhouette(motion, 1, `${label} MRT1`, "static");
    Assert(
        colorStatistics.coverage === motionStatistics.coverage,
        `${label} MRT coverage counts differ`
    );
    let coveredPixels = 0;
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            const active = QuadHeatV5PixelIsActive(motion, x, y);
            Assert(
                active === !PixelEquals(color, x, y, QUAD_HEAT_V5_CLEAR_TARGETS[0]),
                `${label} MRT coverage differs at (${x}, ${y})`
            );
            if (!active) continue;
            coveredPixels += 1;
            const offset = PixelOffset(x, y);
            Assert(
                color[offset + 3] === 255,
                `${label} MRT0 alpha drifted at (${x}, ${y})`
            );
            Assert(
                motion[offset] === 0 && motion[offset + 1] === 0
                    && motion[offset + 2] === 0 && motion[offset + 3] === 255,
                `${label} MRT1 drifted at (${x}, ${y})`
            );
        }
    }
    Assert(
        coveredPixels === colorStatistics.coverage,
        `${label} active-pixel count does not reconcile`
    );
    return { coveredPixels, color: colorStatistics, motion: motionStatistics };
}

function AssertQuadHeatV5Controls(instances)
{
    const byKey = new Map(instances.map((instance) => [
        `${instance.record.backend}:${instance.heatCase}`,
        instance
    ]));
    let dx11Oracle = null;
    for (const backend of [ "dx11", "dx12" ])
    {
        const cold = byKey.get(`${backend}:cold`);
        const hot = byKey.get(`${backend}:hot`);
        Assert(cold && hot, `QuadHeatV5 ${backend} thermal cases are incomplete`);
        AssertExactTargetMatch(
            cold.snapshots[1],
            hot.snapshots[1],
            `${backend} QuadHeatV5 heat-invariant MRT1`
        );
        let coveredPixels = 0;
        let changedPixels = 0;
        let totalRedDelta = 0;
        let maximumRedDelta = 0;
        const distinctRedDeltas = new Set();
        for (let y = 0; y < HEIGHT; y += 1)
        {
            for (let x = 0; x < WIDTH; x += 1)
            {
                const active = QuadHeatV5PixelIsActive(cold.snapshots[1], x, y);
                Assert(
                    active === QuadHeatV5PixelIsActive(hot.snapshots[1], x, y),
                    `QuadHeatV5 ${backend} heat changed coverage at (${x}, ${y})`
                );
                if (!active) continue;
                coveredPixels += 1;
                const offset = PixelOffset(x, y);
                Assert(
                    cold.snapshots[0][offset + 1] === hot.snapshots[0][offset + 1]
                        && cold.snapshots[0][offset + 2] === hot.snapshots[0][offset + 2]
                        && cold.snapshots[0][offset + 3] === 255
                        && hot.snapshots[0][offset + 3] === 255,
                    `QuadHeatV5 ${backend} heat changed non-red output at (${x}, ${y})`
                );
                const redDelta =
                    hot.snapshots[0][offset] - cold.snapshots[0][offset];
                Assert(
                    redDelta >= 0,
                    `QuadHeatV5 ${backend} hot red fell below cold at (${x}, ${y})`
                );
                if (redDelta > 0)
                {
                    changedPixels += 1;
                    totalRedDelta += redDelta;
                    maximumRedDelta = Math.max(maximumRedDelta, redDelta);
                    distinctRedDeltas.add(redDelta);
                }
            }
        }
        Assert(
            coveredPixels === cold.statistics.coveredPixels
                && coveredPixels === hot.statistics.coveredPixels,
            `QuadHeatV5 ${backend} thermal coverage does not reconcile`
        );
        Assert(
            changedPixels >= Math.ceil(coveredPixels * 0.1),
            `QuadHeatV5 ${backend} heat changed only ${changedPixels}/${coveredPixels} pixels`
        );
        Assert(
            distinctRedDeltas.size >= 3 && maximumRedDelta >= 8,
            `QuadHeatV5 ${backend} heat lacks a texture-shaped red response`
        );
        const oracle = {
            coveredPixels,
            changedPixels,
            changedRatio: changedPixels / coveredPixels,
            averageChangedRedDelta: totalRedDelta / changedPixels,
            maximumRedDelta,
            distinctRedDeltas: distinctRedDeltas.size
        };
        if (backend === "dx11") dx11Oracle = oracle;
    }
    return dx11Oracle;
}

function AssertExactTargetMatch(left, right, label)
{
    for (let y = 0; y < HEIGHT; y += 1)
    {
        const row = y * BYTES_PER_ROW;
        for (let x = 0; x < WIDTH * BYTES_PER_PIXEL; x += 1)
        {
            Assert(
                left[row + x] === right[row + x],
                `${label} differs at row ${y}, active byte ${x}: ${left[row + x]} versus ${right[row + x]}`
            );
        }
    }
}

function GetActiveTargetPixels(bytes)
{
    const pixels = [];
    for (let y = 0; y < HEIGHT; y += 1)
    {
        const row = y * BYTES_PER_ROW;
        pixels.push(...bytes.slice(row, row + WIDTH * BYTES_PER_PIXEL));
    }
    return pixels;
}

function AssertDecalV5Silhouette(bytes, label, variant, resourceVariant = "base")
{
    for (const [ x, y ] of [ [ 0, 0 ], [ WIDTH - 1, 0 ], [ 0, HEIGHT - 1 ], [ WIDTH - 1, HEIGHT - 1 ] ])
    {
        Assert(
            PixelEquals(bytes, x, y, DECALV5_CLEAR_TARGET),
            `${label} corner (${x}, ${y}) did not remain clear`
        );
    }
    const anchors = variant === "counter"
        ? []
        : [
            [ "nose", 32, 10 ],
            [ "center", 32, 32 ],
            [ "left wing", 13, 31 ],
            [ "right wing", 50, 31 ],
            [ "left tail", 24, 52 ],
            [ "right tail", 40, 52 ]
        ];
    for (const [ name, x, y ] of anchors)
    {
        Assert(
            PixelNeighborhoodHasDraw(bytes, x, y, DECALV5_CLEAR_TARGET, 1),
            `${label} ${name} anchor neighborhood (${x}, ${y}) remained clear`
        );
    }
    let coverage = 0;
    let minimumX = WIDTH;
    let maximumX = -1;
    let minimumY = HEIGHT;
    let maximumY = -1;
    const colors = new Set();
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            if (!PixelEquals(bytes, x, y, DECALV5_CLEAR_TARGET))
            {
                coverage += 1;
                minimumX = Math.min(minimumX, x);
                maximumX = Math.max(maximumX, x);
                minimumY = Math.min(minimumY, y);
                maximumY = Math.max(maximumY, y);
                const offset = PixelOffset(x, y);
                colors.add(`${bytes[offset]},${bytes[offset + 1]},${bytes[offset + 2]},${bytes[offset + 3]}`);
            }
        }
    }
    if (variant === "counter")
    {
        Assert(coverage >= 100 && coverage <= 200, `${label} has implausible counter coverage ${coverage}`);
        Assert(
            minimumX <= 24 && maximumX >= 39 && minimumY <= 7 && maximumY >= 18,
            `${label} has implausible counter bounds ${minimumX}..${maximumX}, ${minimumY}..${maximumY}`
        );
        Assert(colors.size >= 2, `${label} must contain varied counter output rather than a constant fill`);
    }
    else if (variant === "hole")
    {
        Assert(coverage >= 2700 && coverage <= 2730, `${label} has implausible hole coverage ${coverage}`);
        Assert(
            minimumX <= 4 && maximumX >= 59 && minimumY <= 4 && maximumY >= 59,
            `${label} has implausible hole bounds ${minimumX}..${maximumX}, ${minimumY}..${maximumY}`
        );
        Assert(colors.size >= 8, `${label} must contain varied hole output rather than a constant fill`);
    }
    else if (variant === "glow" || variant === "glowCylindric")
    {
        Assert(coverage >= 900 && coverage <= 1800, `${label} has implausible glow coverage ${coverage}`);
        Assert(
            minimumX <= 20 && maximumX >= 48 && minimumY <= 12 && maximumY >= 50,
            `${label} has implausible glow bounds ${minimumX}..${maximumX}, ${minimumY}..${maximumY}`
        );
        if (![
            "whiteBoth",
            "halfTransparency",
            "halfGlow"
        ].includes(resourceVariant))
        {
            Assert(
                colors.size >= 16,
                `${label} must contain varied glow shading rather than a constant fill`
            );
        }
    }
    else
    {
        Assert(coverage >= 700 && coverage <= 2000, `${label} has implausible decal coverage ${coverage}`);
        Assert(
            minimumX <= 20 && maximumX >= 48 && minimumY <= 12 && maximumY >= 50,
            `${label} has implausible decal bounds ${minimumX}..${maximumX}, ${minimumY}..${maximumY}`
        );
        Assert(colors.size >= 8, `${label} must contain varied decal shading rather than a constant fill`);
    }
    return {
        coverage,
        bounds: { minimumX, maximumX, minimumY, maximumY },
        distinctColors: colors.size
    };
}

function AssertGlowTextureInfluence(base, control, label)
{
    let activePixels = 0;
    let changedPixels = 0;
    let rgbDelta = 0;
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            const baseClear = PixelEquals(base, x, y, DECALV5_CLEAR_TARGET);
            const controlClear = PixelEquals(control, x, y, DECALV5_CLEAR_TARGET);
            Assert(baseClear === controlClear, `${label} changed the active silhouette at (${x}, ${y})`);
            if (baseClear) continue;
            activePixels += 1;
            const offset = PixelOffset(x, y);
            let pixelDelta = 0;
            for (let component = 0; component < 3; component += 1)
            {
                pixelDelta += Math.abs(base[offset + component] - control[offset + component]);
            }
            if (pixelDelta > 0) changedPixels += 1;
            rgbDelta += pixelDelta;
        }
    }
    const changedRatio = changedPixels / activePixels;
    const averageRgbDelta = rgbDelta / activePixels;
    Assert(changedRatio >= 0.5, `${label} affected only ${changedPixels}/${activePixels} active pixels`);
    Assert(averageRgbDelta >= 12, `${label} average RGB delta ${averageRgbDelta} is too small`);
    return { activePixels, changedPixels, changedRatio, averageRgbDelta };
}

function SrgbByteToLinear(value)
{
    const normalized = value / 255;
    return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
}

function SampleRepeatBilinear8x8(u, v, texel)
{
    const sampleAxis = (coordinate) =>
    {
        const location = (coordinate - Math.floor(coordinate)) * 8 - 0.5;
        const lower = Math.floor(location);
        return {
            lower: ((lower % 8) + 8) % 8,
            upper: (((lower + 1) % 8) + 8) % 8,
            fraction: location - lower
        };
    };
    const x = sampleAxis(u);
    const y = sampleAxis(v);
    const top = texel(x.lower, y.lower) * (1 - x.fraction)
        + texel(x.upper, y.lower) * x.fraction;
    const bottom = texel(x.lower, y.upper) * (1 - x.fraction)
        + texel(x.upper, y.upper) * x.fraction;
    return (top * (1 - y.fraction) + bottom * y.fraction) / 255;
}

function SampleZeroBorderBilinear8x8(u, v, texel)
{
    const locationX = u * 8 - 0.5;
    const locationY = v * 8 - 0.5;
    const lowerX = Math.floor(locationX);
    const lowerY = Math.floor(locationY);
    const fractionX = locationX - lowerX;
    const fractionY = locationY - lowerY;
    const read = (x, y) => x < 0 || x >= 8 || y < 0 || y >= 8
        ? 0
        : texel(x, y);
    const top = read(lowerX, lowerY) * (1 - fractionX)
        + read(lowerX + 1, lowerY) * fractionX;
    const bottom = read(lowerX, lowerY + 1) * (1 - fractionX)
        + read(lowerX + 1, lowerY + 1) * fractionX;
    return (top * (1 - fractionY) + bottom * fractionY) / 255;
}

function LinearToSrgb(value)
{
    return value < 0.0031308
        ? value * 12.92
        : 1.055 * (value ** (1 / 2.4)) - 0.055;
}

function AssertCylindricGlowControls(instances)
{
    const snapshots = Object.fromEntries(instances
        .filter((instance) => instance.record.backend === "dx11")
        .map((instance) => [ instance.resourceVariant, instance.snapshot ]));
    for (const name of [
        "base",
        "whiteTransparency",
        "whiteGlow",
        "whiteBoth",
        "halfTransparency",
        "halfGlow"
    ])
    {
        Assert(snapshots[name], `DecalGlowCylindricV5 ${name} output is missing`);
    }

    const expectedTransparencyRatio = 128 / 255;
    const expectedGlowRatio = expectedTransparencyRatio ** 2.4;
    let activePixels = 0;
    let samples = 0;
    let transparencyError = 0;
    let glowError = 0;
    let productIdentityError = 0;
    let transparencyCoordinateError = 0;
    let glowCoordinateError = 0;
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            const clear = PixelEquals(snapshots.whiteBoth, x, y, DECALV5_CLEAR_TARGET);
            for (const name of Object.keys(snapshots))
            {
                Assert(
                    PixelEquals(snapshots[name], x, y, DECALV5_CLEAR_TARGET) === clear,
                    `DecalGlowCylindricV5 ${name} changed the active silhouette at (${x}, ${y})`
                );
            }
            if (clear) continue;
            activePixels += 1;
            const offset = PixelOffset(x, y);
            const worldX = 2 * (x + 0.5) / WIDTH - 1;
            const worldY = 1 - 2 * (y + 0.5) / HEIGHT;
            const cylindricalU = (Math.atan2(0.25, worldY) + Math.PI) / (2 * Math.PI);
            const cylindricalV = worldX * 0.5 + 0.5;
            const expectedTransparency = SampleRepeatBilinear8x8(
                cylindricalU,
                cylindricalV,
                (texelX, texelY) => 32 + 20 * texelX + 8 * texelY
            );
            const expectedGlow = SampleRepeatBilinear8x8(
                cylindricalU,
                cylindricalV,
                (texelX, texelY) => 192 - 16 * texelX + 8 * texelY
            );
            // Red and green stay comfortably above quantization noise and
            // below saturation for the harness-authored glow color.
            for (const component of [ 0, 1 ])
            {
                const whiteBoth = SrgbByteToLinear(snapshots.whiteBoth[offset + component]);
                const halfTransparency =
                    SrgbByteToLinear(snapshots.halfTransparency[offset + component]);
                const halfGlow = SrgbByteToLinear(snapshots.halfGlow[offset + component]);
                const base = SrgbByteToLinear(snapshots.base[offset + component]);
                const transparencyOnly =
                    SrgbByteToLinear(snapshots.whiteGlow[offset + component]);
                const glowOnly =
                    SrgbByteToLinear(snapshots.whiteTransparency[offset + component]);
                Assert(
                    whiteBoth > 0.02,
                    "DecalGlowCylindricV5 white control is too dark for a ratio oracle"
                );
                transparencyError += Math.abs(
                    halfTransparency / whiteBoth - expectedTransparencyRatio
                );
                glowError += Math.abs(halfGlow / whiteBoth - expectedGlowRatio);
                productIdentityError += Math.abs(
                    base * whiteBoth - transparencyOnly * glowOnly
                );
                transparencyCoordinateError += Math.abs(
                    transparencyOnly / whiteBoth - expectedTransparency
                );
                glowCoordinateError += Math.abs(
                    (glowOnly / whiteBoth) ** (1 / 2.4) - expectedGlow
                );
                samples += 1;
            }
        }
    }
    Assert(activePixels > 0, "DecalGlowCylindricV5 controls have no active pixels");
    const transparencyMeanAbsoluteError = transparencyError / samples;
    const glowMeanAbsoluteError = glowError / samples;
    const productIdentityMeanAbsoluteError = productIdentityError / samples;
    const transparencyCoordinateMeanAbsoluteError =
        transparencyCoordinateError / samples;
    const glowCoordinateMeanAbsoluteError = glowCoordinateError / samples;
    Assert(
        transparencyMeanAbsoluteError <= 0.025,
        `DecalGlowCylindricV5 linear transparency ratio MAE ` +
            `${transparencyMeanAbsoluteError} exceeds 0.025`
    );
    Assert(
        glowMeanAbsoluteError <= 0.025,
        `DecalGlowCylindricV5 2.4-power glow ratio MAE ${glowMeanAbsoluteError} exceeds 0.025`
    );
    Assert(
        productIdentityMeanAbsoluteError <= 0.01,
        `DecalGlowCylindricV5 texture product identity MAE ` +
            `${productIdentityMeanAbsoluteError} exceeds 0.01`
    );
    Assert(
        transparencyCoordinateMeanAbsoluteError <= 0.015,
        `DecalGlowCylindricV5 angular/axial transparency sample MAE ` +
            `${transparencyCoordinateMeanAbsoluteError} exceeds 0.015`
    );
    Assert(
        glowCoordinateMeanAbsoluteError <= 0.015,
        `DecalGlowCylindricV5 angular/axial glow sample MAE ` +
            `${glowCoordinateMeanAbsoluteError} exceeds 0.015`
    );
    return {
        activePixels,
        expectedTransparencyRatio,
        expectedGlowRatio,
        transparencyMeanAbsoluteError,
        glowMeanAbsoluteError,
        productIdentityMeanAbsoluteError,
        transparencyCoordinateMeanAbsoluteError,
        glowCoordinateMeanAbsoluteError
    };
}

function AssertCylindricSurfaceAlpha(instances)
{
    const snapshots = Object.fromEntries(instances
        .filter((instance) => instance.record.backend === "dx11")
        .map((instance) => [ instance.resourceVariant, instance.snapshot ]));
    for (const name of [ "base", "axialTransparency", "whiteTransparency" ])
    {
        Assert(snapshots[name], `DecalCylindricV5 ${name} output is missing`);
    }
    let activePixels = 0;
    let angularError = 0;
    let axialError = 0;
    let angularMaximumError = 0;
    let axialMaximumError = 0;
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            const clear = PixelEquals(
                snapshots.whiteTransparency,
                x,
                y,
                DECALV5_CLEAR_TARGET
            );
            for (const name of Object.keys(snapshots))
            {
                Assert(
                    PixelEquals(snapshots[name], x, y, DECALV5_CLEAR_TARGET) === clear,
                    `DecalCylindricV5 ${name} changed the active silhouette at (${x}, ${y})`
                );
            }
            if (clear) continue;
            activePixels += 1;
            const worldX = 2 * (x + 0.5) / WIDTH - 1;
            const worldY = 1 - 2 * (y + 0.5) / HEIGHT;
            const cylindricalU =
                (Math.atan2(0.5, worldY) + Math.PI) / (2 * Math.PI);
            const cylindricalV = worldX * 0.5 + 0.5;
            const expectedAngular = SampleRepeatBilinear8x8(
                cylindricalU,
                cylindricalV,
                (texelX) => 48 + 24 * texelX
            ) * 255;
            const expectedAxial = SampleRepeatBilinear8x8(
                cylindricalU,
                cylindricalV,
                (_texelX, texelY) => 48 + 24 * texelY
            ) * 255;
            const offset = PixelOffset(x, y);
            const angularPixelError =
                Math.abs(snapshots.base[offset + 3] - expectedAngular);
            const axialPixelError =
                Math.abs(snapshots.axialTransparency[offset + 3] - expectedAxial);
            Assert(
                snapshots.whiteTransparency[offset + 3] === 255,
                `DecalCylindricV5 white transparency alpha drifted at (${x}, ${y})`
            );
            angularError += angularPixelError;
            axialError += axialPixelError;
            angularMaximumError = Math.max(angularMaximumError, angularPixelError);
            axialMaximumError = Math.max(axialMaximumError, axialPixelError);
        }
    }
    Assert(activePixels > 0, "DecalCylindricV5 controls have no active pixels");
    const angularMeanAbsoluteError = angularError / activePixels;
    const axialMeanAbsoluteError = axialError / activePixels;
    Assert(
        angularMaximumError <= 2 && angularMeanAbsoluteError <= 1.5,
        `DecalCylindricV5 angular alpha oracle drifted: max ${angularMaximumError}, ` +
            `MAE ${angularMeanAbsoluteError}`
    );
    Assert(
        axialMaximumError <= 2 && axialMeanAbsoluteError <= 1.5,
        `DecalCylindricV5 axial alpha oracle drifted: max ${axialMaximumError}, ` +
            `MAE ${axialMeanAbsoluteError}`
    );
    return {
        activePixels,
        angularMaximumError,
        axialMaximumError,
        angularMeanAbsoluteError,
        axialMeanAbsoluteError
    };
}

function AssertDecalHoleProjection(instances)
{
    const snapshots = Object.fromEntries(instances
        .filter((instance) => instance.record.backend === "dx11")
        .map((instance) => [ instance.resourceVariant, instance.snapshot ]));
    const names = [
        "base",
        "axialTransparency",
        "interiorWhiteTransparency",
        "zeroHole",
        "insideHole"
    ];
    for (const name of names)
    {
        Assert(snapshots[name], `DecalHoleV5 ${name} output is missing`);
    }

    const edgeTexel = (x, y) => x === 0 || x === 7 || y === 0 || y === 7;
    const sample = (u, v, texel) => SampleZeroBorderBilinear8x8(
        u,
        v,
        (x, y) => edgeTexel(x, y) ? 0 : texel(x, y)
    );
    let activePixels = 0;
    let classifiedPixels = 0;
    let uncertainTangentPixels = 0;
    let baseAlphaError = 0;
    let axialAlphaError = 0;
    let whiteAlphaError = 0;
    let baseRgbError = 0;
    let insideRgbError = 0;
    let baseAlphaMaximumError = 0;
    let axialAlphaMaximumError = 0;
    let whiteAlphaMaximumError = 0;
    let baseRgbMaximumError = 0;
    let insideRgbMaximumError = 0;
    let baseVsZeroChanged = 0;
    let insideVsZeroChanged = 0;
    for (let y = 0; y < HEIGHT; y += 1)
    {
        for (let x = 0; x < WIDTH; x += 1)
        {
            const clear = PixelEquals(snapshots.base, x, y, DECALV5_CLEAR_TARGET);
            for (const name of names)
            {
                Assert(
                    PixelEquals(snapshots[name], x, y, DECALV5_CLEAR_TARGET) === clear,
                    `DecalHoleV5 ${name} changed the discard silhouette at (${x}, ${y})`
                );
            }

            const worldX = 2 * (x + 0.5) / WIDTH - 1;
            const worldY = 1 - 2 * (y + 0.5) / HEIGHT;
            const worldZ = 0.5 + 0.2 * worldX;
            const cameraDistance = 4.5 - 0.2 * worldX;
            const rayDenominator =
                worldX * worldX + worldY * worldY + cameraDistance * cameraDistance;
            const discriminant =
                (cameraDistance * cameraDistance
                    - 24 * (worldX * worldX + worldY * worldY))
                / rayDenominator;
            if (Math.abs(discriminant) <= 0.0001)
            {
                uncertainTangentPixels += 1;
            }
            else
            {
                classifiedPixels += 1;
                Assert(
                    clear === (discriminant < 0),
                    `DecalHoleV5 ray/sphere discard drifted at (${x}, ${y})`
                );
            }
            if (clear) continue;

            activePixels += 1;
            const u = (worldY + 1) * 0.5;
            const v = (worldZ + 1) * 0.5;
            const expectedBaseAlpha = sample(
                u,
                v,
                (texelX) => DECAL_HOLE_V5_BASE_TRANSPARENCY[texelX]
            ) * 255;
            const expectedAxialAlpha = sample(
                u,
                v,
                (_texelX, texelY) => DECAL_HOLE_V5_AXIAL_TRANSPARENCY[texelY]
            ) * 255;
            const expectedWhiteAlpha = sample(u, v, () => 255) * 255;
            const holeRed = sample(
                u,
                v,
                (texelX) => DECAL_HOLE_V5_HOLE_RED[texelX]
            );
            const holeAlpha = sample(
                u,
                v,
                (_texelX, texelY) => DECAL_HOLE_V5_HOLE_ALPHA[texelY]
            );
            const insideAlpha = sample(u, v, () => 255);
            const cubeAlpha = DECAL_HOLE_V5_CUBE_ALPHA / 255;
            const baseFactor = holeRed + holeAlpha * (cubeAlpha - holeRed);
            const insideFactor = insideAlpha * cubeAlpha;
            const offset = PixelOffset(x, y);
            const alphaErrors = [
                Math.abs(snapshots.base[offset + 3] - expectedBaseAlpha),
                Math.abs(snapshots.axialTransparency[offset + 3] - expectedAxialAlpha),
                Math.abs(
                    snapshots.interiorWhiteTransparency[offset + 3]
                        - expectedWhiteAlpha
                )
            ];
            baseAlphaError += alphaErrors[0];
            axialAlphaError += alphaErrors[1];
            whiteAlphaError += alphaErrors[2];
            baseAlphaMaximumError = Math.max(baseAlphaMaximumError, alphaErrors[0]);
            axialAlphaMaximumError = Math.max(axialAlphaMaximumError, alphaErrors[1]);
            whiteAlphaMaximumError = Math.max(whiteAlphaMaximumError, alphaErrors[2]);
            Assert(
                snapshots.zeroHole[offset + 3] === snapshots.base[offset + 3]
                    && snapshots.insideHole[offset + 3] === snapshots.base[offset + 3],
                `DecalHoleV5 hole controls changed transparency at (${x}, ${y})`
            );
            for (let component = 0; component < 3; component += 1)
            {
                Assert(
                    snapshots.axialTransparency[offset + component]
                        === snapshots.base[offset + component]
                        && snapshots.interiorWhiteTransparency[offset + component]
                        === snapshots.base[offset + component],
                    `DecalHoleV5 transparency controls changed RGB at (${x}, ${y})`
                );
                Assert(
                    snapshots.zeroHole[offset + component] === 0,
                    `DecalHoleV5 zero-hole RGB is nonzero at (${x}, ${y})`
                );
                const expectedBase = LinearToSrgb(
                    DECAL_HOLE_V5_GLOW_COLOR[component] * baseFactor
                ) * 255;
                const expectedInside = LinearToSrgb(
                    DECAL_HOLE_V5_GLOW_COLOR[component] * insideFactor
                ) * 255;
                const baseError =
                    Math.abs(snapshots.base[offset + component] - expectedBase);
                const insideError =
                    Math.abs(snapshots.insideHole[offset + component] - expectedInside);
                baseRgbError += baseError;
                insideRgbError += insideError;
                baseRgbMaximumError = Math.max(baseRgbMaximumError, baseError);
                insideRgbMaximumError = Math.max(insideRgbMaximumError, insideError);
            }
            if (!PixelRgbEquals(snapshots.base, snapshots.zeroHole, x, y))
            {
                baseVsZeroChanged += 1;
            }
            if (!PixelRgbEquals(snapshots.insideHole, snapshots.zeroHole, x, y))
            {
                insideVsZeroChanged += 1;
            }
        }
    }

    Assert(
        classifiedPixels + uncertainTangentPixels === WIDTH * HEIGHT
            && uncertainTangentPixels <= 4,
        "DecalHoleV5 tangent exclusion band is unexpectedly broad"
    );
    Assert(
        activePixels >= 2714 && activePixels <= 2722,
        `DecalHoleV5 ray/sphere coverage ${activePixels} is outside the audited range`
    );
    Assert(
        baseVsZeroChanged / activePixels >= 0.95
            && insideVsZeroChanged / activePixels >= 0.95,
        "DecalHoleV5 hole/cube controls do not influence enough surviving pixels"
    );
    const baseAlphaMeanAbsoluteError = baseAlphaError / activePixels;
    const axialAlphaMeanAbsoluteError = axialAlphaError / activePixels;
    const whiteAlphaMeanAbsoluteError = whiteAlphaError / activePixels;
    const baseRgbMeanAbsoluteError = baseRgbError / (activePixels * 3);
    const insideRgbMeanAbsoluteError = insideRgbError / (activePixels * 3);
    for (const [ label, maximum, mean ] of [
        [ "base alpha", baseAlphaMaximumError, baseAlphaMeanAbsoluteError ],
        [ "axial alpha", axialAlphaMaximumError, axialAlphaMeanAbsoluteError ],
        [ "interior-white alpha", whiteAlphaMaximumError, whiteAlphaMeanAbsoluteError ],
        [ "base hole RGB", baseRgbMaximumError, baseRgbMeanAbsoluteError ],
        [ "inside-hole RGB", insideRgbMaximumError, insideRgbMeanAbsoluteError ]
    ])
    {
        Assert(
            maximum <= 2 && mean <= 1.5,
            `DecalHoleV5 ${label} oracle drifted: max ${maximum}, MAE ${mean}`
        );
    }
    return {
        activePixels,
        discardedPixels: WIDTH * HEIGHT - activePixels,
        classifiedPixels,
        uncertainTangentPixels,
        baseAlphaMaximumError,
        axialAlphaMaximumError,
        whiteAlphaMaximumError,
        baseRgbMaximumError,
        insideRgbMaximumError,
        baseAlphaMeanAbsoluteError,
        axialAlphaMeanAbsoluteError,
        whiteAlphaMeanAbsoluteError,
        baseRgbMeanAbsoluteError,
        insideRgbMeanAbsoluteError
    };
}

/**
 * Draw one real EVE hull through the packed quadv5 PPT Main pass.
 *
 * Every other draw in this harness is a gate: it asserts pixels, and a change
 * in the engine that alters them fails the run. This one asserts only that the
 * frame is not empty. That is not laziness — there is no oracle for what a real
 * hull under an invented camera and a neutral scene should look like, and an
 * assertion invented to match today's output would be a golden that encodes a
 * bug as correct. What it does prove is the whole path: packed `.gr2` geometry,
 * block-compressed mip chains from the client's own compressor, the material
 * layout taken from the pass binding, and the Carbon per-frame and per-object
 * struct ABI, all reaching a pipeline built by the engine.
 *
 * @param {object} webgpu Engine device.
 * @returns {Promise<object|null>} Draw record, or null when the flag is absent.
 */
async function RunHullDraw(webgpu)
{
    if (!CONFIG.drawHull) return null;
    const response = await fetch("/draw-hull.json");
    Assert(response.ok, `Failed to load the hull package record: HTTP ${response.status}`);
    const record = await response.json();
    validateHullPackageRecord(record);

    const device = webgpu.GetDevice();
    const width = HULL_TARGET_WIDTH;
    const height = HULL_TARGET_HEIGHT;
    const fixture = await CreateHullGpuResources(webgpu, record, width, height);
    let dispatcher = null;
    let passEncoder = null;
    let preparedBatchMap = null;
    const targets = [];
    const readbacks = [];
    let depth = null;
    try
    {
        dispatcher = CreateHullTrinityDispatcher(webgpu, fixture);
        passEncoder = new CjsWebgpuTrinityPassEncoder(dispatcher);
        preparedBatchMap = await dispatcher.PrepareBatchMap(
            CreateHullTrinityBatchMap(record, fixture)
        );
        for (let index = 0; index < HULL_CLEAR_TARGETS.length; index += 1)
        {
            targets.push(device.createTexture({
                label: `Hull MRT${index}`,
                size: { width, height, depthOrArrayLayers: 1 },
                format: "rgba8unorm",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
            }));
            readbacks.push(device.createBuffer({
                label: `Hull MRT${index} readback`,
                size: width * 4 * height,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            }));
        }
        // A closed hull is not convex and its own far side draws over its near
        // side without this. The gate fixtures get away with no depth buffer
        // because their geometry is a single flat silhouette.
        depth = device.createTexture({
            label: "Hull depth",
            size: { width, height, depthOrArrayLayers: 1 },
            format: HULL_DEPTH_FORMAT,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        const encoder = device.createCommandEncoder({ label: "Hull draw encoder" });
        passEncoder.Encode(encoder, [ {
            descriptor: {
                label: "Hull Main.pass0",
                colorAttachments: targets.map((texture, index) => ({
                    view: texture.createView(),
                    clearValue: {
                        r: HULL_CLEAR_TARGETS[index][0] / 255,
                        g: HULL_CLEAR_TARGETS[index][1] / 255,
                        b: HULL_CLEAR_TARGETS[index][2] / 255,
                        a: HULL_CLEAR_TARGETS[index][3] / 255
                    },
                    loadOp: "clear",
                    storeOp: "store"
                })),
                depthStencilAttachment: {
                    view: depth.createView(),
                    depthClearValue: 1,
                    depthLoadOp: "clear",
                    depthStoreOp: "store"
                }
            },
            selections: [ {
                preparedBatchMap,
                batchType: TRINITY_BATCH_TYPE_OPAQUE
            } ]
        } ]);
        targets.forEach((texture, index) =>
        {
            encoder.copyTextureToBuffer(
                { texture },
                { buffer: readbacks[index], bytesPerRow: width * 4, rowsPerImage: height },
                { width, height, depthOrArrayLayers: 1 }
            );
        });
        webgpu.Submit([ encoder.finish() ]);
        await device.queue.onSubmittedWorkDone();
        await Promise.all(readbacks.map((buffer) => buffer.mapAsync(GPUMapMode.READ)));

        const targetPixels = readbacks.map(
            (buffer) => Array.from(new Uint8Array(buffer.getMappedRange()))
        );
        // The one assertion worth making. A frame identical to its clear colour
        // means the draw produced nothing, and the two ways that happens here
        // are a camera that faces away from the hull and a shadow map dark
        // enough to make the shader discard every pixel. Both look like success
        // to a run that only checks for thrown errors.
        const clear = HULL_CLEAR_TARGETS[0];
        let coverage = 0;
        for (let index = 0; index < targetPixels[0].length; index += 4)
        {
            if (targetPixels[0][index] !== clear[0]
                || targetPixels[0][index + 1] !== clear[1]
                || targetPixels[0][index + 2] !== clear[2])
            {
                coverage += 1;
            }
        }
        Assert(coverage > 0, "Hull draw produced a frame identical to its clear colour");
        return {
            label: record.label,
            targetWidth: width,
            targetHeight: height,
            targetPixels,
            coverage,
            coverageFraction: coverage / (width * height),
            indexCount: fixture.geometry.indexCount,
            vertexCount: fixture.vertexCount
        };
    }
    finally
    {
        for (const buffer of readbacks)
        {
            if (buffer.mapState === "mapped") buffer.unmap();
            buffer.destroy();
        }
        for (const texture of targets) texture.destroy();
        depth?.destroy();
        if (preparedBatchMap && dispatcher) dispatcher.DestroyBatchMap(preparedBatchMap);
        fixture.destroy();
    }
}

async function CreateHullGpuResources(webgpu, record, width, height)
{
    const plan = getHullResourcePlan(record);
    const [ vertexResponse, indexResponse, describeResponse ] = await Promise.all([
        fetch(HULL_GEOMETRY_ASSETS.vertices),
        fetch(HULL_GEOMETRY_ASSETS.indices),
        fetch(HULL_GEOMETRY_ASSETS.describe)
    ]);
    for (const [ label, value ] of [
        [ "vertices", vertexResponse ], [ "indices", indexResponse ], [ "describe", describeResponse ]
    ])
    {
        Assert(value.ok, `Failed to load hull ${label}: HTTP ${value.status}`);
    }
    const vertices = new Uint8Array(await vertexResponse.arrayBuffer());
    const indices = new Uint8Array(await indexResponse.arrayBuffer());
    const describe = await describeResponse.json();
    Assert(
        vertices.byteLength === describe.count * HULL_VERTEX_BUFFER_LAYOUT.arrayStride,
        "Hull vertex buffer does not match the declared stride and count"
    );
    Assert(
        indices.byteLength === describe.indexCount * 2,
        "Hull index buffer does not match the declared index count"
    );

    const textures = {};
    await Promise.all(Object.entries(HULL_TEXTURE_ASSETS).map(async ([ name, url ]) =>
    {
        const binding = plan.textures.find((entry) => entry.name === name);
        Assert(binding, `Hull package has no binding for ${name}`);
        const mapResponse = await fetch(url);
        Assert(mapResponse.ok, `Failed to load hull ${name}: HTTP ${mapResponse.status}`);
        textures[name] = parseDdsTexture(
            await mapResponse.arrayBuffer(), `Hull ${name}`, binding.isSRGB
        );
    }));
    Object.assign(textures, createHullPlaceholderTextures());
    for (const binding of plan.textures)
    {
        Assert(textures[binding.name], `Hull fixture has no texture for ${binding.name}`);
    }

    const bundle = await PublishPreparedResourceBundle(webgpu, {
        label: "Hull resources",
        geometries: {
            main: {
                label: "af1_t1 packed hull geometry",
                vertexBuffers: [ {
                    slot: 0,
                    data: vertices,
                    layout: HULL_VERTEX_BUFFER_LAYOUT
                } ],
                indexBuffer: { data: indices, format: "uint16" }
            }
        },
        textures,
        samplers: createHullSamplers()
    }, "hull-resources");

    const resources = new Map();
    for (const binding of plan.textures)
    {
        const resource = bundle.textures[binding.name];
        Assert(resource, `Hull bundle is missing texture ${binding.name}`);
        resources.set(binding.scopeIdentity, resource);
    }
    for (const binding of plan.samplers)
    {
        const resource = bundle.samplers[binding.name];
        Assert(resource, `Hull bundle is missing sampler ${binding.name}`);
        resources.set(binding.scopeIdentity, resource);
    }

    const geometrySource = Object.freeze({ kind: "eve-hull", hull: "af1_t1" });
    return {
        // The hull's own SOF material, not Carbon's white defaults.
        bindingValues: createHullBindingValues(record, width, height, { sof: true }),
        materialLayout: MaterialLayoutFromPackage(record),
        resources,
        geometry: bundle.geometries.main,
        geometrySource,
        vertexCount: describe.count,
        bundle,
        destroy()
        {
            bundle.Destroy();
        }
    };
}

function CreateHullTrinityBatchMap(record, fixture)
{
    const batch = Object.freeze({
        material: record,
        shader: record.pipeline,
        objectData: fixture.bindingValues,
        geometrySource: Object.freeze({
            geometry: fixture.geometrySource,
            meshIndex: 0,
            // Both of the hull's areas are drawn as one range. They differ only
            // by material index, and this pass binds one material, so splitting
            // them would issue two identical draws over disjoint ranges.
            areaIndex: 0,
            count: 1,
            reversed: false
        }),
        topology: 4,
        indexCountPerInstance: 0,
        instanceCount: 0,
        startIndexLocation: 0,
        baseVertexLocation: 0,
        startInstanceLocation: 0,
        renderingMode: 0,
        pickingData: 0,
        groupCount: 1
    });
    const accumulator = Object.freeze({
        GetBatchCount: () => 1,
        // GDPR batches keep their own vector in Carbon and stay empty here: one
        // hull is one ordinary opaque batch.
        GetGdprBatches: () => [],
        GetBatches: () => [ batch ]
    });
    const batchTypes = Object.freeze([ TRINITY_BATCH_TYPE_OPAQUE ]);
    return Object.freeze({
        GetBatchTypes: () => batchTypes,
        GetAccumulator: (value) => value === TRINITY_BATCH_TYPE_OPAQUE ? accumulator : null,
        GetBatchCount: () => accumulator.GetBatchCount()
    });
}

function CreateHullTrinityDispatcher(webgpu, fixture)
{
    return new CjsWebgpuTrinityBatchDispatcher(webgpu, {
        ResolveMaterial(record, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE,
                "Hull material resolved outside the opaque batch type"
            );
            return {
                pipeline: record.pipeline,
                prepareOptions: { warningsAsErrors: false },
                recipe: {
                    label: "Hull Main.pass0",
                    vertex: { buffers: fixture.geometry.vertexBufferLayouts },
                    fragment: {
                        targets: [ { format: "rgba8unorm" }, { format: "rgba8unorm" } ]
                    },
                    // EVE hulls wind clockwise as seen from outside, which is
                    // "front" in a left-handed convention.
                    primitive: { cullMode: "back", frontFace: "cw" },
                    depthStencil: {
                        format: HULL_DEPTH_FORMAT,
                        depthWriteEnabled: true,
                        depthCompare: "less"
                    }
                }
            };
        },
        ResolveGeometry(source, _batch, context)
        {
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && source?.geometry === fixture.geometrySource,
                "Hull batch references an unknown geometry source"
            );
            return {
                geometry: fixture.geometry,
                indexed: true,
                draw: {
                    indexCount: fixture.geometry.indexCount,
                    instanceCount: 1,
                    firstIndex: 0,
                    baseVertex: 0,
                    firstInstance: 0
                }
            };
        },
        ResolveBindings(batch, _livePipeline, context)
        {
            const record = batch.material;
            Assert(
                context?.batchType === TRINITY_BATCH_TYPE_OPAQUE
                    && batch.objectData === fixture.bindingValues,
                "Hull batch references unknown object data"
            );
            return {
                uniformData: ScopeFixtureBindingValues(
                    record.pipeline,
                    new Map(Object.entries(buildEveSpaceObjectMainUniformData(
                        record,
                        batch.objectData,
                        { materialLayout: fixture.materialLayout }
                    ))),
                    "Hull uniform data"
                ),
                resources: ScopeFixtureBindingValues(
                    record.pipeline,
                    fixture.resources,
                    "Hull resources"
                )
            };
        }
    });
}

async function RunQuadV5Comparison(webgpu)
{
    if (!CONFIG.drawQuadV5) return null;
    const response = await fetch("/draw-quadv5.json");
    Assert(response.ok, `Failed to load QuadV5 package records: HTTP ${response.status}`);
    const records = await response.json();
    Assert(Array.isArray(records) && records.length === 2, "QuadV5 comparison requires two package records");
    validateQuadV5PackagePair(records);

    const device = webgpu.GetDevice();
    const fixture = await CreateQuadV5GpuResources(webgpu, records);
    let dispatcher = null;
    let passEncoder = null;
    const instances = [];
    let warningCount = 0;
    try
    {
        dispatcher = CreateQuadV5TrinityDispatcher(webgpu, fixture);
        passEncoder = new CjsWebgpuTrinityPassEncoder(dispatcher);
        for (const record of records)
        {
            for (const renderCase of fixture.caseNames)
            {
                let preparedBatchMap = null;
                const targets = [];
                const readbacks = [];
                try
                {
                    preparedBatchMap = await dispatcher.PrepareBatchMap(
                        CreateQuadV5TrinityBatchMap(record, fixture, renderCase)
                    );
                    warningCount += preparedBatchMap.entries.reduce(
                        (mapTotal, entry) => mapTotal + entry.accumulator.batches.reduce(
                            (batchTotal, batch) => batchTotal
                                + batch.prepared.diagnostics
                                    .filter((item) => item.type === "warning").length,
                            0
                        ),
                        0
                    );
                    for (let targetIndex = 0;
                        targetIndex < QUADV5_CLEAR_TARGETS.length;
                        targetIndex += 1)
                    {
                        targets.push(device.createTexture({
                            label: `QuadV5 ${record.label} ${renderCase} MRT${targetIndex}`,
                            size: { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 },
                            format: "rgba8unorm",
                            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
                        }));
                    }
                    for (let targetIndex = 0;
                        targetIndex < QUADV5_CLEAR_TARGETS.length;
                        targetIndex += 1)
                    {
                        readbacks.push(device.createBuffer({
                            label:
                                `QuadV5 ${record.label} ${renderCase} ` +
                                `MRT${targetIndex} readback`,
                            size: BYTES_PER_ROW * HEIGHT,
                            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                        }));
                    }
                    instances.push({
                        record,
                        renderCase,
                        preparedBatchMap,
                        targets,
                        readbacks,
                        snapshots: []
                    });
                }
                catch (error)
                {
                    if (preparedBatchMap) dispatcher.DestroyBatchMap(preparedBatchMap);
                    for (const buffer of readbacks)
                    {
                        buffer.destroy();
                    }
                    for (const texture of targets)
                    {
                        texture.destroy();
                    }
                    throw error;
                }
            }
        }

        const encoder = device.createCommandEncoder({ label: "QuadV5 DX11/DX12 comparison encoder" });
        for (const instance of instances)
        {
            passEncoder.Encode(encoder, [ {
                descriptor: {
                    label:
                        `QuadV5 ${instance.record.label} Main.pass0 ` +
                        `${instance.renderCase}`,
                    colorAttachments: instance.targets.map((texture, targetIndex) => ({
                        view: texture.createView(),
                        clearValue: {
                            r: QUADV5_CLEAR_TARGETS[targetIndex][0] / 255,
                            g: QUADV5_CLEAR_TARGETS[targetIndex][1] / 255,
                            b: QUADV5_CLEAR_TARGETS[targetIndex][2] / 255,
                            a: QUADV5_CLEAR_TARGETS[targetIndex][3] / 255
                        },
                        loadOp: "clear",
                        storeOp: "store"
                    }))
                },
                selections: [ {
                    preparedBatchMap: instance.preparedBatchMap,
                    batchType: TRINITY_BATCH_TYPE_OPAQUE
                } ]
            } ]);
            instance.targets.forEach((texture, targetIndex) =>
            {
                encoder.copyTextureToBuffer(
                    { texture },
                    {
                        buffer: instance.readbacks[targetIndex],
                        bytesPerRow: BYTES_PER_ROW,
                        rowsPerImage: HEIGHT
                    },
                    { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 }
                );
            });
        }
        webgpu.Submit([ encoder.finish() ]);
        await device.queue.onSubmittedWorkDone();
        await Promise.all(instances.flatMap((instance) => instance.readbacks.map(
            (buffer) => buffer.mapAsync(GPUMapMode.READ)
        )));

        for (const instance of instances)
        {
            instance.snapshots = instance.readbacks.map((buffer) =>
                new Uint8Array(buffer.getMappedRange()).slice());
            instance.statistics = instance.snapshots.map((bytes, targetIndex) =>
                AssertQuadV5Silhouette(
                    bytes,
                    targetIndex,
                    `${instance.record.label} ${instance.renderCase} MRT${targetIndex}`,
                    instance.record.variant
                ));
            Assert(
                instance.statistics[0].coverage === instance.statistics[1].coverage,
                `${instance.record.label} MRT coverage does not match`
            );
            AssertQuadV5MrtCoverage(
                instance.snapshots[0],
                instance.snapshots[1],
                `${instance.record.label} ${instance.renderCase}`
            );
        }
        for (const renderCase of fixture.caseNames)
        {
            const paired = records.map((record) => instances.find((instance) =>
                instance.record.backend === record.backend
                    && instance.renderCase === renderCase));
            Assert(
                paired.every(Boolean),
                `QuadV5 ${renderCase} DX11/DX12 pair is incomplete`
            );
            for (let targetIndex = 0;
                targetIndex < QUADV5_CLEAR_TARGETS.length;
                targetIndex += 1)
            {
                AssertExactTargetMatch(
                    paired[0].snapshots[targetIndex],
                    paired[1].snapshots[targetIndex],
                    `DX11/DX12 QuadV5 ${renderCase} MRT${targetIndex}`
                );
            }
        }
        const variant = records[0].variant ?? "static";
        const heatOracle = variant === "skinnedHeat"
            ? AssertQuadV5HeatControls(instances, "cold", "hot", "QuadHeatV5")
            : null;
        const heatDetailOracle = variant === "skinnedHeatDetail"
            ? AssertQuadV5HeatDetailControls(instances)
            : null;
        const baselineCase = variant === "skinnedHeatDetail"
            ? "hotDetail"
            : (variant === "skinnedHeat" ? "hot" : "base");
        const baseline = instances.find((instance) =>
            instance.record.backend === "dx11"
                && instance.renderCase === baselineCase);
        Assert(baseline, `QuadV5 ${baselineCase} DX11 baseline is missing`);
        return {
            bodyIndex: 4,
            variant,
            tier: fixture.tier,
            // The logical count is what the fixture demanded; the physical count is
            // what the package's own layout declared. They are reported separately
            // because agreement between them is the claim being made.
            logicalBindingCount: getQuadV5ResourcePlan(records[0]).textures.length
                + getQuadV5ResourcePlan(records[0]).storage.length
                + getQuadV5ResourcePlan(records[0]).samplers.length
                + 5,
            physicalBindingCount: records[0].pipeline.bindGroups[0].bindings.length,
            labels: records.map((record) => `${record.backend}:${record.label}`),
            loadPath: records[0].loadPath,
            pixelCount: WIDTH * HEIGHT,
            targetCount: QUADV5_CLEAR_TARGETS.length,
            renderCaseCount: fixture.caseNames.length,
            drawKind: records[0].variant === "skinned"
                || records[0].variant === "skinnedHeat"
                || records[0].variant === "skinnedHeatDetail"
                ? "indexed skinned synthetic silhouette"
                : "indexed synthetic silhouette",
            indexCount: fixture.geometry.indexCount,
            warningCount,
            clearTargets: QUADV5_CLEAR_TARGETS,
            topLeftClearPixels: baseline.snapshots
                .map((bytes) => Array.from(bytes.slice(0, 4))),
            statistics: baseline.statistics,
            heatOracle,
            heatDetailOracle,
            targetWidth: WIDTH,
            targetHeight: HEIGHT,
            targetPixels: baseline.snapshots.map(GetActiveTargetPixels)
        };
    }
    finally
    {
        for (const instance of instances)
        {
            dispatcher?.DestroyBatchMap(instance.preparedBatchMap);
            for (const buffer of instance.readbacks)
            {
                if (buffer.mapState === "mapped") buffer.unmap();
                buffer.destroy();
            }
            instance.targets.forEach((texture) => texture.destroy());
        }
        fixture.destroy();
    }
}

async function RunQuadDetailV5Comparison(webgpu)
{
    if (!CONFIG.drawQuadDetailV5) return null;
    const response = await fetch("/draw-quaddetailv5.json");
    Assert(
        response.ok,
        `Failed to load QuadDetailV5 package records: HTTP ${response.status}`
    );
    const records = await response.json();
    Assert(
        Array.isArray(records) && records.length === 2,
        "QuadDetailV5 comparison requires two package records"
    );
    validateQuadDetailV5PackagePair(records);
    Assert(
        QUAD_DETAIL_V5_TARGET_WIDTH === WIDTH
            && QUAD_DETAIL_V5_TARGET_HEIGHT === HEIGHT,
        "QuadDetailV5 and harness target dimensions must match"
    );

    const device = webgpu.GetDevice();
    const fixture = await CreateQuadDetailV5GpuResources(webgpu, records);
    let dispatcher = null;
    let passEncoder = null;
    const instances = [];
    let warningCount = 0;
    try
    {
        Assert(
            JSON.stringify(fixture.caseNames)
                === JSON.stringify([ "pptNeutral", "surface", "detail1", "detail2" ]),
            "QuadDetailV5 cases must isolate PPT, Detail1, and Detail2 in order"
        );
        dispatcher = CreateQuadDetailV5TrinityDispatcher(webgpu, fixture);
        passEncoder = new CjsWebgpuTrinityPassEncoder(dispatcher);
        for (const record of records)
        {
            for (const renderCase of fixture.caseNames)
            {
                let preparedBatchMap = null;
                const targets = [];
                const readbacks = [];
                try
                {
                    preparedBatchMap = await dispatcher.PrepareBatchMap(
                        CreateQuadDetailV5TrinityBatchMap(record, fixture, renderCase)
                    );
                    warningCount += preparedBatchMap.entries.reduce(
                        (mapTotal, entry) => mapTotal + entry.accumulator.batches.reduce(
                            (batchTotal, batch) => batchTotal
                                + batch.prepared.diagnostics
                                    .filter((item) => item.type === "warning").length,
                            0
                        ),
                        0
                    );
                    for (let targetIndex = 0;
                        targetIndex < QUADV5_CLEAR_TARGETS.length;
                        targetIndex += 1)
                    {
                        targets.push(device.createTexture({
                            label:
                                `QuadDetailV5 ${record.label} ${renderCase} ` +
                                `MRT${targetIndex}`,
                            size: { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 },
                            format: "rgba8unorm",
                            usage:
                                GPUTextureUsage.RENDER_ATTACHMENT
                                | GPUTextureUsage.COPY_SRC
                        }));
                        readbacks.push(device.createBuffer({
                            label:
                                `QuadDetailV5 ${record.label} ${renderCase} ` +
                                `MRT${targetIndex} readback`,
                            size: BYTES_PER_ROW * HEIGHT,
                            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                        }));
                    }
                    instances.push({
                        record,
                        renderCase,
                        preparedBatchMap,
                        targets,
                        readbacks,
                        snapshots: []
                    });
                }
                catch (error)
                {
                    if (preparedBatchMap)
                    {
                        dispatcher.DestroyBatchMap(preparedBatchMap);
                    }
                    readbacks.forEach((buffer) => buffer.destroy());
                    targets.forEach((texture) => texture.destroy());
                    throw error;
                }
            }
        }

        const encoder = device.createCommandEncoder({
            label: "QuadDetailV5 DX11/DX12 comparison encoder"
        });
        for (const instance of instances)
        {
            passEncoder.Encode(encoder, [ {
                descriptor: {
                    label:
                        `QuadDetailV5 ${instance.record.label} Main.pass0 ` +
                        `${instance.renderCase}`,
                    colorAttachments: instance.targets.map((texture, targetIndex) => ({
                        view: texture.createView(),
                        clearValue: {
                            r: QUADV5_CLEAR_TARGETS[targetIndex][0] / 255,
                            g: QUADV5_CLEAR_TARGETS[targetIndex][1] / 255,
                            b: QUADV5_CLEAR_TARGETS[targetIndex][2] / 255,
                            a: QUADV5_CLEAR_TARGETS[targetIndex][3] / 255
                        },
                        loadOp: "clear",
                        storeOp: "store"
                    }))
                },
                selections: [ {
                    preparedBatchMap: instance.preparedBatchMap,
                    batchType: TRINITY_BATCH_TYPE_OPAQUE
                } ]
            } ]);
            instance.targets.forEach((texture, targetIndex) =>
            {
                encoder.copyTextureToBuffer(
                    { texture },
                    {
                        buffer: instance.readbacks[targetIndex],
                        bytesPerRow: BYTES_PER_ROW,
                        rowsPerImage: HEIGHT
                    },
                    { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 }
                );
            });
        }
        webgpu.Submit([ encoder.finish() ]);
        await device.queue.onSubmittedWorkDone();
        await Promise.all(instances.flatMap((instance) => instance.readbacks.map(
            (buffer) => buffer.mapAsync(GPUMapMode.READ)
        )));

        for (const instance of instances)
        {
            instance.snapshots = instance.readbacks.map((buffer) =>
                new Uint8Array(buffer.getMappedRange()).slice());
            instance.statistics = instance.snapshots.map((bytes, targetIndex) =>
                AssertQuadV5Silhouette(
                    bytes,
                    targetIndex,
                    `${instance.record.label} ${instance.renderCase} MRT${targetIndex}`,
                    fixture.variant
                ));
            Assert(
                instance.statistics[0].coverage === instance.statistics[1].coverage,
                `${instance.record.label} ${instance.renderCase} MRT coverage does not match`
            );
            AssertQuadV5MrtCoverage(
                instance.snapshots[0],
                instance.snapshots[1],
                `${instance.record.label} ${instance.renderCase}`
            );
        }
        for (const renderCase of fixture.caseNames)
        {
            const paired = records.map((record) => instances.find((instance) =>
                instance.record.backend === record.backend
                    && instance.renderCase === renderCase));
            Assert(
                paired.every(Boolean),
                `QuadDetailV5 ${renderCase} DX11/DX12 pair is incomplete`
            );
            for (let targetIndex = 0;
                targetIndex < QUADV5_CLEAR_TARGETS.length;
                targetIndex += 1)
            {
                AssertExactTargetMatch(
                    paired[0].snapshots[targetIndex],
                    paired[1].snapshots[targetIndex],
                    `DX11/DX12 QuadDetailV5 ${renderCase} MRT${targetIndex}`
                );
            }
        }
        const quadDetailOracle = AssertQuadDetailV5Controls(instances);
        const baseline = instances.find((instance) =>
            instance.record.backend === "dx11"
                && instance.renderCase === "surface");
        Assert(baseline, "QuadDetailV5 surface DX11 baseline is missing");
        return {
            bodyIndex: 4,
            variant: fixture.variant,
            labels: records.map((record) => `${record.backend}:${record.label}`),
            loadPath: records[0].loadPath,
            pixelCount: WIDTH * HEIGHT,
            targetCount: QUADV5_CLEAR_TARGETS.length,
            renderCaseCount: fixture.caseNames.length,
            drawKind: fixture.variant === "skinned"
                ? "indexed skinned synthetic silhouette"
                : "indexed synthetic silhouette",
            indexCount: fixture.geometry.indexCount,
            warningCount,
            clearTargets: QUADV5_CLEAR_TARGETS,
            statistics: baseline.statistics,
            quadDetailOracle
        };
    }
    finally
    {
        for (const instance of instances)
        {
            dispatcher?.DestroyBatchMap(instance.preparedBatchMap);
            for (const buffer of instance.readbacks)
            {
                if (buffer.mapState === "mapped") buffer.unmap();
                buffer.destroy();
            }
            instance.targets.forEach((texture) => texture.destroy());
        }
        fixture.destroy();
    }
}

async function RunQuadOilV5Comparison(webgpu)
{
    if (!CONFIG.drawQuadOilV5) return null;
    const response = await fetch("/draw-quadoilv5.json");
    Assert(
        response.ok,
        `Failed to load QuadOilV5 package records: HTTP ${response.status}`
    );
    const records = await response.json();
    Assert(
        Array.isArray(records) && records.length === 2,
        "QuadOilV5 comparison requires two package records"
    );
    validateQuadOilV5PackagePair(records);
    Assert(
        QUAD_OIL_V5_TARGET_WIDTH === WIDTH
            && QUAD_OIL_V5_TARGET_HEIGHT === HEIGHT,
        "QuadOilV5 and harness target dimensions must match"
    );
    Assert(
        JSON.stringify(QUAD_OIL_V5_CLEAR_TARGETS)
            === JSON.stringify(QUADV5_CLEAR_TARGETS),
        "QuadOilV5 must retain the shared QuadV5 clear targets"
    );
    Assert(
        JSON.stringify(QUAD_OIL_V5_RESOURCE_VARIANTS)
            === JSON.stringify([ "oilOff", "oilChromatic" ]),
        "QuadOilV5 resource variants must be oilOff then oilChromatic"
    );

    const device = webgpu.GetDevice();
    const fixture = await CreateQuadOilV5GpuResources(webgpu, records);
    let dispatcher = null;
    let passEncoder = null;
    const instances = [];
    let warningCount = 0;
    try
    {
        dispatcher = CreateQuadOilV5TrinityDispatcher(webgpu, fixture);
        passEncoder = new CjsWebgpuTrinityPassEncoder(dispatcher);
        for (const record of records)
        {
            for (const resourceVariant of fixture.resourceVariantNames)
            {
                let preparedBatchMap = null;
                const targets = [];
                const readbacks = [];
                try
                {
                    preparedBatchMap = await dispatcher.PrepareBatchMap(
                        CreateQuadOilV5TrinityBatchMap(
                            record,
                            fixture,
                            resourceVariant
                        )
                    );
                    warningCount += preparedBatchMap.entries.reduce(
                        (mapTotal, entry) => mapTotal + entry.accumulator.batches.reduce(
                            (batchTotal, batch) => batchTotal
                                + batch.prepared.diagnostics
                                    .filter((item) => item.type === "warning").length,
                            0
                        ),
                        0
                    );
                    for (let targetIndex = 0;
                        targetIndex < QUAD_OIL_V5_CLEAR_TARGETS.length;
                        targetIndex += 1)
                    {
                        targets.push(device.createTexture({
                            label:
                                `QuadOilV5 ${record.label} ${resourceVariant} ` +
                                `MRT${targetIndex}`,
                            size: {
                                width: WIDTH,
                                height: HEIGHT,
                                depthOrArrayLayers: 1
                            },
                            format: "rgba8unorm",
                            usage:
                                GPUTextureUsage.RENDER_ATTACHMENT
                                | GPUTextureUsage.COPY_SRC
                        }));
                        readbacks.push(device.createBuffer({
                            label:
                                `QuadOilV5 ${record.label} ${resourceVariant} ` +
                                `MRT${targetIndex} readback`,
                            size: BYTES_PER_ROW * HEIGHT,
                            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                        }));
                    }
                    instances.push({
                        record,
                        resourceVariant,
                        preparedBatchMap,
                        targets,
                        readbacks,
                        snapshots: []
                    });
                }
                catch (error)
                {
                    if (preparedBatchMap)
                    {
                        dispatcher.DestroyBatchMap(preparedBatchMap);
                    }
                    readbacks.forEach((buffer) => buffer.destroy());
                    targets.forEach((texture) => texture.destroy());
                    throw error;
                }
            }
        }

        const encoder = device.createCommandEncoder({
            label: "QuadOilV5 DX11/DX12 comparison encoder"
        });
        for (const instance of instances)
        {
            passEncoder.Encode(encoder, [ {
                descriptor: {
                    label:
                        `QuadOilV5 ${instance.record.label} Main.pass0 ` +
                        `${instance.resourceVariant}`,
                    colorAttachments: instance.targets.map((texture, targetIndex) => ({
                        view: texture.createView(),
                        clearValue: {
                            r: QUAD_OIL_V5_CLEAR_TARGETS[targetIndex][0] / 255,
                            g: QUAD_OIL_V5_CLEAR_TARGETS[targetIndex][1] / 255,
                            b: QUAD_OIL_V5_CLEAR_TARGETS[targetIndex][2] / 255,
                            a: QUAD_OIL_V5_CLEAR_TARGETS[targetIndex][3] / 255
                        },
                        loadOp: "clear",
                        storeOp: "store"
                    }))
                },
                selections: [ {
                    preparedBatchMap: instance.preparedBatchMap,
                    batchType: TRINITY_BATCH_TYPE_OPAQUE
                } ]
            } ]);
            instance.targets.forEach((texture, targetIndex) =>
            {
                encoder.copyTextureToBuffer(
                    { texture },
                    {
                        buffer: instance.readbacks[targetIndex],
                        bytesPerRow: BYTES_PER_ROW,
                        rowsPerImage: HEIGHT
                    },
                    { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 }
                );
            });
        }
        webgpu.Submit([ encoder.finish() ]);
        await device.queue.onSubmittedWorkDone();
        await Promise.all(instances.flatMap((instance) => instance.readbacks.map(
            (buffer) => buffer.mapAsync(GPUMapMode.READ)
        )));

        for (const instance of instances)
        {
            instance.snapshots = instance.readbacks.map((buffer) =>
                new Uint8Array(buffer.getMappedRange()).slice());
            instance.statistics = AssertQuadOilV5Pass(instance);
        }
        for (const resourceVariant of fixture.resourceVariantNames)
        {
            const paired = records.map((record) => instances.find((instance) =>
                instance.record.backend === record.backend
                    && instance.resourceVariant === resourceVariant));
            Assert(
                paired.every(Boolean),
                `QuadOilV5 ${resourceVariant} DX11/DX12 pair is incomplete`
            );
            for (let targetIndex = 0;
                targetIndex < QUAD_OIL_V5_CLEAR_TARGETS.length;
                targetIndex += 1)
            {
                AssertExactTargetMatch(
                    paired[0].snapshots[targetIndex],
                    paired[1].snapshots[targetIndex],
                    `DX11/DX12 QuadOilV5 ${resourceVariant} MRT${targetIndex}`
                );
            }
        }
        const oilFilmOracle = AssertQuadOilV5Controls(instances);
        const baseline = instances.find((instance) =>
            instance.record.backend === "dx11"
                && instance.resourceVariant === "oilChromatic");
        Assert(baseline, "QuadOilV5 chromatic DX11 baseline is missing");
        return {
            bodyIndex: 0,
            variant: "skinned",
            labels: records.map((record) => `${record.backend}:${record.label}`),
            loadPath: records[0].loadPath,
            pixelCount: WIDTH * HEIGHT,
            targetCount: QUAD_OIL_V5_CLEAR_TARGETS.length,
            renderCaseCount: fixture.resourceVariantNames.length,
            drawKind: "indexed skinned synthetic silhouette",
            indexCount: fixture.geometry.indexCount,
            warningCount,
            clearTargets: QUAD_OIL_V5_CLEAR_TARGETS,
            statistics: baseline.statistics,
            oilFilmOracle
        };
    }
    finally
    {
        for (const instance of instances)
        {
            dispatcher?.DestroyBatchMap(instance.preparedBatchMap);
            for (const buffer of instance.readbacks)
            {
                if (buffer.mapState === "mapped") buffer.unmap();
                buffer.destroy();
            }
            instance.targets.forEach((texture) => texture.destroy());
        }
        fixture.destroy();
    }
}

async function RunQuadSailsV5Comparison(webgpu)
{
    if (!CONFIG.drawQuadSailsV5) return null;
    const response = await fetch("/draw-quadsailsv5.json");
    Assert(
        response.ok,
        `Failed to load QuadSailsV5 package records: HTTP ${response.status}`
    );
    const records = await response.json();
    Assert(
        Array.isArray(records) && records.length === 2,
        "QuadSailsV5 comparison requires two package records"
    );
    validateQuadSailsV5PackagePair(records);
    Assert(
        QUAD_SAILS_V5_TARGET_WIDTH === WIDTH
            && QUAD_SAILS_V5_TARGET_HEIGHT === HEIGHT,
        "QuadSailsV5 and harness target dimensions must match"
    );
    Assert(
        JSON.stringify(QUAD_SAILS_V5_CLEAR_TARGETS)
            === JSON.stringify(QUADV5_CLEAR_TARGETS),
        "QuadSailsV5 must retain the shared QuadV5 clear targets"
    );
    Assert(
        JSON.stringify(QUAD_SAILS_V5_CASES)
            === JSON.stringify([ "unrotated", "authored" ]),
        "QuadSailsV5 cases must be unrotated then authored"
    );

    const device = webgpu.GetDevice();
    const fixture = await CreateQuadSailsV5GpuResources(webgpu, records);
    let dispatcher = null;
    let passEncoder = null;
    const instances = [];
    let warningCount = 0;
    try
    {
        dispatcher = CreateQuadSailsV5TrinityDispatcher(webgpu, fixture);
        passEncoder = new CjsWebgpuTrinityPassEncoder(dispatcher);
        for (const record of records)
        {
            for (const renderCase of fixture.caseNames)
            {
                let preparedBatchMap = null;
                const targets = [];
                const readbacks = [];
                let depthTexture = null;
                try
                {
                    preparedBatchMap = await dispatcher.PrepareBatchMap(
                        CreateQuadSailsV5TrinityBatchMap(record, fixture, renderCase)
                    );
                    warningCount += preparedBatchMap.entries.reduce(
                        (mapTotal, entry) => mapTotal + entry.accumulator.batches.reduce(
                            (batchTotal, batch) => batchTotal
                                + batch.prepared.diagnostics
                                    .filter((item) => item.type === "warning").length,
                            0
                        ),
                        0
                    );
                    for (let targetIndex = 0;
                        targetIndex < QUAD_SAILS_V5_CLEAR_TARGETS.length;
                        targetIndex += 1)
                    {
                        targets.push(device.createTexture({
                            label:
                                `QuadSailsV5 ${record.label} ${renderCase} ` +
                                `MRT${targetIndex}`,
                            size: { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 },
                            format: "rgba8unorm",
                            usage:
                                GPUTextureUsage.RENDER_ATTACHMENT
                                | GPUTextureUsage.COPY_SRC
                        }));
                        readbacks.push(device.createBuffer({
                            label:
                                `QuadSailsV5 ${record.label} ${renderCase} ` +
                                `MRT${targetIndex} readback`,
                            size: BYTES_PER_ROW * HEIGHT,
                            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                        }));
                    }
                    depthTexture = device.createTexture({
                        label: `QuadSailsV5 ${record.label} ${renderCase} depth`,
                        size: { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 },
                        format: "depth24plus",
                        usage: GPUTextureUsage.RENDER_ATTACHMENT
                    });
                    instances.push({
                        record,
                        renderCase,
                        preparedBatchMap,
                        targets,
                        readbacks,
                        depthTexture,
                        snapshots: []
                    });
                }
                catch (error)
                {
                    if (preparedBatchMap)
                    {
                        dispatcher.DestroyBatchMap(preparedBatchMap);
                    }
                    readbacks.forEach((buffer) => buffer.destroy());
                    targets.forEach((texture) => texture.destroy());
                    depthTexture?.destroy();
                    throw error;
                }
            }
        }

        const encoder = device.createCommandEncoder({
            label: "QuadSailsV5 DX11/DX12 comparison encoder"
        });
        for (const instance of instances)
        {
            passEncoder.Encode(encoder, [ {
                descriptor: {
                    label:
                        `QuadSailsV5 ${instance.record.label} Main.pass0 ` +
                        `${instance.renderCase}`,
                    colorAttachments: instance.targets.map((texture, targetIndex) => ({
                        view: texture.createView(),
                        clearValue: {
                            r: QUAD_SAILS_V5_CLEAR_TARGETS[targetIndex][0] / 255,
                            g: QUAD_SAILS_V5_CLEAR_TARGETS[targetIndex][1] / 255,
                            b: QUAD_SAILS_V5_CLEAR_TARGETS[targetIndex][2] / 255,
                            a: QUAD_SAILS_V5_CLEAR_TARGETS[targetIndex][3] / 255
                        },
                        loadOp: "clear",
                        storeOp: "store"
                    })),
                    depthStencilAttachment: {
                        view: instance.depthTexture.createView(),
                        depthClearValue: 1,
                        depthLoadOp: "clear",
                        depthStoreOp: "store"
                    }
                },
                selections: [ {
                    preparedBatchMap: instance.preparedBatchMap,
                    batchType: TRINITY_BATCH_TYPE_OPAQUE
                } ]
            } ]);
            instance.targets.forEach((texture, targetIndex) =>
            {
                encoder.copyTextureToBuffer(
                    { texture },
                    {
                        buffer: instance.readbacks[targetIndex],
                        bytesPerRow: BYTES_PER_ROW,
                        rowsPerImage: HEIGHT
                    },
                    { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 }
                );
            });
        }
        webgpu.Submit([ encoder.finish() ]);
        await device.queue.onSubmittedWorkDone();
        await Promise.all(instances.flatMap((instance) => instance.readbacks.map(
            (buffer) => buffer.mapAsync(GPUMapMode.READ)
        )));

        for (const instance of instances)
        {
            instance.snapshots = instance.readbacks.map((buffer) =>
                new Uint8Array(buffer.getMappedRange()).slice());
            instance.statistics = instance.snapshots.map((bytes, targetIndex) =>
                AssertQuadV5Silhouette(
                    bytes,
                    targetIndex,
                    `${instance.record.label} ${instance.renderCase} MRT${targetIndex}`,
                    fixture.variant
                ));
            Assert(
                instance.statistics[0].coverage === instance.statistics[1].coverage,
                `${instance.record.label} ${instance.renderCase} MRT coverage does not match`
            );
            AssertQuadV5MrtCoverage(
                instance.snapshots[0],
                instance.snapshots[1],
                `${instance.record.label} ${instance.renderCase}`
            );
        }
        for (const renderCase of fixture.caseNames)
        {
            const paired = records.map((record) => instances.find((instance) =>
                instance.record.backend === record.backend
                    && instance.renderCase === renderCase));
            Assert(
                paired.every(Boolean),
                `QuadSailsV5 ${renderCase} DX11/DX12 pair is incomplete`
            );
            for (let targetIndex = 0;
                targetIndex < QUAD_SAILS_V5_CLEAR_TARGETS.length;
                targetIndex += 1)
            {
                AssertExactTargetMatch(
                    paired[0].snapshots[targetIndex],
                    paired[1].snapshots[targetIndex],
                    `DX11/DX12 QuadSailsV5 ${renderCase} MRT${targetIndex}`
                );
            }
        }

        const byKey = new Map(instances.map((instance) => [
            `${instance.record.backend}:${instance.renderCase}`,
            instance
        ]));
        let sailsDetailOracle = null;
        for (const backend of [ "dx11", "dx12" ])
        {
            const unrotated = byKey.get(`${backend}:unrotated`);
            const authored = byKey.get(`${backend}:authored`);
            Assert(
                unrotated && authored,
                `QuadSailsV5 ${backend} detail cases are incomplete`
            );
            AssertExactTargetMatch(
                unrotated.snapshots[1],
                authored.snapshots[1],
                `${backend} QuadSailsV5 detail-invariant MRT1`
            );
            const oracle = MeasureQuadV5ColorControl(
                unrotated.snapshots[0],
                authored.snapshots[0],
                unrotated.snapshots[1],
                `QuadSailsV5 ${backend} SailsDetailData control`
            );
            if (backend === "dx11") sailsDetailOracle = oracle;
        }
        const baseline = byKey.get("dx11:authored");
        Assert(baseline, "QuadSailsV5 authored DX11 baseline is missing");
        return {
            bodyIndex: fixture.variant === "skinned" ? 4 : 0,
            variant: fixture.variant,
            labels: records.map((record) => `${record.backend}:${record.label}`),
            loadPath: records[0].loadPath,
            pixelCount: WIDTH * HEIGHT,
            targetCount: QUAD_SAILS_V5_CLEAR_TARGETS.length,
            renderCaseCount: fixture.caseNames.length,
            drawKind: fixture.variant === "skinned"
                ? "indexed skinned synthetic silhouette"
                : "indexed synthetic silhouette",
            indexCount: fixture.geometry.indexCount,
            warningCount,
            clearTargets: QUAD_SAILS_V5_CLEAR_TARGETS,
            statistics: baseline.statistics,
            sailsDetailOracle,
            depthWriteEnabled: true
        };
    }
    finally
    {
        for (const instance of instances)
        {
            dispatcher?.DestroyBatchMap(instance.preparedBatchMap);
            for (const buffer of instance.readbacks)
            {
                if (buffer.mapState === "mapped") buffer.unmap();
                buffer.destroy();
            }
            instance.targets.forEach((texture) => texture.destroy());
            instance.depthTexture.destroy();
        }
        fixture.destroy();
    }
}

async function RunQuadGlassV5Comparison(webgpu)
{
    if (!CONFIG.drawQuadGlassV5) return null;
    const response = await fetch("/draw-quadglassv5.json");
    Assert(
        response.ok,
        `Failed to load QuadGlassV5 package records: HTTP ${response.status}`
    );
    const records = await response.json();
    Assert(
        Array.isArray(records) && records.length === 2,
        "QuadGlassV5 comparison requires two package records"
    );
    validateQuadGlassV5PackagePair(records);

    const device = webgpu.GetDevice();
    const fixture = await CreateQuadGlassV5GpuResources(webgpu, records);
    let dispatcher = null;
    let passEncoder = null;
    const instances = [];
    let warningCount = 0;
    try
    {
        dispatcher = CreateQuadGlassV5TrinityDispatcher(webgpu, fixture);
        passEncoder = new CjsWebgpuTrinityPassEncoder(dispatcher);
        for (const record of records)
        {
            for (const passIndex of [ 0, 1 ])
            {
                for (const resourceVariant of fixture.resourceVariantNames)
                {
                    let preparedBatchMap = null;
                    const targets = [];
                    const readbacks = [];
                    try
                    {
                        preparedBatchMap = await dispatcher.PrepareBatchMap(
                            CreateQuadGlassV5TrinityBatchMap(
                                record,
                                fixture,
                                passIndex,
                                resourceVariant
                            )
                        );
                        warningCount += preparedBatchMap.entries.reduce(
                            (mapTotal, entry) => mapTotal + entry.accumulator.batches.reduce(
                                (batchTotal, batch) => batchTotal
                                    + batch.prepared.diagnostics
                                        .filter((item) => item.type === "warning").length,
                                0
                            ),
                            0
                        );
                        for (let targetIndex = 0;
                            targetIndex < QUAD_GLASS_V5_CLEAR_TARGETS.length;
                            targetIndex += 1)
                        {
                            targets.push(device.createTexture({
                                label:
                                    `QuadGlassV5 ${record.label} pass${passIndex} ` +
                                    `${resourceVariant} MRT${targetIndex}`,
                                size: {
                                    width: WIDTH,
                                    height: HEIGHT,
                                    depthOrArrayLayers: 1
                                },
                                format: "rgba8unorm",
                                usage:
                                    GPUTextureUsage.RENDER_ATTACHMENT
                                    | GPUTextureUsage.COPY_SRC
                            }));
                            readbacks.push(device.createBuffer({
                                label:
                                    `QuadGlassV5 ${record.label} pass${passIndex} ` +
                                    `${resourceVariant} MRT${targetIndex} readback`,
                                size: BYTES_PER_ROW * HEIGHT,
                                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                            }));
                        }
                        instances.push({
                            record,
                            passIndex,
                            resourceVariant,
                            preparedBatchMap,
                            targets,
                            readbacks,
                            snapshots: []
                        });
                    }
                    catch (error)
                    {
                        if (preparedBatchMap)
                        {
                            dispatcher.DestroyBatchMap(preparedBatchMap);
                        }
                        readbacks.forEach((buffer) => buffer.destroy());
                        targets.forEach((texture) => texture.destroy());
                        throw error;
                    }
                }
            }
        }

        const encoder = device.createCommandEncoder({
            label: "QuadGlassV5 complementary-pass DX11/DX12 comparison encoder"
        });
        for (const instance of instances)
        {
            passEncoder.Encode(encoder, [ {
                descriptor: {
                    label:
                        `QuadGlassV5 ${instance.record.label} ` +
                        `Main.pass${instance.passIndex} ${instance.resourceVariant}`,
                    colorAttachments: instance.targets.map((texture, targetIndex) => ({
                        view: texture.createView(),
                        clearValue: {
                            r: QUAD_GLASS_V5_CLEAR_TARGETS[targetIndex][0] / 255,
                            g: QUAD_GLASS_V5_CLEAR_TARGETS[targetIndex][1] / 255,
                            b: QUAD_GLASS_V5_CLEAR_TARGETS[targetIndex][2] / 255,
                            a: QUAD_GLASS_V5_CLEAR_TARGETS[targetIndex][3] / 255
                        },
                        loadOp: "clear",
                        storeOp: "store"
                    }))
                },
                selections: [ {
                    preparedBatchMap: instance.preparedBatchMap,
                    batchType: TRINITY_BATCH_TYPE_OPAQUE
                } ]
            } ]);
            instance.targets.forEach((texture, targetIndex) =>
            {
                encoder.copyTextureToBuffer(
                    { texture },
                    {
                        buffer: instance.readbacks[targetIndex],
                        bytesPerRow: BYTES_PER_ROW,
                        rowsPerImage: HEIGHT
                    },
                    { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 }
                );
            });
        }
        webgpu.Submit([ encoder.finish() ]);
        await device.queue.onSubmittedWorkDone();
        await Promise.all(instances.flatMap((instance) => instance.readbacks.map(
            (buffer) => buffer.mapAsync(GPUMapMode.READ)
        )));

        for (const instance of instances)
        {
            instance.snapshots = instance.readbacks.map((buffer) =>
                new Uint8Array(buffer.getMappedRange()).slice());
            instance.statistics = AssertQuadGlassV5Pass(instance);
        }
        for (const passIndex of [ 0, 1 ])
        {
            for (const resourceVariant of fixture.resourceVariantNames)
            {
                const paired = records.map((record) => instances.find((instance) =>
                    instance.record.backend === record.backend
                        && instance.passIndex === passIndex
                        && instance.resourceVariant === resourceVariant));
                Assert(
                    paired.every(Boolean),
                    `QuadGlassV5 pass${passIndex} ${resourceVariant} pair is incomplete`
                );
                for (let targetIndex = 0;
                    targetIndex < QUAD_GLASS_V5_CLEAR_TARGETS.length;
                    targetIndex += 1)
                {
                    AssertExactTargetMatch(
                        paired[0].snapshots[targetIndex],
                        paired[1].snapshots[targetIndex],
                        `DX11/DX12 QuadGlassV5 pass${passIndex} ` +
                            `${resourceVariant} MRT${targetIndex}`
                    );
                }
            }
        }
        const paintMaskOracle = AssertQuadGlassV5Controls(instances, fixture.variant);
        const baseline = instances.filter((instance) =>
            instance.record.backend === "dx11"
                && instance.resourceVariant === "base");
        return {
            bodyIndex: fixture.variant === "skinned" ? 4 : 0,
            variant: fixture.variant,
            labels: records.map((record) => `${record.backend}:${record.label}`),
            loadPath: records[0].loadPath,
            pixelCount: WIDTH * HEIGHT,
            passCount: 2,
            targetCount: QUAD_GLASS_V5_CLEAR_TARGETS.length,
            renderCaseCount: fixture.resourceVariantNames.length,
            drawKind: fixture.variant === "skinned"
                ? "indexed skinned complementary-winding synthetic silhouettes"
                : "indexed complementary-winding synthetic silhouettes",
            indexCount: fixture.geometry.indexCount,
            warningCount,
            clearTargets: QUAD_GLASS_V5_CLEAR_TARGETS,
            statistics: baseline.map((instance) => ({
                passIndex: instance.passIndex,
                ...instance.statistics
            })),
            paintMaskOracle
        };
    }
    finally
    {
        for (const instance of instances)
        {
            dispatcher?.DestroyBatchMap(instance.preparedBatchMap);
            for (const buffer of instance.readbacks)
            {
                if (buffer.mapState === "mapped") buffer.unmap();
                buffer.destroy();
            }
            instance.targets.forEach((texture) => texture.destroy());
        }
        fixture.destroy();
    }
}

async function RunQuadHeatV5Comparison(webgpu)
{
    if (!CONFIG.drawQuadHeatV5) return null;
    const response = await fetch("/draw-quadheatv5.json");
    Assert(
        response.ok,
        `Failed to load QuadHeatV5 package records: HTTP ${response.status}`
    );
    const records = await response.json();
    Assert(
        Array.isArray(records) && records.length === 2,
        "QuadHeatV5 comparison requires two package records"
    );
    validateQuadHeatV5PackagePair(records);

    const device = webgpu.GetDevice();
    const fixture = await CreateQuadHeatV5GpuResources(webgpu, records);
    let dispatcher = null;
    let passEncoder = null;
    const instances = [];
    let warningCount = 0;
    try
    {
        dispatcher = CreateQuadHeatV5TrinityDispatcher(webgpu, fixture);
        passEncoder = new CjsWebgpuTrinityPassEncoder(dispatcher);
        Assert(
            JSON.stringify(fixture.caseNames) === JSON.stringify(QUAD_HEAT_V5_CASES),
            "QuadHeatV5 thermal cases must be cold then hot"
        );
        for (const record of records)
        {
            for (const heatCase of fixture.caseNames)
            {
                let preparedBatchMap = null;
                const targets = [];
                const readbacks = [];
                try
                {
                    preparedBatchMap = await dispatcher.PrepareBatchMap(
                        CreateQuadHeatV5TrinityBatchMap(record, fixture, heatCase)
                    );
                    warningCount += preparedBatchMap.entries.reduce(
                        (mapTotal, entry) => mapTotal + entry.accumulator.batches.reduce(
                            (batchTotal, batch) => batchTotal
                                + batch.prepared.diagnostics
                                    .filter((item) => item.type === "warning").length,
                            0
                        ),
                        0
                    );
                    for (let targetIndex = 0;
                        targetIndex < QUAD_HEAT_V5_CLEAR_TARGETS.length;
                        targetIndex += 1)
                    {
                        targets.push(device.createTexture({
                            label:
                                `QuadHeatV5 ${record.label} ${heatCase} MRT${targetIndex}`,
                            size: {
                                width: WIDTH,
                                height: HEIGHT,
                                depthOrArrayLayers: 1
                            },
                            format: "rgba8unorm",
                            usage:
                                GPUTextureUsage.RENDER_ATTACHMENT
                                | GPUTextureUsage.COPY_SRC
                        }));
                        readbacks.push(device.createBuffer({
                            label:
                                `QuadHeatV5 ${record.label} ${heatCase} ` +
                                `MRT${targetIndex} readback`,
                            size: BYTES_PER_ROW * HEIGHT,
                            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                        }));
                    }
                    instances.push({
                        record,
                        heatCase,
                        preparedBatchMap,
                        targets,
                        readbacks,
                        snapshots: [],
                        statistics: null
                    });
                }
                catch (error)
                {
                    if (preparedBatchMap)
                    {
                        dispatcher.DestroyBatchMap(preparedBatchMap);
                    }
                    readbacks.forEach((buffer) => buffer.destroy());
                    targets.forEach((texture) => texture.destroy());
                    throw error;
                }
            }
        }

        const encoder = device.createCommandEncoder({
            label: "QuadHeatV5 cold/hot DX11/DX12 comparison encoder"
        });
        for (const instance of instances)
        {
            passEncoder.Encode(encoder, [ {
                descriptor: {
                    label:
                        `QuadHeatV5 ${instance.record.label} Main.pass0 ` +
                        `${instance.heatCase}`,
                    colorAttachments: instance.targets.map((texture, targetIndex) => ({
                        view: texture.createView(),
                        clearValue: {
                            r: QUAD_HEAT_V5_CLEAR_TARGETS[targetIndex][0] / 255,
                            g: QUAD_HEAT_V5_CLEAR_TARGETS[targetIndex][1] / 255,
                            b: QUAD_HEAT_V5_CLEAR_TARGETS[targetIndex][2] / 255,
                            a: QUAD_HEAT_V5_CLEAR_TARGETS[targetIndex][3] / 255
                        },
                        loadOp: "clear",
                        storeOp: "store"
                    }))
                },
                selections: [ {
                    preparedBatchMap: instance.preparedBatchMap,
                    batchType: TRINITY_BATCH_TYPE_OPAQUE
                } ]
            } ]);
            instance.targets.forEach((texture, targetIndex) =>
            {
                encoder.copyTextureToBuffer(
                    { texture },
                    {
                        buffer: instance.readbacks[targetIndex],
                        bytesPerRow: BYTES_PER_ROW,
                        rowsPerImage: HEIGHT
                    },
                    { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 }
                );
            });
        }
        webgpu.Submit([ encoder.finish() ]);
        await device.queue.onSubmittedWorkDone();
        await Promise.all(instances.flatMap((instance) => instance.readbacks.map(
            (buffer) => buffer.mapAsync(GPUMapMode.READ)
        )));

        for (const instance of instances)
        {
            instance.snapshots = instance.readbacks.map((buffer) =>
                new Uint8Array(buffer.getMappedRange()).slice());
            instance.statistics = AssertQuadHeatV5Pass(instance);
        }
        for (const heatCase of fixture.caseNames)
        {
            const paired = records.map((record) => instances.find((instance) =>
                instance.record.backend === record.backend
                    && instance.heatCase === heatCase));
            Assert(
                paired.every(Boolean),
                `QuadHeatV5 ${heatCase} DX11/DX12 pair is incomplete`
            );
            for (let targetIndex = 0;
                targetIndex < QUAD_HEAT_V5_CLEAR_TARGETS.length;
                targetIndex += 1)
            {
                AssertExactTargetMatch(
                    paired[0].snapshots[targetIndex],
                    paired[1].snapshots[targetIndex],
                    `DX11/DX12 QuadHeatV5 ${heatCase} MRT${targetIndex}`
                );
            }
        }
        const heatOracle = AssertQuadHeatV5Controls(instances);
        const baseline = instances.find((instance) =>
            instance.record.backend === "dx11" && instance.heatCase === "cold");
        Assert(baseline, "QuadHeatV5 cold DX11 baseline is missing");
        return {
            bodyIndex: 0,
            labels: records.map((record) => `${record.backend}:${record.label}`),
            loadPath: records[0].loadPath,
            pixelCount: WIDTH * HEIGHT,
            targetCount: QUAD_HEAT_V5_CLEAR_TARGETS.length,
            renderCaseCount: fixture.caseNames.length,
            drawKind: "indexed synthetic ship silhouette",
            indexCount: fixture.geometry.indexCount,
            warningCount,
            clearTargets: QUAD_HEAT_V5_CLEAR_TARGETS,
            statistics: baseline.statistics,
            heatOracle
        };
    }
    finally
    {
        for (const instance of instances)
        {
            dispatcher?.DestroyBatchMap(instance.preparedBatchMap);
            for (const buffer of instance.readbacks)
            {
                if (buffer.mapState === "mapped") buffer.unmap();
                buffer.destroy();
            }
            instance.targets.forEach((texture) => texture.destroy());
        }
        fixture.destroy();
    }
}

async function RunDecalV5Comparison(webgpu)
{
    const variant = CONFIG.drawDecalHoleV5
        ? "hole"
        : (CONFIG.drawDecalCylindricV5
            ? "cylindric"
            : (CONFIG.drawDecalGlowCylindricV5
                ? "glowCylindric"
                : (CONFIG.drawDecalGlowV5
                    ? "glow"
                    : (CONFIG.drawDecalCounterV5 ? "counter" : "standard"))));
    if (!CONFIG.drawDecalV5 && !CONFIG.drawDecalCounterV5
        && !CONFIG.drawDecalCylindricV5 && !CONFIG.drawDecalHoleV5
        && !CONFIG.drawDecalGlowV5
        && !CONFIG.drawDecalGlowCylindricV5)
    {
        return null;
    }
    const profile = DECAL_FAMILY_V5_PROFILES[variant];
    const response = await fetch(profile.route);
    Assert(response.ok, `Failed to load ${profile.label} package records: HTTP ${response.status}`);
    const records = await response.json();
    Assert(
        Array.isArray(records) && records.length === 2,
        `${profile.label} comparison requires two package records`
    );
    profile.validatePair(records);

    const device = webgpu.GetDevice();
    const fixture = await CreateDecalV5GpuResources(webgpu, records, profile);
    const dispatcher = CreateDecalV5TrinityDispatcher(webgpu, fixture);
    const passEncoder = new CjsWebgpuTrinityPassEncoder(dispatcher);
    const instances = [];
    let warningCount = 0;
    try
    {
        for (const record of records)
        {
            for (const resourceVariant of fixture.resourceVariantNames)
            {
                let preparedBatchMap = null;
                let target = null;
                let readback = null;
                try
                {
                    preparedBatchMap = await dispatcher.PrepareBatchMap(
                        CreateDecalV5TrinityBatchMap(record, fixture, resourceVariant)
                    );
                    warningCount += preparedBatchMap.entries.reduce(
                        (mapTotal, entry) => mapTotal + entry.accumulator.batches.reduce(
                            (batchTotal, batch) => batchTotal
                                + batch.prepared.diagnostics
                                    .filter((item) => item.type === "warning").length,
                            0
                        ),
                        0
                    );
                    target = device.createTexture({
                        label: `${profile.label} ${record.label} ${resourceVariant} color target`,
                        size: { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 },
                        format: "rgba8unorm",
                        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
                    });
                    readback = device.createBuffer({
                        label: `${profile.label} ${record.label} ${resourceVariant} readback`,
                        size: BYTES_PER_ROW * HEIGHT,
                        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                    });
                    instances.push({
                        record,
                        resourceVariant,
                        preparedBatchMap,
                        target,
                        readback,
                        snapshot: null,
                        statistics: null
                    });
                }
                catch (error)
                {
                    if (preparedBatchMap) dispatcher.DestroyBatchMap(preparedBatchMap);
                    readback?.destroy();
                    target?.destroy();
                    throw error;
                }
            }
        }

        const encoder = device.createCommandEncoder({
            label: `${profile.label} DX11/DX12 comparison encoder`
        });
        for (const instance of instances)
        {
            passEncoder.Encode(encoder, [ {
                descriptor: {
                    label:
                        `${profile.label} ${instance.record.label} ` +
                        `${instance.resourceVariant} Main.pass0`,
                    colorAttachments: [ {
                        view: instance.target.createView(),
                        clearValue: {
                            r: DECALV5_CLEAR_TARGET[0] / 255,
                            g: DECALV5_CLEAR_TARGET[1] / 255,
                            b: DECALV5_CLEAR_TARGET[2] / 255,
                            a: DECALV5_CLEAR_TARGET[3] / 255
                        },
                        loadOp: "clear",
                        storeOp: "store"
                    } ]
                },
                selections: [ {
                    preparedBatchMap: instance.preparedBatchMap,
                    batchType: TRINITY_BATCH_TYPE_DECAL
                } ]
            } ]);
            encoder.copyTextureToBuffer(
                { texture: instance.target },
                {
                    buffer: instance.readback,
                    bytesPerRow: BYTES_PER_ROW,
                    rowsPerImage: HEIGHT
                },
                { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 }
            );
        }
        webgpu.Submit([ encoder.finish() ]);
        await device.queue.onSubmittedWorkDone();
        await Promise.all(instances.map((instance) =>
            instance.readback.mapAsync(GPUMapMode.READ)));

        for (const instance of instances)
        {
            instance.snapshot = new Uint8Array(instance.readback.getMappedRange()).slice();
            instance.statistics = AssertDecalV5Silhouette(
                instance.snapshot,
                `${profile.label} ${instance.record.label} ` +
                    `${instance.resourceVariant} color target`,
                variant,
                instance.resourceVariant
            );
        }
        for (const resourceVariant of fixture.resourceVariantNames)
        {
            const dx11 = instances.find((instance) =>
                instance.record.backend === "dx11"
                    && instance.resourceVariant === resourceVariant);
            const dx12 = instances.find((instance) =>
                instance.record.backend === "dx12"
                    && instance.resourceVariant === resourceVariant);
            Assert(dx11 && dx12, `${profile.label} ${resourceVariant} comparison pair is incomplete`);
            AssertExactTargetMatch(
                dx11.snapshot,
                dx12.snapshot,
                `DX11/DX12 ${profile.label} ${resourceVariant} color target`
            );
        }
        const base = instances.find((instance) =>
            instance.record.backend === "dx11" && instance.resourceVariant === "base");
        Assert(base, `${profile.label} base comparison output is missing`);
        let textureInfluence = null;
        if (variant === "glow" || variant === "glowCylindric")
        {
            const whiteTransparency = instances.find((instance) =>
                instance.record.backend === "dx11"
                    && instance.resourceVariant === "whiteTransparency");
            const whiteGlow = instances.find((instance) =>
                instance.record.backend === "dx11"
                    && instance.resourceVariant === "whiteGlow");
            Assert(
                whiteTransparency && whiteGlow,
                "DecalGlowV5 texture-control outputs are incomplete"
            );
            textureInfluence = {
                transparency: AssertGlowTextureInfluence(
                    base.snapshot,
                    whiteTransparency.snapshot,
                    `${profile.label} transparency texture`
                ),
                glow: AssertGlowTextureInfluence(
                    base.snapshot,
                    whiteGlow.snapshot,
                    `${profile.label} glow texture`
                ),
                controls: AssertGlowTextureInfluence(
                    whiteTransparency.snapshot,
                    whiteGlow.snapshot,
                    `${profile.label} texture controls`
                )
            };
            if (variant === "glowCylindric")
            {
                textureInfluence.cylindricalControls =
                    AssertCylindricGlowControls(instances);
            }
        }
        else if (variant === "cylindric")
        {
            textureInfluence = {
                cylindricalAlpha: AssertCylindricSurfaceAlpha(instances)
            };
        }
        else if (variant === "hole")
        {
            textureInfluence = {
                holeProjection: AssertDecalHoleProjection(instances)
            };
        }
        return {
            bodyIndex: 0,
            variant,
            familyLabel: profile.label,
            labels: records.map((record) => `${record.backend}:${record.label}`),
            loadPath: records[0].loadPath,
            pixelCount: WIDTH * HEIGHT,
            targetCount: 1,
            drawKind: "indexed synthetic decal silhouette",
            indexCount: fixture.geometry.indexCount,
            warningCount,
            renderCaseCount: fixture.resourceVariantNames.length,
            clearTarget: DECALV5_CLEAR_TARGET,
            topLeftClearPixel: Array.from(base.snapshot.slice(0, 4)),
            statistics: base.statistics,
            textureInfluence,
            targetWidth: WIDTH,
            targetHeight: HEIGHT,
            targetPixels: GetActiveTargetPixels(base.snapshot)
        };
    }
    finally
    {
        for (const instance of instances)
        {
            dispatcher.DestroyBatchMap(instance.preparedBatchMap);
            if (instance.readback.mapState === "mapped") instance.readback.unmap();
            instance.readback.destroy();
            instance.target.destroy();
        }
        fixture.destroy();
    }
}

async function PreparePackage(webgpu)
{
    if (!CONFIG.prepareCarbonWebgpu) return null;
    const response = await fetch("/prepare-package.json");
    Assert(response.ok, `Failed to load ${CONFIG.preparePackageLabel}: HTTP ${response.status}`);
    const pipeline = await response.json();
    const prepared = await webgpu.PreparePipeline(pipeline, { warningsAsErrors: true });
    return {
        label: CONFIG.preparePackageLabel,
        bindingCount: pipeline.bindGroups.reduce((count, group) => count + group.bindings.length, 0),
        warningCount: prepared.diagnostics.filter((entry) => entry.type === "warning").length
    };
}

async function PrepareMatrix(webgpu)
{
    if (!CONFIG.prepareMatrix) return null;
    const response = await fetch("/prepare-matrix.json");
    Assert(response.ok, `Failed to load ${CONFIG.prepareMatrixLabel}: HTTP ${response.status}`);
    const matrix = await response.json();
    let warningCount = 0;
    let bindingCount = 0;
    let renderPipelineCount = 0;
    let computePipelineCount = 0;
    for (const record of matrix.shaderModules)
    {
        const module = webgpu.GetDevice().createShaderModule({
            label: `matrix ${record.id}`,
            code: record.code
        });
        const info = await module.getCompilationInfo();
        const messages = info.messages.filter((entry) => entry.type === "error" || entry.type === "warning");
        Assert(
            messages.length === 0,
            `Matrix WGSL ${record.id} produced diagnostics:\n${messages.map((entry) => entry.message).join("\n")}`
        );
    }
    for (const record of matrix.pipelines)
    {
        if (record.pipelineKind === "compute")
        {
            const prepared = await createHarnessComputePipeline(
                webgpu.GetDevice(),
                record.pipeline,
                GPUShaderStage
            );
            warningCount += prepared.warningCount;
            bindingCount += prepared.bindingCount;
            computePipelineCount += 1;
        }
        else
        {
            Assert(record.pipelineKind === "render", `Matrix pipeline ${record.id} has an invalid kind`);
            const prepared = await webgpu.PreparePipeline(record.pipeline, { warningsAsErrors: true });
            warningCount += prepared.diagnostics.filter((entry) => entry.type === "warning").length;
            bindingCount += record.pipeline.bindGroups.reduce(
                (count, group) => count + group.bindings.length,
                0
            );
            renderPipelineCount += 1;
        }
    }
    Assert(renderPipelineCount === matrix.uniqueRenderPipelines, "Matrix render-pipeline count does not reconcile");
    Assert(computePipelineCount === matrix.uniqueComputePipelines, "Matrix compute-pipeline count does not reconcile");
    return {
        label: CONFIG.prepareMatrixLabel,
        uniqueShaderModules: matrix.uniqueShaderModules,
        coveredShaderOccurrences: matrix.coveredShaderOccurrences,
        uniquePipelines: matrix.uniquePipelines,
        uniqueRenderPipelines: matrix.uniqueRenderPipelines,
        uniqueComputePipelines: matrix.uniqueComputePipelines,
        coveredOccurrences: matrix.coveredOccurrences,
        bindingCount,
        warningCount
    };
}

async function RunHarness()
{
    if (!navigator.gpu)
    {
        return { status: "skipped", reason: "navigator.gpu is unavailable" };
    }

    let webgpu;
    try
    {
        // The adapter is acquired first so the device request can ask for the
        // features this run actually needs. Only the hull draw needs any: every
        // other fixture authors uncompressed textures, while a real hull's maps
        // are BC7 and BC5 as CCP's own compressor produced them, and there is
        // no honest way to draw one without block compression. Asked for only
        // when the adapter offers it, so an adapter without BC still runs the
        // rest of the harness rather than failing at device creation.
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: "low-power" });
        if (!adapter) return { status: "skipped", reason: "navigator.gpu.requestAdapter() returned null" };
        const requiredFeatures = [];
        if (CONFIG.drawHull)
        {
            if (!adapter.features?.has("texture-compression-bc"))
            {
                return {
                    status: "skipped",
                    reason: "the hull draw requires the texture-compression-bc adapter feature"
                };
            }
            requiredFeatures.push("texture-compression-bc");
        }
        webgpu = await CjsWebgpuDevice.Request({
            gpu: navigator.gpu,
            adapter,
            deviceDescriptor: requiredFeatures.length ? { requiredFeatures } : undefined,
            shaderStage: GPUShaderStage
        });
    }
    catch (error)
    {
        if (/requestAdapter returned null/.test(error?.message || ""))
        {
            return { status: "skipped", reason: "navigator.gpu.requestAdapter() returned null" };
        }
        throw error;
    }

    const adapter = webgpu.GetAdapter();
    const device = webgpu.GetDevice();
    let texture = null;
    let readback = null;
    let generatedDraw = null;
    let phaseZeroDraw = null;
    let hullDraw = null;
    let quadV5Comparison = null;
    let quadGlassV5Comparison = null;
    let quadHeatV5Comparison = null;
    let quadDetailV5Comparison = null;
    let quadOilV5Comparison = null;
    let quadSailsV5Comparison = null;
    let decalV5Comparison = null;
    let decalCylindricV5Comparison = null;
    let decalHoleV5Comparison = null;
    let decalCounterV5Comparison = null;
    let decalGlowV5Comparison = null;
    let decalGlowCylindricV5Comparison = null;
    let errorScopeOpen = true;

    device.pushErrorScope("validation");
    try
    {
        const compiledCandidate = await CompileCandidate(device);
        const preparedPackage = await PreparePackage(webgpu);
        const preparedMatrix = await PrepareMatrix(webgpu);
        const arrayTextureDraw = await CreateArrayTextureDraw(webgpu);
        generatedDraw = await CreateGeneratedDraw(webgpu);
        phaseZeroDraw = generatedDraw ? null : await CreatePhaseZeroDraw(webgpu);
        hullDraw = await RunHullDraw(webgpu);
        quadV5Comparison = await RunQuadV5Comparison(webgpu);
        quadGlassV5Comparison = await RunQuadGlassV5Comparison(webgpu);
        quadHeatV5Comparison = await RunQuadHeatV5Comparison(webgpu);
        quadDetailV5Comparison = await RunQuadDetailV5Comparison(webgpu);
        quadOilV5Comparison = await RunQuadOilV5Comparison(webgpu);
        quadSailsV5Comparison = await RunQuadSailsV5Comparison(webgpu);
        const decalComparison = await RunDecalV5Comparison(webgpu);
        if (decalComparison?.variant === "cylindric")
        {
            decalCylindricV5Comparison = decalComparison;
        }
        else if (decalComparison?.variant === "hole")
        {
            decalHoleV5Comparison = decalComparison;
        }
        else if (decalComparison?.variant === "counter") decalCounterV5Comparison = decalComparison;
        else if (decalComparison?.variant === "glow") decalGlowV5Comparison = decalComparison;
        else if (decalComparison?.variant === "glowCylindric")
        {
            decalGlowCylindricV5Comparison = decalComparison;
        }
        else decalV5Comparison = decalComparison;
        const shaderModule = device.createShaderModule({
            label: "engine-webgpu phase-0 shader",
            code: SOURCE
        });
        const compilationInfo = await shaderModule.getCompilationInfo();
        const compilationErrors = compilationInfo.messages.filter((message) => message.type === "error");
        Assert(
            compilationErrors.length === 0,
            `WGSL compilation failed:\n${compilationErrors.map((message) => message.message).join("\n")}`
        );

        texture = device.createTexture({
            label: "engine-webgpu phase-0 offscreen target",
            size: { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 },
            format: "rgba8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
        readback = device.createBuffer({
            label: "engine-webgpu phase-0 readback",
            size: BYTES_PER_ROW * HEIGHT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        const encoder = device.createCommandEncoder({ label: "engine-webgpu phase-0 encoder" });
        const pass = encoder.beginRenderPass({
            label: "engine-webgpu phase-0 render pass",
            colorAttachments: [ {
                view: texture.createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: "clear",
                storeOp: "store"
            } ]
        });
        if (generatedDraw)
        {
            webgpu.EncodeDraw(pass, generatedDraw.draw);
        }
        else
        {
            webgpu.EncodeDraw(pass, phaseZeroDraw.draw);
        }
        pass.end();

        encoder.copyTextureToBuffer(
            { texture },
            { buffer: readback, bytesPerRow: BYTES_PER_ROW, rowsPerImage: HEIGHT },
            { width: WIDTH, height: HEIGHT, depthOrArrayLayers: 1 }
        );
        webgpu.Submit([ encoder.finish() ]);
        await device.queue.onSubmittedWorkDone();

        const validationError = await device.popErrorScope();
        errorScopeOpen = false;
        Assert(!validationError, `WebGPU validation failed: ${validationError?.message || validationError}`);

        await readback.mapAsync(GPUMapMode.READ);
        AssertPixels(new Uint8Array(readback.getMappedRange()), generatedDraw?.expectedPixel);
        readback.unmap();

        return {
            status: "passed",
            adapter: adapter.info?.device || adapter.info?.description || "available adapter",
            pixelCount: WIDTH * HEIGHT,
            compiledCandidate,
            preparedPackage,
            preparedMatrix,
            generatedDraw: generatedDraw?.result || null,
            arrayTextureDraw,
            geometryAdapter: "device-owned",
            textureAdapter: "device-owned uncompressed 2D",
            samplerAdapter: "device-owned",
            resourcePublication: "explicit guarded renderer realization",
            rgba8TexturePreparation: phaseZeroDraw
                ? "canonical decoded RGBA8 -> texture bundle -> atomic adapter slot"
                : null,
            samplerPreparation: phaseZeroDraw
                ? "complete selected WebGPU state -> sampler bundle -> atomic adapter slot"
                : null,
            hullDraw,
            quadV5Comparison,
            quadGlassV5Comparison,
            quadHeatV5Comparison,
            quadDetailV5Comparison,
            quadOilV5Comparison,
            quadSailsV5Comparison,
            decalV5Comparison,
            decalCylindricV5Comparison,
            decalHoleV5Comparison,
            decalCounterV5Comparison,
            decalGlowV5Comparison,
            decalGlowCylindricV5Comparison
        };
    }
    finally
    {
        if (errorScopeOpen)
        {
            await device.popErrorScope().catch(() => null);
        }
        if (readback?.mapState === "mapped")
        {
            readback.unmap();
        }
        readback?.destroy();
        texture?.destroy();
        generatedDraw?.uniformBuffer.destroy();
        generatedDraw?.bundle.Destroy();
        phaseZeroDraw?.samplerBundle.Destroy();
        phaseZeroDraw?.textureBundle.Destroy();
        phaseZeroDraw?.bundle.Destroy();
        webgpu.Destroy();
    }
}

globalThis.webgpuHarnessResult = RunHarness().catch((error) => ({
    status: "failed",
    error: error instanceof Error ? `${error.message}\n${error.stack || ""}` : String(error)
}));

const result = await globalThis.webgpuHarnessResult;
document.querySelector("#result").textContent = JSON.stringify(result, null, 2);
